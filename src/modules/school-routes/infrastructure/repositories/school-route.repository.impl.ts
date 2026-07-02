import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolRoute } from '../../domain/school-route.entity';
import {
  ISchoolRouteRepository,
  RouteFilters,
} from '../../domain/interfaces/school-route.repository';

@Injectable()
export class SchoolRouteRepositoryImpl implements ISchoolRouteRepository {
  constructor(
    @InjectRepository(SchoolRoute)
    private readonly repository: Repository<SchoolRoute>,
  ) {}

  async create(data: Partial<SchoolRoute>): Promise<SchoolRoute> {
    const route = this.repository.create(data);
    return this.repository.save(route);
  }

  async findAll(filters: RouteFilters): Promise<SchoolRoute[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.schoolAssignmentId)
      where.schoolAssignmentId = filters.schoolAssignmentId;
    if (filters.status) where.status = filters.status;
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<SchoolRoute | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByAssignmentId(
    assignmentId: string,
    withDeleted = false,
  ): Promise<SchoolRoute | null> {
    return this.repository.findOne({
      where: { schoolAssignmentId: assignmentId },
      withDeleted,
    });
  }

  async update(id: string, data: Partial<SchoolRoute>): Promise<SchoolRoute> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<SchoolRoute>;
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
