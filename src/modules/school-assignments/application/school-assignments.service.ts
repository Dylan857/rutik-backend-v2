import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { DriverService } from '../../drivers/application/drivers.service';
import { SchoolService } from '../../school/application/school.service';
import { SchoolScheduleService } from '../../school-schedules/application/school-schedules.service';
import { SchoolRoutesService } from '../../school-routes/application/school-routes.service';
import { VehiclesService } from '../../vehicles/application/vehicles.service';
import { SchoolAssignment } from '../domain/school-assignment.entity';
import { AssignmentStatus } from '../domain/enums/assignment-status.enum';
import {
  AssignmentFilters,
  ISchoolAssignmentRepository,
  SCHOOL_ASSIGNMENT_REPOSITORY,
} from '../domain/interfaces/school-assignment.repository';
import { CreateSchoolAssignmentDto } from '../infrastructure/api/dto/create-school-assignment.dto';
import { UpdateSchoolAssignmentDto } from '../infrastructure/api/dto/update-school-assignment.dto';

export type AssignmentSummary = Omit<
  SchoolAssignment,
  'school' | 'driver' | 'vehicle'
> & {
  school?: { id: string; name: string };
  driver?: { id: string; firstName: string; lastName: string };
  vehicle?: { id: string; plate: string };
};

@Injectable()
export class SchoolAssignmentsService {
  constructor(
    @Inject(SCHOOL_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: ISchoolAssignmentRepository,
    private readonly companyService: CompanyService,
    private readonly schoolService: SchoolService,
    private readonly scheduleService: SchoolScheduleService,
    private readonly driverService: DriverService,
    private readonly vehiclesService: VehiclesService,
    private readonly schoolRoutesService: SchoolRoutesService,
  ) {}

  async create(dto: CreateSchoolAssignmentDto): Promise<SchoolAssignment> {
    // ── 1. Verify all referenced entities exist ───────────────────────────────
    await this.companyService.findById(dto.companyId);

    const school = await this.schoolService.findById(dto.schoolId);
    const schedule = await this.scheduleService.findById(dto.scheduleId);
    const driver = await this.driverService.findById(dto.driverId);
    const vehicle = await this.vehiclesService.findById(dto.vehicleId);

    // ── 2. Cross-entity company ownership ────────────────────────────────────
    this.assertBelongsToCompany('School', school.companyId, dto.companyId);
    this.assertBelongsToCompany(
      'School schedule',
      schedule.companyId,
      dto.companyId,
    );
    this.assertBelongsToCompany('Driver', driver.companyId, dto.companyId);
    this.assertBelongsToCompany('Vehicle', vehicle.companyId, dto.companyId);

    // ── 3. Schedule must belong to the given school ───────────────────────────
    if (schedule.schoolId !== dto.schoolId) {
      throw new BadRequestException(
        `Schedule with ID "${dto.scheduleId}" does not belong to school with ID "${dto.schoolId}"`,
      );
    }

    // ── 4. Uniqueness: one active assignment per school + schedule ────────────
    await this.assertNoActiveAssignmentForSlot(dto.schoolId, dto.scheduleId);

    // ── 5. Uniqueness: driver cannot have overlapping time window ─────────────
    await this.assertDriverFreeInTimeWindow(
      dto.driverId,
      schedule.startTime,
      schedule.endTime,
    );

    // ── 6. Uniqueness: vehicle cannot have overlapping time window ─────────────
    await this.assertVehicleFreeInTimeWindow(
      dto.vehicleId,
      schedule.startTime,
      schedule.endTime,
    );

    const assignment = await this.assignmentRepository.create({
      companyId: dto.companyId,
      schoolId: dto.schoolId,
      scheduleId: dto.scheduleId,
      driverId: dto.driverId,
      vehicleId: dto.vehicleId,
      status: dto.status ?? AssignmentStatus.ACTIVE,
    });

    await this.schoolRoutesService.syncRoute('create', assignment);

    return assignment;
  }

  async findAll(filters: AssignmentFilters): Promise<AssignmentSummary[]> {
    const assignments = await this.assignmentRepository.findAll(filters);
    return assignments.map((a) => this.toSummary(a));
  }

  async findById(id: string): Promise<AssignmentSummary> {
    const assignment = await this.findRawById(id);
    return this.toSummary(assignment);
  }

  async update(
    id: string,
    dto: UpdateSchoolAssignmentDto,
  ): Promise<AssignmentSummary> {
    const current = await this.findRawById(id);

    const needsTimeCheck =
      (dto.driverId && dto.driverId !== current.driverId) ||
      (dto.vehicleId && dto.vehicleId !== current.vehicleId) ||
      (dto.status === AssignmentStatus.ACTIVE &&
        current.status === AssignmentStatus.INACTIVE);

    const currentSchedule = needsTimeCheck
      ? await this.scheduleService.findById(current.scheduleId)
      : null;

    // ── Validate new driver if it changes ─────────────────────────────────────
    if (dto.driverId && dto.driverId !== current.driverId) {
      const driver = await this.driverService.findById(dto.driverId);
      this.assertBelongsToCompany(
        'Driver',
        driver.companyId,
        current.companyId,
      );
      await this.assertDriverFreeInTimeWindow(
        dto.driverId,
        currentSchedule!.startTime,
        currentSchedule!.endTime,
        id,
      );
    }

    // ── Validate new vehicle if it changes ────────────────────────────────────
    if (dto.vehicleId && dto.vehicleId !== current.vehicleId) {
      const vehicle = await this.vehiclesService.findById(dto.vehicleId);
      this.assertBelongsToCompany(
        'Vehicle',
        vehicle.companyId,
        current.companyId,
      );
      await this.assertVehicleFreeInTimeWindow(
        dto.vehicleId,
        currentSchedule!.startTime,
        currentSchedule!.endTime,
        id,
      );
    }

    // ── If reactivating, re-check slot uniqueness ─────────────────────────────
    const becomingActive =
      dto.status === AssignmentStatus.ACTIVE &&
      current.status === AssignmentStatus.INACTIVE;
    if (becomingActive) {
      await this.assertNoActiveAssignmentForSlot(
        current.schoolId,
        current.scheduleId,
        id,
      );
      await this.assertDriverFreeInTimeWindow(
        dto.driverId ?? current.driverId,
        currentSchedule!.startTime,
        currentSchedule!.endTime,
        id,
      );
      await this.assertVehicleFreeInTimeWindow(
        dto.vehicleId ?? current.vehicleId,
        currentSchedule!.startTime,
        currentSchedule!.endTime,
        id,
      );
    }

    const updated = await this.assignmentRepository.update(id, dto);

    const becomingInactive =
      dto.status === AssignmentStatus.INACTIVE &&
      current.status === AssignmentStatus.ACTIVE;

    if (becomingInactive) {
      await this.schoolRoutesService.syncRoute('deactivate', updated);
    } else if (dto.driverId || dto.vehicleId || becomingActive) {
      await this.schoolRoutesService.syncRoute(
        becomingActive ? 'create' : 'update',
        updated,
      );
    }

    return this.toSummary(updated);
  }

  async softDelete(id: string): Promise<void> {
    const assignment = await this.findRawById(id);
    await this.assignmentRepository.softDelete(id);
    await this.schoolRoutesService.syncRoute('deactivate', assignment);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private async findRawById(id: string): Promise<SchoolAssignment> {
    const assignment = await this.assignmentRepository.findById(id);

    if (!assignment) {
      throw new NotFoundException(
        `School assignment with ID "${id}" not found`,
      );
    }

    return assignment;
  }

  private toSummary(assignment: SchoolAssignment): AssignmentSummary {
    return {
      ...assignment,
      school: assignment.school
        ? { id: assignment.school.id, name: assignment.school.name }
        : undefined,
      driver: assignment.driver
        ? {
            id: assignment.driver.id,
            firstName: assignment.driver.user?.firstName ?? '',
            lastName: assignment.driver.user?.lastName ?? '',
          }
        : undefined,
      vehicle: assignment.vehicle
        ? { id: assignment.vehicle.id, plate: assignment.vehicle.plate }
        : undefined,
    };
  }

  // ── Private guards ────────────────────────────────────────────────────────────

  private assertBelongsToCompany(
    entityLabel: string,
    entityCompanyId: string,
    expectedCompanyId: string,
  ): void {
    if (entityCompanyId !== expectedCompanyId) {
      throw new BadRequestException(
        `${entityLabel} does not belong to company with ID "${expectedCompanyId}"`,
      );
    }
  }

  private async assertNoActiveAssignmentForSlot(
    schoolId: string,
    scheduleId: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict =
      await this.assignmentRepository.findActiveBySchoolAndSchedule(
        schoolId,
        scheduleId,
        excludeId,
      );
    if (conflict) {
      throw new ConflictException(
        `There is already an active assignment for school "${schoolId}" in schedule "${scheduleId}"`,
      );
    }
  }

  private async assertDriverFreeInTimeWindow(
    driverId: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict =
      await this.assignmentRepository.findActiveByDriverInTimeWindow(
        driverId,
        startTime,
        endTime,
        excludeId,
      );
    if (conflict) {
      throw new ConflictException(
        `Driver with ID "${driverId}" already has an active assignment during ${startTime}–${endTime}`,
      );
    }
  }

  private async assertVehicleFreeInTimeWindow(
    vehicleId: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict =
      await this.assignmentRepository.findActiveByVehicleInTimeWindow(
        vehicleId,
        startTime,
        endTime,
        excludeId,
      );
    if (conflict) {
      throw new ConflictException(
        `Vehicle with ID "${vehicleId}" already has an active assignment during ${startTime}–${endTime}`,
      );
    }
  }
}
