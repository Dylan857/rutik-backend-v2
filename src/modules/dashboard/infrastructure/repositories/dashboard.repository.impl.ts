import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../../../students/domain/student.entity';
import { StudentStatus } from '../../../students/domain/enums/student-status.enum';
import { School } from '../../../school/domain/school.entity';
import { Vehicle } from '../../../vehicles/domain/vehicle.entity';
import { SchoolRoute } from '../../../school-routes/domain/school-route.entity';
import { RouteStatus } from '../../../school-routes/domain/enums/route-status.enum';
import { StudentPayment } from '../../../student-payments/domain/student-payment.entity';
import { PaymentStatus } from '../../../student-payments/domain/enums/payment-status.enum';
import { PAYMENT_STATUS_CASE } from '../../../student-payments/domain/payment-status-case.sql';
import {
  IDashboardRepository,
  PaymentAmountTotals,
  PaymentStatusCounts,
  SummaryCounts,
  UpcomingPaymentRecord,
} from '../../domain/interfaces/dashboard.repository';

@Injectable()
export class DashboardRepositoryImpl implements IDashboardRepository {
  private static readonly STATUS_CASE = PAYMENT_STATUS_CASE;

  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(SchoolRoute)
    private readonly schoolRouteRepository: Repository<SchoolRoute>,
    @InjectRepository(StudentPayment)
    private readonly paymentRepository: Repository<StudentPayment>,
  ) {}

  async getSummaryCounts(companyId: string): Promise<SummaryCounts> {
    const [students, schools, vehicles, activeRoutes] = await Promise.all([
      this.studentRepository.count({ where: { companyId } }),
      this.schoolRepository.count({ where: { companyId } }),
      this.vehicleRepository.count({ where: { companyId } }),
      this.schoolRouteRepository.count({
        where: { companyId, status: RouteStatus.ACTIVE },
      }),
    ]);

    return { students, schools, vehicles, activeRoutes };
  }

  async getPaymentStatusCounts(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<PaymentStatusCounts> {
    const rows = await this.paymentRepository
      .createQueryBuilder('payment')
      // Inner-joined so a deleted or deactivated student's payment records
      // never inflate these counts — see getPaymentAmountTotals below.
      .innerJoin('payment.student', 'student', 'student.deletedAt IS NULL')
      .select(DashboardRepositoryImpl.STATUS_CASE, 'status')
      .addSelect('COUNT(*)', 'count')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.billingMonth = :billingMonth', { billingMonth })
      .andWhere('payment.billingYear = :billingYear', { billingYear })
      .andWhere('student.status = :activeStatus', {
        activeStatus: StudentStatus.ACTIVE,
      })
      // Group by the CASE expression itself, not the "status" alias — the
      // table also has a real (and possibly stale, see STATUS_CASE comment)
      // `status` column, so `GROUP BY status` resolves to that column instead
      // of the computed alias and Postgres rejects amountPaid/monthlyFee in
      // the select list as not functionally dependent on it.
      .groupBy(DashboardRepositoryImpl.STATUS_CASE)
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
  ): Promise<PaymentAmountTotals> {
    const raw = await this.paymentRepository
      .createQueryBuilder('payment')
      // Same join/status-filter as getPaymentStatusCounts, for the same
      // reason: a deleted or deactivated student's payment shouldn't count
      // toward expected/collected totals.
      .innerJoin('payment.student', 'student', 'student.deletedAt IS NULL')
      .select('COALESCE(SUM(payment.monthlyFee), 0)', 'expected')
      .addSelect('COALESCE(SUM(payment.amountPaid), 0)', 'collected')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.billingMonth = :billingMonth', { billingMonth })
      .andWhere('payment.billingYear = :billingYear', { billingYear })
      .andWhere('student.status = :activeStatus', {
        activeStatus: StudentStatus.ACTIVE,
      })
      .getRawOne<{ expected: string; collected: string }>();

    return {
      expected: parseFloat(raw?.expected ?? '0'),
      collected: parseFloat(raw?.collected ?? '0'),
    };
  }

  async getUpcomingPayments(
    companyId: string,
    billingMonth: number,
    billingYear: number,
    windowDays: number,
    limit: number,
  ): Promise<UpcomingPaymentRecord[]> {
    const rows = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.student', 'student', 'student.deletedAt IS NULL')
      .innerJoin('student.school', 'school', 'school.deletedAt IS NULL')
      .innerJoin('student.schedule', 'schedule', 'schedule.deletedAt IS NULL')
      .select('payment.id', 'id')
      .addSelect('payment.dueDate', 'dueDate')
      .addSelect('(payment.monthlyFee - payment.amountPaid)', 'amount')
      .addSelect('(payment.dueDate - CURRENT_DATE)', 'daysRemaining')
      .addSelect(DashboardRepositoryImpl.STATUS_CASE, 'status')
      .addSelect("student.firstName || ' ' || student.lastName", 'studentName')
      .addSelect('school.name', 'schoolName')
      .addSelect('schedule.name', 'scheduleName')
      .where('payment.companyId = :companyId', { companyId })
      .andWhere('payment.billingMonth = :billingMonth', { billingMonth })
      .andWhere('payment.billingYear = :billingYear', { billingYear })
      .andWhere(
        `(
          ${DashboardRepositoryImpl.STATUS_CASE} = :overdueStatus
          OR (
            ${DashboardRepositoryImpl.STATUS_CASE} IN (:...duePendingStatuses)
            AND payment.dueDate <= CURRENT_DATE + (:windowDays)::integer
          )
        )`,
        {
          overdueStatus: PaymentStatus.OVERDUE,
          duePendingStatuses: [PaymentStatus.PENDING, PaymentStatus.PARTIAL],
          windowDays,
        },
      )
      // Priority bucket first (OVERDUE = 0, everything else = 1), then by due
      // date ascending — oldest-overdue-first within the OVERDUE bucket and
      // soonest-due-first within the pending/partial bucket.
      .orderBy(
        `CASE WHEN ${DashboardRepositoryImpl.STATUS_CASE} = '${PaymentStatus.OVERDUE}' THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy('payment.dueDate', 'ASC')
      .limit(limit)
      .getRawMany<{
        id: string;
        dueDate: string;
        amount: string;
        daysRemaining: string;
        status: PaymentStatus;
        studentName: string;
        schoolName: string;
        scheduleName: string;
      }>();

    return rows.map((row) => ({
      id: row.id,
      studentName: row.studentName,
      schoolName: row.schoolName,
      scheduleName: row.scheduleName,
      amount: parseFloat(row.amount),
      dueDate: row.dueDate,
      daysRemaining: parseInt(row.daysRemaining, 10),
      status: row.status,
    }));
  }
}
