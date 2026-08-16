import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VehiclesService } from '../../vehicles/application/vehicles.service';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';
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
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateFuelLogDto, actor: AuditActor): Promise<FuelLog> {
    const vehicle = await this.vehiclesService.findById(dto.vehicleId);
    this.assertDateNotFuture(dto.date);

    const fuelLog = await this.fuelLogRepository.create({
      companyId: vehicle.companyId,
      vehicleId: dto.vehicleId,
      date: dto.date,
      amountPaid: dto.amountPaid,
      gallons: dto.gallons,
      odometer: dto.odometer ?? null,
      gasStation: dto.gasStation ?? null,
      notes: dto.notes ?? null,
    });

    await this.auditLogsService.record({
      companyId: fuelLog.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.FUEL_LOG,
      entityId: fuelLog.id,
      description: `Se registró un tanqueo de ${dto.amountPaid} para el vehículo ${vehicle.plate}`,
    });

    return fuelLog;
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

  async update(
    id: string,
    dto: UpdateFuelLogDto,
    actor: AuditActor,
  ): Promise<FuelLog> {
    await this.findById(id);

    if (dto.date !== undefined) {
      this.assertDateNotFuture(dto.date);
    }

    const updated = await this.fuelLogRepository.update(id, {
      ...(dto.date !== undefined && { date: dto.date }),
      ...(dto.amountPaid !== undefined && { amountPaid: dto.amountPaid }),
      ...(dto.gallons !== undefined && { gallons: dto.gallons }),
      ...(dto.odometer !== undefined && { odometer: dto.odometer }),
      ...(dto.gasStation !== undefined && { gasStation: dto.gasStation }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });
    const vehicle = await this.vehiclesService.findById(updated.vehicleId);

    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.FUEL_LOG,
      entityId: updated.id,
      description: `Se actualizó el tanqueo del vehículo ${vehicle.plate}`,
    });

    return updated;
  }

  async softDelete(id: string, actor: AuditActor): Promise<void> {
    const fuelLog = await this.findById(id);
    const vehicle = await this.vehiclesService.findById(fuelLog.vehicleId);
    await this.fuelLogRepository.softDelete(id);

    await this.auditLogsService.record({
      companyId: fuelLog.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.FUEL_LOG,
      entityId: fuelLog.id,
      description: `Se eliminó el tanqueo del vehículo ${vehicle.plate}`,
    });
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
