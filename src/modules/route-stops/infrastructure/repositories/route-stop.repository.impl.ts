import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteStop } from '../../domain/route-stop.entity';
import {
  IRouteStopRepository,
  RouteStopFilters,
} from '../../domain/interfaces/route-stop.repository';

@Injectable()
export class RouteStopRepositoryImpl implements IRouteStopRepository {
  constructor(
    @InjectRepository(RouteStop)
    private readonly repository: Repository<RouteStop>,
  ) {}

  async create(data: Partial<RouteStop>): Promise<RouteStop> {
    const stop = this.repository.create(data);
    return this.repository.save(stop);
  }

  async findAll(filters: RouteStopFilters): Promise<RouteStop[]> {
    const where: Record<string, unknown> = {};
    if (filters.schoolRouteId) where.schoolRouteId = filters.schoolRouteId;
    if (filters.studentId) where.studentId = filters.studentId;
    return this.repository.find({ where, order: { stopOrder: 'ASC' } });
  }

  async findById(id: string): Promise<RouteStop | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByStudentId(studentId: string): Promise<RouteStop | null> {
    return this.repository.findOne({ where: { studentId } });
  }

  async findByRouteAndStudent(
    routeId: string,
    studentId: string,
  ): Promise<RouteStop | null> {
    return this.repository.findOne({
      where: { schoolRouteId: routeId, studentId },
    });
  }

  async updateOrder(id: string, stopOrder: number): Promise<void> {
    await this.repository.update(id, { stopOrder });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
