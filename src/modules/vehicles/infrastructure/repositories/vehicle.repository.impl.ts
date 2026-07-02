import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Vehicle } from '../../domain/vehicle.entity';
import {
  IVehicleRepository,
  VehicleFilters,
} from '../../domain/interfaces/vehicle.repository';

@Injectable()
export class VehicleRepositoryImpl implements IVehicleRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repository: Repository<Vehicle>,
  ) {}

  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    const vehicle = this.repository.create(data);
    return this.repository.save(vehicle);
  }

  async findAll(filters: VehicleFilters): Promise<Vehicle[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.vehicleType) where.vehicleType = filters.vehicleType;
    if (filters.status) where.status = filters.status;
    // plate supports partial match (case-insensitive) for usability
    if (filters.plate) where.plate = ILike(`%${filters.plate}%`);
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByPlateAndCompany(
    plate: string,
    companyId: string,
  ): Promise<Vehicle | null> {
    return this.repository.findOne({ where: { plate, companyId } });
  }

  async update(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<Vehicle>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
