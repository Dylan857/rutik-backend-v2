import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { StudentPayment } from '../../domain/student-payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import {
  IStudentPaymentRepository,
  PaymentFilters,
} from '../../domain/interfaces/student-payment.repository';

@Injectable()
export class StudentPaymentRepositoryImpl implements IStudentPaymentRepository {
  constructor(
    @InjectRepository(StudentPayment)
    private readonly repository: Repository<StudentPayment>,
  ) {}

  async create(data: Partial<StudentPayment>): Promise<StudentPayment> {
    const payment = this.repository.create(data);
    return this.repository.save(payment);
  }

  async findAll(filters: PaymentFilters): Promise<StudentPayment[]> {
    const base: Record<string, unknown> = {};
    if (filters.companyId) base.companyId = filters.companyId;
    if (filters.studentId) base.studentId = filters.studentId;
    if (filters.billingMonth) base.billingMonth = filters.billingMonth;
    if (filters.billingYear) base.billingYear = filters.billingYear;

    // There is no cron sweeping stale PENDING rows into OVERDUE yet (see
    // StudentPaymentsService), so a row can be "logically" overdue while
    // still stored as PENDING. When filtering by OVERDUE, also include those
    // stale-PENDING rows so the filter matches what the API actually returns
    // for individual reads (which always recompute status live).
    // TODO: remove this OR once a scheduled job persists OVERDUE transitions.
    const where =
      filters.status === PaymentStatus.OVERDUE
        ? [
            { ...base, status: PaymentStatus.OVERDUE },
            {
              ...base,
              status: PaymentStatus.PENDING,
              dueDate: LessThan(new Date().toISOString().slice(0, 10)),
            },
          ]
        : { ...base, ...(filters.status && { status: filters.status }) };

    return this.repository.find({
      where,
      order: { billingYear: 'DESC', billingMonth: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<StudentPayment | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByStudentAndPeriod(
    studentId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<StudentPayment | null> {
    return this.repository.findOne({
      where: { studentId, billingMonth, billingYear },
    });
  }

  async findByCompanyAndPeriod(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<StudentPayment[]> {
    return this.repository.find({
      where: { companyId, billingMonth, billingYear },
    });
  }

  async findLatestPeriodByCompany(
    companyId: string,
  ): Promise<{ billingMonth: number; billingYear: number } | null> {
    const latest = await this.repository.findOne({
      where: { companyId },
      order: { billingYear: 'DESC', billingMonth: 'DESC' },
    });
    return latest
      ? { billingMonth: latest.billingMonth, billingYear: latest.billingYear }
      : null;
  }

  async update(
    id: string,
    data: Partial<StudentPayment>,
  ): Promise<StudentPayment> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<StudentPayment>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
