import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { DriverPayment } from '../../domain/driver-payment.entity';
import { DriverPaymentStatus } from '../../domain/enums/payment-status.enum';
import {
  DriverPaymentFilters,
  IDriverPaymentRepository,
} from '../../domain/interfaces/driver-payment.repository';

@Injectable()
export class DriverPaymentRepositoryImpl implements IDriverPaymentRepository {
  constructor(
    @InjectRepository(DriverPayment)
    private readonly repository: Repository<DriverPayment>,
  ) {}

  async create(data: Partial<DriverPayment>): Promise<DriverPayment> {
    const payment = this.repository.create(data);
    return this.repository.save(payment);
  }

  async findAll(filters: DriverPaymentFilters): Promise<DriverPayment[]> {
    const base: Record<string, unknown> = {};
    if (filters.companyId) base.companyId = filters.companyId;
    if (filters.driverId) base.driverId = filters.driverId;
    if (filters.periodStart) base.periodStart = filters.periodStart;
    if (filters.periodEnd) base.periodEnd = filters.periodEnd;

    // Mirrors StudentPaymentRepositoryImpl: there is no cron sweeping stale
    // PENDING rows into OVERDUE, so filtering by OVERDUE must also include
    // stale-PENDING rows past their dueDate to match what individual reads
    // (which always recompute status live) actually return.
    const where =
      filters.status === DriverPaymentStatus.OVERDUE
        ? [
            { ...base, status: DriverPaymentStatus.OVERDUE },
            {
              ...base,
              status: DriverPaymentStatus.PENDING,
              dueDate: LessThan(new Date().toISOString().slice(0, 10)),
            },
          ]
        : { ...base, ...(filters.status && { status: filters.status }) };

    return this.repository.find({
      where,
      order: { periodEnd: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<DriverPayment | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByDriverAndPeriod(
    driverId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<DriverPayment | null> {
    return this.repository.findOne({
      where: { driverId, periodStart, periodEnd },
    });
  }

  async findLatestPeriodByDriver(
    driverId: string,
  ): Promise<{ periodStart: string; periodEnd: string } | null> {
    const latest = await this.repository.findOne({
      where: { driverId },
      order: { periodEnd: 'DESC' },
    });
    return latest
      ? { periodStart: latest.periodStart, periodEnd: latest.periodEnd }
      : null;
  }

  async update(
    id: string,
    data: Partial<DriverPayment>,
  ): Promise<DriverPayment> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<DriverPayment>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
