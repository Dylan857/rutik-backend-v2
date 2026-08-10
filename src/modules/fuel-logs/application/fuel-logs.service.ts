import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VehiclesService } from '../../vehicles/application/vehicles.service';
import { FuelLog } from '../domain/fuel-log.entity';
import {
  FUEL_LOG_REPOSITORY,
  FuelLogFilters,
  IFuelLogRepository,
} from '../domain/interfaces/fuel-log.repository';
import { CreateFuelLogDto } from '../infrastructure/api/dto/create-fuel-log.dto';
import { UpdateFuelLogDto } from '../infrastructure/api/dto/update-fuel-log.dto';

@Injectable()
export class FuelLogsService {
  constructor(
    @Inject(FUEL_LOG_REPOSITORY)
    private readonly fuelLogRepository: IFuelLogRepository,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async create(dto: CreateFuelLogDto): Promise<FuelLog> {
    const vehicle = await this.vehiclesService.findById(dto.vehicleId);
    this.assertDateNotFuture(dto.date);

    return this.fuelLogRepository.create({
      companyId: vehicle.companyId,
      vehicleId: dto.vehicleId,
      date: dto.date,
      amountPaid: dto.amountPaid,
      gallons: dto.gallons,
      odometer: dto.odometer ?? null,
      gasStation: dto.gasStation ?? null,
      notes: dto.notes ?? null,
    });
  }

  async findAll(filters: FuelLogFilters): Promise<FuelLog[]> {
    return this.fuelLogRepository.findAll(filters);
  }

  async findById(id: string): Promise<FuelLog> {
    const fuelLog = await this.fuelLogRepository.findById(id);
    if (!fuelLog) {
      throw new NotFoundException(`Fuel log with ID "${id}" not found`);
    }
    return fuelLog;
  }

  async update(id: string, dto: UpdateFuelLogDto): Promise<FuelLog> {
    await this.findById(id);

    if (dto.date !== undefined) {
      this.assertDateNotFuture(dto.date);
    }

    return this.fuelLogRepository.update(id, {
      ...(dto.date !== undefined && { date: dto.date }),
      ...(dto.amountPaid !== undefined && { amountPaid: dto.amountPaid }),
      ...(dto.gallons !== undefined && { gallons: dto.gallons }),
      ...(dto.odometer !== undefined && { odometer: dto.odometer }),
      ...(dto.gasStation !== undefined && { gasStation: dto.gasStation }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.fuelLogRepository.softDelete(id);
  }

  getTotalExpenses(
    companyId: string,
    month: number,
    year: number,
  ): Promise<number> {
    return this.fuelLogRepository.getTotalAmount(companyId, month, year);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private assertDateNotFuture(date: string): void {
    const fuelDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (fuelDate > today) {
      throw new BadRequestException(
        `Fuel log date "${date}" cannot be in the future`,
      );
    }
  }
}
