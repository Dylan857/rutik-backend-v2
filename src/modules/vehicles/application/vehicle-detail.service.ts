import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FuelLog } from '../../fuel-logs/domain/fuel-log.entity';
import { Vehicle } from '../domain/vehicle.entity';
import {
  ActiveRouteWithContext,
  AssignedStudentWithContext,
  IVehicleDetailRepository,
  VEHICLE_DETAIL_REPOSITORY,
} from '../domain/interfaces/vehicle-detail.repository';
import { VehiclesService } from './vehicles.service';

export interface FuelPeriod {
  month: number;
  year: number;
  dateFrom: string;
  dateTo: string;
}

export interface VehicleDetail {
  vehicle: Vehicle;
  fuel: {
    period: FuelPeriod;
    totalAmountPaid: number;
    totalGallons: number;
    logsCount: number;
    logs: FuelLog[];
  };
  activeRoutes: ActiveRouteWithContext[];
  assignedStudents: AssignedStudentWithContext[];
}

@Injectable()
export class VehicleDetailService {
  constructor(
    @Inject(VEHICLE_DETAIL_REPOSITORY)
    private readonly vehicleDetailRepository: IVehicleDetailRepository,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async getDetail(
    id: string,
    month?: number,
    year?: number,
  ): Promise<VehicleDetail> {
    const vehicle = await this.vehiclesService.findById(id);
    const period = this.resolvePeriod(month, year);

    const [fuelSummary, activeRoutes] = await Promise.all([
      this.vehicleDetailRepository.getFuelSummary(
        id,
        period.dateFrom,
        period.dateTo,
      ),
      this.vehicleDetailRepository.getActiveRoutes(id),
    ]);

    const assignedStudents =
      await this.vehicleDetailRepository.getAssignedStudents(
        activeRoutes.map((route) => route.id),
      );

    return {
      vehicle,
      fuel: { period, ...fuelSummary },
      activeRoutes,
      assignedStudents,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private resolvePeriod(month?: number, year?: number): FuelPeriod {
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
