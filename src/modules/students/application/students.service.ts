import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { SchoolService } from '../../school/application/school.service';
import { SchoolScheduleService } from '../../school-schedules/application/school-schedules.service';
import { RouteStopsService } from '../../route-stops/application/route-stops.service';
import { Student } from '../domain/student.entity';
import {
  IStudentRepository,
  StudentFilters,
  STUDENT_REPOSITORY,
} from '../domain/interfaces/student.repository';
import { CreateStudentDto } from '../infrastructure/api/dto/create-student.dto';
import { UpdateStudentDto } from '../infrastructure/api/dto/update-student.dto';

@Injectable()
export class StudentService {
  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepository: IStudentRepository,
    private readonly companyService: CompanyService,
    private readonly schoolService: SchoolService,
    private readonly scheduleService: SchoolScheduleService,
    private readonly routeStopsService: RouteStopsService,
  ) {}

  async create(dto: CreateStudentDto): Promise<Student> {
    await this.companyService.findById(dto.companyId);

    const school = await this.schoolService.findById(dto.schoolId);
    if (school.companyId !== dto.companyId) {
      throw new BadRequestException(
        `School with ID "${dto.schoolId}" does not belong to company with ID "${dto.companyId}"`,
      );
    }

    const schedule = await this.scheduleService.findById(dto.scheduleId);
    if (schedule.schoolId !== dto.schoolId) {
      throw new BadRequestException(
        `Schedule with ID "${dto.scheduleId}" does not belong to school with ID "${dto.schoolId}"`,
      );
    }

    const student = await this.studentRepository.create(dto);

    // Route assignment is fire-and-forget: a missing assignment or route is
    // expected during initial setup and is logged, not thrown, by RouteStopsService.
    await this.routeStopsService.addStudentToRoute(student);

    return student;
  }

  async findAll(filters: StudentFilters): Promise<Student[]> {
    return this.studentRepository.findAll(filters);
  }

  async findById(id: string): Promise<Student> {
    const student = await this.studentRepository.findById(id);

    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<Student> {
    const current = await this.findById(id);

    if (dto.scheduleId && dto.scheduleId !== current.scheduleId) {
      const schedule = await this.scheduleService.findById(dto.scheduleId);
      if (schedule.schoolId !== current.schoolId) {
        throw new BadRequestException(
          `Schedule with ID "${dto.scheduleId}" does not belong to school with ID "${current.schoolId}"`,
        );
      }
    }

    // scheduleId is the only field whose change requires route reassignment
    // (schoolId is immutable on UpdateStudentDto)
    const scheduleChanged =
      dto.scheduleId !== undefined && dto.scheduleId !== current.scheduleId;

    // tripType doesn't move the student to a different route — it only
    // changes which leg(s) their existing stop participates in — so it's
    // handled separately from the full remove/re-add that scheduleId needs.
    const tripTypeChanged =
      dto.tripType !== undefined && dto.tripType !== current.tripType;

    if (scheduleChanged) {
      await this.routeStopsService.removeStudentFromRoute(id);
    }

    const updated = await this.studentRepository.update(id, dto);

    if (scheduleChanged) {
      await this.routeStopsService.addStudentToRoute(updated);
    } else if (tripTypeChanged) {
      await this.routeStopsService.refreshRouteForStudent(id);
    }

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.routeStopsService.removeStudentFromRoute(id);
    await this.studentRepository.softDelete(id);
  }
}
