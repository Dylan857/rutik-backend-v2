import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Maintenance } from '../../domain/maintenance.entity';
import {
  IMaintenanceRepository,
  MaintenanceFilters,
  MaintenanceSummaryTotals,
} from '../../domain/interfaces/maintenance.repository';

@Injectable()
export class MaintenanceRepositoryImpl implements IMaintenanceRepository {
  constructor(
    @InjectRepository(Maintenance)
    private readonly repository: Repository<Maintenance>,
  ) {}

  async create(data: Partial<Maintenance>): Promise<Maintenance> {
    const maintenance = this.repository.create(data);
    return this.repository.save(maintenance);
  }

  async findAll(filters: MaintenanceFilters): Promise<Maintenance[]> {
    const query = this.buildFilteredQuery(filters);
    return query
      .orderBy('maintenance.date', 'DESC')
      .addOrderBy('maintenance.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<Maintenance | null> {
    return this.repository.findOne({
      where: { id },
      relations: { vehicle: true },
    });
  }

  async update(id: string, data: Partial<Maintenance>): Promise<Maintenance> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<Maintenance>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async getSummaryTotals(
    companyId: string,
    month: number,
    year: number,
  ): Promise<MaintenanceSummaryTotals> {
    const raw = await this.repository
      .createQueryBuilder('maintenance')
      .select('COALESCE(SUM(maintenance.totalCost), 0)', 'totalInvested')
      .addSelect('COUNT(*)', 'count')
      .where('maintenance.companyId = :companyId', { companyId })
      .andWhere('EXTRACT(MONTH FROM maintenance.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM maintenance.date) = :year', { year })
      .getRawOne<{ totalInvested: string; count: string }>();

    return {
      totalInvested: parseFloat(raw?.totalInvested ?? '0'),
      count: parseInt(raw?.count ?? '0', 10),
    };
  }

  async countVehiclesWithUpcomingMaintenance(
    companyId: string,
  ): Promise<number> {
    const raw = await this.repository
      .createQueryBuilder('maintenance')
      .innerJoin('maintenance.vehicle', 'vehicle')
      .select('COUNT(DISTINCT maintenance.vehicleId)', 'count')
      .where('maintenance.companyId = :companyId', { companyId })
      .andWhere(
        `(
          (maintenance.nextMaintenanceDate IS NOT NULL AND maintenance.nextMaintenanceDate < CURRENT_DATE + INTERVAL '15 days')
          OR (maintenance.nextMaintenanceMileage IS NOT NULL AND (maintenance.nextMaintenanceMileage - vehicle.currentMileage) < 500)
        )`,
      )
      .getRawOne<{ count: string }>();

    return parseInt(raw?.count ?? '0', 10);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildFilteredQuery(
    filters: MaintenanceFilters,
  ): SelectQueryBuilder<Maintenance> {
    const query = this.repository
      .createQueryBuilder('maintenance')
      .leftJoinAndSelect('maintenance.vehicle', 'vehicle');

    if (filters.companyId) {
      query.andWhere('maintenance.companyId = :companyId', {
        companyId: filters.companyId,
      });
    }
    if (filters.vehicleId) {
      query.andWhere('maintenance.vehicleId = :vehicleId', {
        vehicleId: filters.vehicleId,
      });
    }
    if (filters.month) {
      query.andWhere('EXTRACT(MONTH FROM maintenance.date) = :month', {
        month: filters.month,
      });
    }
    if (filters.year) {
      query.andWhere('EXTRACT(YEAR FROM maintenance.date) = :year', {
        year: filters.year,
      });
    }
    if (filters.search) {
      query.andWhere(
        `(
          vehicle.plate ILIKE :search
          OR vehicle.brand ILIKE :search
          OR vehicle.model ILIKE :search
          OR maintenance.workshop ILIKE :search
          OR maintenance.description ILIKE :search
        )`,
        { search: `%${filters.search}%` },
      );
    }

    return query;
  }
}
