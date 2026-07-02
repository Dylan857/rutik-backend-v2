import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { SchoolService } from '../../school/application/school.service';
import { SchoolSchedule } from '../domain/school-schedule.entity';
import {
  ISchoolScheduleRepository,
  ScheduleFilters,
  SCHOOL_SCHEDULE_REPOSITORY,
} from '../domain/interfaces/school-schedule.repository';
import { CreateSchoolScheduleDto } from '../infrastructure/api/dto/create-school-schedule.dto';
import { UpdateSchoolScheduleDto } from '../infrastructure/api/dto/update-school-schedule.dto';

@Injectable()
export class SchoolScheduleService {
  constructor(
    @Inject(SCHOOL_SCHEDULE_REPOSITORY)
    private readonly scheduleRepository: ISchoolScheduleRepository,
    private readonly companyService: CompanyService,
    private readonly schoolService: SchoolService,
  ) {}

  async create(dto: CreateSchoolScheduleDto): Promise<SchoolSchedule> {
    await this.companyService.findById(dto.companyId);

    const school = await this.schoolService.findById(dto.schoolId);
    if (school.companyId !== dto.companyId) {
      throw new BadRequestException(
        `School with ID "${dto.schoolId}" does not belong to company with ID "${dto.companyId}"`,
      );
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    const existing = await this.scheduleRepository.findByNameAndSchool(
      dto.name,
      dto.schoolId,
    );
    if (existing) {
      throw new ConflictException(
        `A schedule named "${dto.name}" already exists for this school`,
      );
    }

    return this.scheduleRepository.create(dto);
  }

  async findAll(filters: ScheduleFilters): Promise<SchoolSchedule[]> {
    return this.scheduleRepository.findAll(filters);
  }

  async findById(id: string): Promise<SchoolSchedule> {
    const schedule = await this.scheduleRepository.findById(id);

    if (!schedule) {
      throw new NotFoundException(`School schedule with ID "${id}" not found`);
    }

    return schedule;
  }

  async update(
    id: string,
    dto: UpdateSchoolScheduleDto,
  ): Promise<SchoolSchedule> {
    const current = await this.findById(id);

    const effectiveStart = dto.startTime ?? current.startTime;
    const effectiveEnd = dto.endTime ?? current.endTime;
    if (effectiveStart >= effectiveEnd) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    if (dto.name && dto.name !== current.name) {
      const existing = await this.scheduleRepository.findByNameAndSchool(
        dto.name,
        current.schoolId,
      );
      if (existing) {
        throw new ConflictException(
          `A schedule named "${dto.name}" already exists for this school`,
        );
      }
    }

    return this.scheduleRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.scheduleRepository.softDelete(id);
  }
}
