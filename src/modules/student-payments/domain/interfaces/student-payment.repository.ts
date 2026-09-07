import { StudentPayment } from '../student-payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

export interface PaymentFilters {
  companyId?: string;
  studentId?: string;
  billingMonth?: number;
  billingYear?: number;
  status?: PaymentStatus;
}

export interface PaymentStatusCounts {
  paid: number;
  partial: number;
  pending: number;
  overdue: number;
  inReview: number;
  totalStudents: number;
}

export interface PaymentAmountTotals {
  expected: number;
  collected: number;
}

export interface IStudentPaymentRepository {
  create(data: Partial<StudentPayment>): Promise<StudentPayment>;
  findAll(filters: PaymentFilters): Promise<StudentPayment[]>;
  findById(id: string): Promise<StudentPayment | null>;
  // Status counts (paid/partial/pending/overdue) for a company/period,
  // optionally narrowed to a single school via a join on student.schoolId.
  getPaymentStatusCounts(
    companyId: string,
    billingMonth: number,
    billingYear: number,
    schoolId?: string,
  ): Promise<PaymentStatusCounts>;
  // Expected (monthlyFee sum) vs collected (amountPaid sum) for a
  // company/period, optionally narrowed to a single school.
  getPaymentAmountTotals(
    companyId: string,
    billingMonth: number,
    billingYear: number,
    schoolId?: string,
  ): Promise<PaymentAmountTotals>;
  // Used to enforce the no-duplicate-per-student-month-year rule
  findByStudentAndPeriod(
    studentId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<StudentPayment | null>;
  // Batch lookup: returns all existing payments for a company in a given month/year.
  // Used by generateMonthlyPayments to skip students that already have a record.
  findByCompanyAndPeriod(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<StudentPayment[]>;
  // Most recent billing period the company has ever been billed for, or null
  // if it has no payment history at all. Used by generateNextBillingCycle to
  // decide, per company, which period to open next (see resolveBillingPeriodForCompany).
  findLatestPeriodByCompany(
    companyId: string,
  ): Promise<{ billingMonth: number; billingYear: number } | null>;
  update(id: string, data: Partial<StudentPayment>): Promise<StudentPayment>;
  softDelete(id: string): Promise<void>;
}

export const STUDENT_PAYMENT_REPOSITORY = Symbol('STUDENT_PAYMENT_REPOSITORY');
