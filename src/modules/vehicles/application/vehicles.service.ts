import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { Vehicle } from '../domain/vehicle.entity';
import {
  IVehicleRepository,
  VehicleFilters,
  VEHICLE_REPOSITORY,
} from '../domain/interfaces/vehicle.repository';
import { CreateVehicleDto } from '../infrastructure/api/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../infrastructure/api/dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehicleRepository: IVehicleRepository,
    private readonly companyService: CompanyService,
  ) {}

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    await this.companyService.findById(dto.companyId);

    await this.assertPlateAvailable(dto.plate, dto.companyId);
    this.assertYearValid(dto.year);
    this.assertSoatNotExpired(dto.soatExpirationDate);
    this.assertTechnicalInspectionNotExpired(
      dto.technicalInspectionExpirationDate,
    );

    return this.vehicleRepository.create({
      companyId: dto.companyId,
      plate: dto.plate,
      brand: dto.brand,
      model: dto.model,
      year: dto.year,
      color: dto.color,
      vehicleType: dto.vehicleType,
      capacity: dto.capacity,
      soatNumber: dto.soatNumber,
      soatExpirationDate: dto.soatExpirationDate,
      technicalInspectionNumber: dto.technicalInspectionNumber,
      technicalInspectionExpirationDate: dto.technicalInspectionExpirationDate,
      currentMileage: dto.currentMileage ?? 0,
      status: dto.status,
      observations: dto.observations ?? null,
    });
  }

  async findAll(filters: VehicleFilters): Promise<Vehicle[]> {
    return this.vehicleRepository.findAll(filters);
  }

  async findById(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findById(id);

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID "${id}" not found`);
    }

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const current = await this.findById(id);

    if (dto.plate && dto.plate !== current.plate) {
      await this.assertPlateAvailable(dto.plate, current.companyId, id);
    }

    if (dto.year !== undefined) {
      this.assertYearValid(dto.year);
    }

    if (
      dto.soatExpirationDate &&
      dto.soatExpirationDate !== current.soatExpirationDate
    ) {
      this.assertSoatNotExpired(dto.soatExpirationDate);
    }

    if (
      dto.technicalInspectionExpirationDate &&
      dto.technicalInspectionExpirationDate !==
        current.technicalInspectionExpirationDate
    ) {
      this.assertTechnicalInspectionNotExpired(
        dto.technicalInspectionExpirationDate,
      );
    }

    return this.vehicleRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.vehicleRepository.softDelete(id);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async assertPlateAvailable(
    plate: string,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.vehicleRepository.findByPlateAndCompany(
      plate,
      companyId,
    );
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Plate "${plate}" is already registered in this company`,
      );
    }
  }

  private assertYearValid(year: number): void {
    const maxYear = new Date().getFullYear() + 1;
    if (year > maxYear) {
      throw new BadRequestException(
        `Vehicle year "${year}" cannot exceed the current year + 1 (${maxYear})`,
      );
    }
  }

  private assertSoatNotExpired(soatExpirationDate: string): void {
    const expiration = new Date(soatExpirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiration <= today) {
      throw new BadRequestException(
        `SOAT expiration date "${soatExpirationDate}" must be a future date`,
      );
    }
  }

  private assertTechnicalInspectionNotExpired(
    technicalInspectionExpirationDate: string,
  ): void {
    const expiration = new Date(technicalInspectionExpirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiration <= today) {
      throw new BadRequestException(
        `Technical inspection expiration date "${technicalInspectionExpirationDate}" must be a future date`,
      );
    }
  }
}
