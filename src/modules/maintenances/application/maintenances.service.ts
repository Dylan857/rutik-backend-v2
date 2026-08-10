import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VehiclesService } from '../../vehicles/application/vehicles.service';
import { Maintenance } from '../domain/maintenance.entity';
import {
  IMaintenanceRepository,
  MAINTENANCE_REPOSITORY,
  MaintenanceFilters,
} from '../domain/interfaces/maintenance.repository';
import { MaintenanceStatus } from '../domain/enums/maintenance-status.enum';
import { CreateMaintenanceDto } from '../infrastructure/api/dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from '../infrastructure/api/dto/update-maintenance.dto';
import { computeMaintenanceStatus } from './maintenance-status.util';

export interface MaintenancePeriod {
  month: number;
  year: number;
  dateFrom: string;
  dateTo: string;
}

export interface MaintenanceSummary {
  period: MaintenancePeriod;
  totalInvested: number;
  maintenanceCount: number;
  averageCost: number;
  vehiclesWithUpcomingMaintenance: number;
}

export type MaintenanceWithStatus = Maintenance & {
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  status: MaintenanceStatus;
};

@Injectable()
export class MaintenancesService {
  constructor(
    @Inject(MAINTENANCE_REPOSITORY)
    private readonly maintenanceRepository: IMaintenanceRepository,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async create(dto: CreateMaintenanceDto): Promise<MaintenanceWithStatus> {
    const vehicle = await this.vehiclesService.findById(dto.vehicleId);
    this.assertDateNotFuture(dto.date);
    this.assertNextMaintenanceIsCoherent(dto, dto.date, dto.mileage);

    const laborCost = dto.laborCost ?? 0;
    const partsCost = dto.partsCost ?? 0;

    const maintenance = await this.maintenanceRepository.create({
      companyId: vehicle.companyId,
      vehicleId: dto.vehicleId,
      date: dto.date,
      maintenanceType: dto.maintenanceType,
      workshop: dto.workshop ?? null,
      mileage: dto.mileage,
      description: dto.description ?? null,
      laborCost,
      partsCost,
      totalCost: laborCost + partsCost,
      nextMaintenanceDate: dto.nextMaintenanceDate ?? null,
      nextMaintenanceMileage: dto.nextMaintenanceMileage ?? null,
    });

    if (dto.mileage > vehicle.currentMileage) {
      await this.vehiclesService.update(vehicle.id, {
        currentMileage: dto.mileage,
      });
      vehicle.currentMileage = dto.mileage;
    }

    return this.toResponseShape({ ...maintenance, vehicle });
  }

  async findAll(filters: MaintenanceFilters): Promise<MaintenanceWithStatus[]> {
    const maintenances = await this.maintenanceRepository.findAll(filters);
    return maintenances.map((maintenance) => this.toResponseShape(maintenance));
  }

  async findById(id: string): Promise<MaintenanceWithStatus> {
    const maintenance = await this.maintenanceRepository.findById(id);
    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID "${id}" not found`);
    }
    return this.toResponseShape(maintenance);
  }

  async update(
    id: string,
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceWithStatus> {
    const current = await this.maintenanceRepository.findById(id);
    if (!current) {
      throw new NotFoundException(`Maintenance with ID "${id}" not found`);
    }

    if (dto.date !== undefined) {
      this.assertDateNotFuture(dto.date);
    }

    const effectiveDate = dto.date ?? current.date;
    const effectiveMileage = dto.mileage ?? current.mileage;
    const effectiveNextDate =
      dto.nextMaintenanceDate !== undefined
        ? dto.nextMaintenanceDate
        : current.nextMaintenanceDate;
    const effectiveNextMileage =
      dto.nextMaintenanceMileage !== undefined
        ? dto.nextMaintenanceMileage
        : current.nextMaintenanceMileage;
    this.assertNextMaintenanceIsCoherent(
      {
        nextMaintenanceDate: effectiveNextDate,
        nextMaintenanceMileage: effectiveNextMileage,
      },
      effectiveDate,
      effectiveMileage,
    );

    const laborCost = dto.laborCost ?? current.laborCost;
    const partsCost = dto.partsCost ?? current.partsCost;

    const updated = await this.maintenanceRepository.update(id, {
      ...(dto.date !== undefined && { date: dto.date }),
      ...(dto.maintenanceType !== undefined && {
        maintenanceType: dto.maintenanceType,
      }),
      ...(dto.workshop !== undefined && { workshop: dto.workshop }),
      ...(dto.mileage !== undefined && { mileage: dto.mileage }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.laborCost !== undefined && { laborCost }),
      ...(dto.partsCost !== undefined && { partsCost }),
      ...((dto.laborCost !== undefined || dto.partsCost !== undefined) && {
        totalCost: laborCost + partsCost,
      }),
      ...(dto.nextMaintenanceDate !== undefined && {
        nextMaintenanceDate: dto.nextMaintenanceDate,
      }),
      ...(dto.nextMaintenanceMileage !== undefined && {
        nextMaintenanceMileage: dto.nextMaintenanceMileage,
      }),
    });

    if (
      dto.mileage !== undefined &&
      dto.mileage > current.vehicle.currentMileage
    ) {
      await this.vehiclesService.update(current.vehicleId, {
        currentMileage: dto.mileage,
      });
      updated.vehicle.currentMileage = dto.mileage;
    }

    return this.toResponseShape(updated);
  }

  async softDelete(id: string): Promise<void> {
    const maintenance = await this.maintenanceRepository.findById(id);
    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID "${id}" not found`);
    }
    await this.maintenanceRepository.softDelete(id);
  }

  async getSummary(
    companyId: string,
    month?: number,
    year?: number,
  ): Promise<MaintenanceSummary> {
    const period = this.resolvePeriod(month, year);

    const [{ totalInvested, count }, vehiclesWithUpcomingMaintenance] =
      await Promise.all([
        this.maintenanceRepository.getSummaryTotals(
          companyId,
          period.month,
          period.year,
        ),
        this.maintenanceRepository.countVehiclesWithUpcomingMaintenance(
          companyId,
        ),
      ]);

    return {
      period,
      totalInvested,
      maintenanceCount: count,
      averageCost: count > 0 ? totalInvested / count : 0,
      vehiclesWithUpcomingMaintenance,
    };
  }

  async getTotalExpenses(
    companyId: string,
    month: number,
    year: number,
  ): Promise<number> {
    const { totalInvested } = await this.maintenanceRepository.getSummaryTotals(
      companyId,
      month,
      year,
    );
    return totalInvested;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private toResponseShape(maintenance: Maintenance): MaintenanceWithStatus {
    const status = computeMaintenanceStatus(
      maintenance.nextMaintenanceDate,
      maintenance.nextMaintenanceMileage,
      maintenance.vehicle.currentMileage,
    );

    return {
      ...maintenance,
      vehiclePlate: maintenance.vehicle.plate,
      vehicleBrand: maintenance.vehicle.brand,
      vehicleModel: maintenance.vehicle.model,
      status,
    };
  }

  private assertDateNotFuture(date: string): void {
    const maintenanceDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (maintenanceDate > today) {
      throw new BadRequestException(
        `Maintenance date "${date}" cannot be in the future`,
      );
    }
  }

  private assertNextMaintenanceIsCoherent(
    next: {
      nextMaintenanceDate?: string | null;
      nextMaintenanceMileage?: number | null;
    },
    date: string,
    mileage: number,
  ): void {
    if (next.nextMaintenanceDate && next.nextMaintenanceDate < date) {
      throw new BadRequestException(
        `nextMaintenanceDate "${next.nextMaintenanceDate}" cannot be earlier than the maintenance date "${date}"`,
      );
    }

    if (
      next.nextMaintenanceMileage !== undefined &&
      next.nextMaintenanceMileage !== null &&
      next.nextMaintenanceMileage <= mileage
    ) {
      throw new BadRequestException(
        `nextMaintenanceMileage "${next.nextMaintenanceMileage}" must be greater than mileage "${mileage}"`,
      );
    }
  }

  private resolvePeriod(month?: number, year?: number): MaintenancePeriod {
    const now = new Date();
    const resolvedMonth = month ?? now.getMonth() + 1;
    const resolvedYear = year ?? now.getFullYear();

    if (
      !Number.isInteger(resolvedMonth) ||
      resolvedMonth < 1 ||
      resolvedMonth > 12
    ) {
      throw new BadRequestException(
        'month must be an integer between 1 and 12',
      );
    }
    if (
      !Number.isInteger(resolvedYear) ||
      resolvedYear < 2000 ||
      resolvedYear > now.getFullYear() + 1
    ) {
      throw new BadRequestException(`year "${resolvedYear}" is out of range`);
    }

    const monthStr = String(resolvedMonth).padStart(2, '0');
    const lastDay = new Date(resolvedYear, resolvedMonth, 0).getDate();

    return {
      month: resolvedMonth,
      year: resolvedYear,
      dateFrom: `${resolvedYear}-${monthStr}-01`,
      dateTo: `${resolvedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
    };
  }
}
