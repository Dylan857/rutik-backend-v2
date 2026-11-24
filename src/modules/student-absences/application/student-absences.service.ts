import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { NotificationsService } from '../../notifications/application/notifications.service';
import { NotificationSeverity } from '../../notifications/domain/enums/notification-severity.enum';
import { NotificationSourceType } from '../../notifications/domain/enums/notification-source-type.enum';
import { NotificationType } from '../../notifications/domain/enums/notification-type.enum';
import { DailyRoutePlansService } from '../../route-stops/application/daily-route-plans.service';
import { RouteStopsService } from '../../route-stops/application/route-stops.service';
import { SchoolScheduleService } from '../../school-schedules/application/school-schedules.service';
import { StudentGuardianService } from '../../student-guardians/application/student-guardians.service';
import { StudentService } from '../../students/application/students.service';
import { Student } from '../../students/domain/student.entity';
import { TripType } from '../../students/domain/enums/trip-type.enum';
import { UserService } from '../../user/application/user.service';
import { StudentAbsence } from '../domain/student-absence.entity';
import { AbsenceLeg } from '../domain/enums/absence-leg.enum';
import { AbsenceStatus } from '../domain/enums/absence-status.enum';
import {
  IStudentAbsenceRepository,
  STUDENT_ABSENCE_REPOSITORY,
} from '../domain/interfaces/student-absence.repository';
import { ReportAbsenceDto } from '../infrastructure/api/dto/report-absence.dto';
import { StudentAbsenceResponseDto } from '../infrastructure/api/dto/student-absence-response.dto';
import {
  cutoffTimeFor,
  formatDateEs,
  isPastCutoff,
  legLabel,
  mergeLegs,
  ScheduleTimes,
  zonedNow,
} from './absence-cutoff.util';

// The legs each tripType actually rides — an absence can only cover those.
const TRIP_LEGS: Record<TripType, AbsenceLeg> = {
  [TripType.ROUND_TRIP]: AbsenceLeg.BOTH,
  [TripType.PICKUP_ONLY]: AbsenceLeg.PICKUP,
  [TripType.DROPOFF_ONLY]: AbsenceLeg.DROPOFF,
};

/**
 * Guardian-reported "my child won't ride on <date>". Each change (report,
 * widen, cancel) rebuilds that day's route plan so the route skips the
 * student, and notifies the company's admins.
 */
@Injectable()
export class StudentAbsencesService {
  private readonly logger = new Logger(StudentAbsencesService.name);

  constructor(
    @Inject(STUDENT_ABSENCE_REPOSITORY)
    private readonly absenceRepository: IStudentAbsenceRepository,
    private readonly studentService: StudentService,
    private readonly studentGuardianService: StudentGuardianService,
    private readonly scheduleService: SchoolScheduleService,
    private readonly companyService: CompanyService,
    private readonly routeStopsService: RouteStopsService,
    private readonly dailyRoutePlansService: DailyRoutePlansService,
    private readonly notificationsService: NotificationsService,
    private readonly userService: UserService,
  ) {}

  async report(
    userId: string,
    dto: ReportAbsenceDto,
  ): Promise<StudentAbsenceResponseDto> {
    await this.assertGuardianOf(userId, dto.studentId);

    const date = dto.date.slice(0, 10);
    const student = await this.studentService.findById(dto.studentId);
    const leg = this.restrictToTripType(dto.leg, student.tripType);
    const { schedule, timezone } = await this.loadContext(student);
    const now = zonedNow(timezone);

    if (date < now.date) {
      throw new BadRequestException(
        'No puedes reportar una ausencia para una fecha pasada.',
      );
    }
    this.assertBeforeCutoff(date, leg, schedule, now, 'reportar');

    const existing = await this.absenceRepository.findActive(student.id, date);
    let absence: StudentAbsence;
    if (existing) {
      // Reporting the same day again widens the absence (ida + regreso).
      absence = await this.absenceRepository.update(existing.id, {
        leg: mergeLegs(existing.leg, leg),
        reason: dto.reason ?? existing.reason,
      });
    } else {
      absence = await this.absenceRepository.create({
        companyId: student.companyId,
        studentId: student.id,
        date,
        leg,
        reason: dto.reason ?? null,
        reportedByUserId: userId,
        status: AbsenceStatus.ACTIVE,
      });
    }

    await this.rebuildRouteFor(student.id, date);

    const guardian = await this.userService.findById(userId);
    const reason = absence.reason ? ` Motivo: ${absence.reason}.` : '';
    await this.notificationsService.create({
      companyId: student.companyId,
      type: NotificationType.STUDENT_ABSENCE_REPORTED,
      severity: NotificationSeverity.INFO,
      title: 'Ausencia reportada',
      message: `${this.fullName(student)} no asistirá el ${formatDateEs(date)} (${legLabel(absence.leg)}). Reportado por ${guardian.firstName} ${guardian.lastName}.${reason}`,
      sourceType: NotificationSourceType.STUDENT,
      sourceId: student.id,
    });

    return this.toResponse(absence, student, schedule, now);
  }

  async cancel(
    userId: string,
    absenceId: string,
  ): Promise<StudentAbsenceResponseDto> {
    const absence = await this.absenceRepository.findById(absenceId);
    if (!absence) {
      throw new NotFoundException(`Absence with ID "${absenceId}" not found`);
    }
    await this.assertGuardianOf(userId, absence.studentId);

    const student = absence.student;
    const { schedule, timezone } = await this.loadContext(student);
    const now = zonedNow(timezone);

    if (absence.status === AbsenceStatus.CANCELLED) {
      return this.toResponse(absence, student, schedule, now);
    }
    this.assertBeforeCutoff(
      absence.date,
      absence.leg,
      schedule,
      now,
      'cancelar',
    );

    const cancelled = await this.absenceRepository.update(absence.id, {
      status: AbsenceStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    await this.rebuildRouteFor(student.id, absence.date);

    await this.notificationsService.create({
      companyId: student.companyId,
      type: NotificationType.STUDENT_ABSENCE_REPORTED,
      severity: NotificationSeverity.INFO,
      title: 'Ausencia cancelada',
      message: `${this.fullName(student)} sí asistirá el ${formatDateEs(absence.date)}: su acudiente canceló la ausencia (${legLabel(absence.leg)}).`,
      sourceType: NotificationSourceType.STUDENT,
      sourceId: student.id,
    });

    return this.toResponse(cancelled, student, schedule, now);
  }

  /** Upcoming (today onward) active absences of the caller's children. */
  async findMine(userId: string): Promise<StudentAbsenceResponseDto[]> {
    const myStudents = await this.studentGuardianService.findMyStudents(userId);
    if (myStudents.length === 0) return [];

    const students = new Map(
      myStudents.map((entry) => [entry.student.id, entry.student]),
    );
    const { timezone } = await this.loadContext(myStudents[0].student);
    const now = zonedNow(timezone);

    const absences = await this.absenceRepository.findAll({
      studentIds: [...students.keys()],
      fromDate: now.date,
      status: AbsenceStatus.ACTIVE,
    });

    const schedules = new Map<string, ScheduleTimes>();
    const responses: StudentAbsenceResponseDto[] = [];
    for (const absence of absences) {
      const student = students.get(absence.studentId)!;
      let schedule = schedules.get(student.scheduleId);
      if (!schedule) {
        schedule = await this.scheduleService.findById(student.scheduleId);
        schedules.set(student.scheduleId, schedule);
      }
      responses.push(this.toResponse(absence, student, schedule, now));
    }
    return responses;
  }

  /** Admin view: a company's active absences, optionally for one date/student. */
  async findForCompany(
    companyId: string,
    filters: { date?: string; studentId?: string },
  ): Promise<StudentAbsenceResponseDto[]> {
    const company = await this.companyService.findById(companyId);
    const now = zonedNow(company.timezone);

    const absences = await this.absenceRepository.findAll({
      companyId,
      date: filters.date?.slice(0, 10),
      fromDate: filters.date ? undefined : now.date,
      studentIds: filters.studentId ? [filters.studentId] : undefined,
      status: AbsenceStatus.ACTIVE,
    });

    const responses: StudentAbsenceResponseDto[] = [];
    for (const absence of absences) {
      const schedule = await this.scheduleService.findById(
        absence.student.scheduleId,
      );
      responses.push(this.toResponse(absence, absence.student, schedule, now));
    }
    return responses;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async assertGuardianOf(
    userId: string,
    studentId: string,
  ): Promise<void> {
    const isGuardian = await this.studentGuardianService.isGuardianOfStudent(
      userId,
      studentId,
    );
    if (!isGuardian) {
      throw new ForbiddenException('No eres acudiente de este estudiante.');
    }
  }

  /**
   * Narrows the requested leg to the legs the student actually rides — e.g.
   * "ida y regreso" for a PICKUP_ONLY student is just the ida. Rejects a leg
   * the student never rides at all.
   */
  private restrictToTripType(leg: AbsenceLeg, tripType: TripType): AbsenceLeg {
    const rides = TRIP_LEGS[tripType];
    if (rides === AbsenceLeg.BOTH) return leg;
    if (leg === AbsenceLeg.BOTH || leg === rides) return rides;
    throw new BadRequestException(
      rides === AbsenceLeg.PICKUP
        ? 'Este estudiante solo usa la ruta de ida.'
        : 'Este estudiante solo usa la ruta de regreso.',
    );
  }

  private assertBeforeCutoff(
    date: string,
    leg: AbsenceLeg,
    schedule: ScheduleTimes,
    now: ReturnType<typeof zonedNow>,
    action: 'reportar' | 'cancelar',
  ): void {
    if (!isPastCutoff(date, leg, schedule, now)) return;

    const cutoff = cutoffTimeFor(leg, schedule);
    const dropoffStillOpen =
      leg === AbsenceLeg.BOTH &&
      !isPastCutoff(date, AbsenceLeg.DROPOFF, schedule, now);

    throw new BadRequestException(
      dropoffStillOpen && action === 'reportar'
        ? `Ya pasó la hora de entrada (${cutoff}), la ruta de ida ya salió. Aún puedes reportar solo el regreso.`
        : `Ya no es posible ${action} la ausencia: la hora límite era las ${cutoff}.`,
    );
  }

  private async loadContext(
    student: Student,
  ): Promise<{ schedule: ScheduleTimes; timezone: string }> {
    const schedule = await this.scheduleService.findById(student.scheduleId);
    const company = await this.companyService.findById(student.companyId);
    return { schedule, timezone: company.timezone };
  }

  // A failed re-plan (e.g. Google Directions down) must not undo the
  // guardian's report — the plan is also rebuilt lazily when read.
  private async rebuildRouteFor(
    studentId: string,
    date: string,
  ): Promise<void> {
    try {
      const [stop] = await this.routeStopsService.findAll({ studentId });
      if (!stop) return;
      await this.dailyRoutePlansService.rebuild(stop.schoolRouteId, date);
    } catch (error) {
      this.logger.error(
        `Failed to rebuild the daily route for student ${studentId} on ${date}: ${(error as Error).message}`,
      );
    }
  }

  private toResponse(
    absence: StudentAbsence,
    student: Student,
    schedule: ScheduleTimes,
    now: ReturnType<typeof zonedNow>,
  ): StudentAbsenceResponseDto {
    return {
      id: absence.id,
      studentId: absence.studentId,
      studentName: this.fullName(student),
      date: absence.date,
      leg: absence.leg,
      reason: absence.reason,
      status: absence.status,
      canCancel:
        absence.status === AbsenceStatus.ACTIVE &&
        !isPastCutoff(absence.date, absence.leg, schedule, now),
      createdAt: absence.createdAt,
    };
  }

  private fullName(student: Student): string {
    return `${student.firstName} ${student.lastName}`;
  }
}
