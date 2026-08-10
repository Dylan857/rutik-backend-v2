import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { FuelLog } from '../../domain/fuel-log.entity';
import {
  FuelLogFilters,
  IFuelLogRepository,
} from '../../domain/interfaces/fuel-log.repository';

@Injectable()
export class FuelLogRepositoryImpl implements IFuelLogRepository {
  constructor(
    @InjectRepository(FuelLog)
    private readonly repository: Repository<FuelLog>,
  ) {}

  async create(data: Partial<FuelLog>): Promise<FuelLog> {
    const fuelLog = this.repository.create(data);
    return this.repository.save(fuelLog);
  }

  async findAll(filters: FuelLogFilters): Promise<FuelLog[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;

    if (filters.dateFrom && filters.dateTo) {
      where.date = Between(filters.dateFrom, filters.dateTo);
    } else if (filters.dateFrom) {
      where.date = MoreThanOrEqual(filters.dateFrom);
    } else if (filters.dateTo) {
      where.date = LessThanOrEqual(filters.dateTo);
    }

    return this.repository.find({
      where,
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<FuelLog | null> {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<FuelLog>): Promise<FuelLog> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<FuelLog>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async getTotalAmount(
    companyId: string,
    month: number,
    year: number,
  ): Promise<number> {
    const raw = await this.repository
      .createQueryBuilder('fuelLog')
      .select('COALESCE(SUM(fuelLog.amountPaid), 0)', 'total')
      .where('fuelLog.companyId = :companyId', { companyId })
      .andWhere('EXTRACT(MONTH FROM fuelLog.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM fuelLog.date) = :year', { year })
      .getRawOne<{ total: string }>();

    return parseFloat(raw?.total ?? '0');
  }
}
