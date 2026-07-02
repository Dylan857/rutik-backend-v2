import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolSchedule } from '../../domain/school-schedule.entity';
import {
  ISchoolScheduleRepository,
  ScheduleFilters,
} from '../../domain/interfaces/school-schedule.repository';

@Injectable()
export class SchoolScheduleRepositoryImpl implements ISchoolScheduleRepository {
  constructor(
    @InjectRepository(SchoolSchedule)
    private readonly repository: Repository<SchoolSchedule>,
  ) {}

  async create(data: Partial<SchoolSchedule>): Promise<SchoolSchedule> {
    const schedule = this.repository.create(data);
    return this.repository.save(schedule);
  }

  async findAll(filters: ScheduleFilters): Promise<SchoolSchedule[]> {
    const where: Record<string, string> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.schoolId) where.schoolId = filters.schoolId;
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<SchoolSchedule | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByNameAndSchool(
    name: string,
    schoolId: string,
  ): Promise<SchoolSchedule | null> {
    return this.repository.findOne({ where: { name, schoolId } });
  }

  async update(
    id: string,
    data: Partial<SchoolSchedule>,
  ): Promise<SchoolSchedule> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<SchoolSchedule>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
