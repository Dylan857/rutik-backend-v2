import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { StudentPayment } from '../../domain/student-payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { PAYMENT_STATUS_CASE } from '../../domain/payment-status-case.sql';
import {
  IStudentPaymentRepository,
  PaymentAmountTotals,
  PaymentFilters,
  PaymentStatusCounts,
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

  async getPaymentStatusCounts(
    companyId: string,
    billingMonth: number,
    billingYear: number,
    schoolId?: string,
  ): Promise<PaymentStatusCounts> {
    const qb = this.repository
      .createQueryBuilder('payment')
      .select(PAYMENT_STATUS_CASE, 'status')
      .addSelect('COUNT(*)', 'count')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.billingMonth = :billingMonth', { billingMonth })
      .andWhere('payment.billingYear = :billingYear', { billingYear });

    if (schoolId) {
      qb.innerJoin('payment.student', 'student').andWhere(
        'student.schoolId = :schoolId',
        { schoolId },
      );
    }

    // Group by the CASE expression itself, not the "status" alias — see
    // PAYMENT_STATUS_CASE for why the persisted status column can't be
    // trusted for GROUP BY here.
    const rows = await qb
      .groupBy(PAYMENT_STATUS_CASE)
      .getRawMany<{ status: PaymentStatus; count: string }>();

    const counts: PaymentStatusCounts = {
      paid: 0,
      partial: 0,
      pending: 0,
      overdue: 0,
      totalStudents: 0,
    };

    for (const row of rows) {
      const count = parseInt(row.count, 10);
      counts.totalStudents += count;

      if (row.status === PaymentStatus.PAID) counts.paid = count;
      else if (row.status === PaymentStatus.PARTIAL) counts.partial = count;
      else if (row.status === PaymentStatus.OVERDUE) counts.overdue = count;
      else counts.pending = count;
    }

    return counts;
  }

  async getPaymentAmountTotals(
    companyId: string,
    billingMonth: number,
    billingYear: number,
    schoolId?: string,
  ): Promise<PaymentAmountTotals> {
    const qb = this.repository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.monthlyFee), 0)', 'expected')
      .addSelect('COALESCE(SUM(payment.amountPaid), 0)', 'collected')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.billingMonth = :billingMonth', { billingMonth })
      .andWhere('payment.billingYear = :billingYear', { billingYear });

    if (schoolId) {
      qb.innerJoin('payment.student', 'student').andWhere(
        'student.schoolId = :schoolId',
        { schoolId },
      );
    }

    const raw = await qb.getRawOne<{ expected: string; collected: string }>();

    return {
      expected: parseFloat(raw?.expected ?? '0'),
      collected: parseFloat(raw?.collected ?? '0'),
    };
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
