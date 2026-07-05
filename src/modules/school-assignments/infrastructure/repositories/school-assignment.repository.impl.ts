import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolAssignment } from '../../domain/school-assignment.entity';
import { AssignmentStatus } from '../../domain/enums/assignment-status.enum';
import {
  AssignmentFilters,
  ISchoolAssignmentRepository,
} from '../../domain/interfaces/school-assignment.repository';

@Injectable()
export class SchoolAssignmentRepositoryImpl implements ISchoolAssignmentRepository {
  constructor(
    @InjectRepository(SchoolAssignment)
    private readonly repository: Repository<SchoolAssignment>,
  ) {}

  async create(data: Partial<SchoolAssignment>): Promise<SchoolAssignment> {
    const assignment = this.repository.create(data);
    return this.repository.save(assignment);
  }

  async findAll(filters: AssignmentFilters): Promise<SchoolAssignment[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.schoolId) where.schoolId = filters.schoolId;
    if (filters.scheduleId) where.scheduleId = filters.scheduleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.status) where.status = filters.status;
    return this.repository.find({
      where,
      relations: { school: true, driver: { user: true }, vehicle: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<SchoolAssignment | null> {
    return this.repository.findOne({
      where: { id },
      relations: { school: true, driver: { user: true }, vehicle: true },
    });
  }

  async findActiveBySchoolAndSchedule(
    schoolId: string,
    scheduleId: string,
    excludeId?: string,
  ): Promise<SchoolAssignment | null> {
    const records = await this.repository.find({
      where: { schoolId, scheduleId, status: AssignmentStatus.ACTIVE },
    });
    return records.find((a) => a.id !== excludeId) ?? null;
  }

  async update(
    id: string,
    data: Partial<SchoolAssignment>,
  ): Promise<SchoolAssignment> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<SchoolAssignment>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
