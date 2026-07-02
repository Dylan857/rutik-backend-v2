import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../domain/driver.entity';
import {
  DriverFilters,
  IDriverRepository,
} from '../../domain/interfaces/driver.repository';

@Injectable()
export class DriverRepositoryImpl implements IDriverRepository {
  constructor(
    @InjectRepository(Driver)
    private readonly repository: Repository<Driver>,
  ) {}

  async create(data: Partial<Driver>): Promise<Driver> {
    const driver = this.repository.create(data);
    return this.repository.save(driver);
  }

  async findAll(filters: DriverFilters): Promise<Driver[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.status) where.status = filters.status;
    if (filters.paymentType) where.paymentType = filters.paymentType;
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Driver | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Driver | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async findByLicenseAndCompany(
    licenseNumber: string,
    companyId: string,
  ): Promise<Driver | null> {
    return this.repository.findOne({ where: { licenseNumber, companyId } });
  }

  async update(id: string, data: Partial<Driver>): Promise<Driver> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<Driver>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
