import { StudentPayment } from '../student-payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

export interface PaymentFilters {
  companyId?: string;
  studentId?: string;
  billingMonth?: number;
  billingYear?: number;
  status?: PaymentStatus;
}

export interface IStudentPaymentRepository {
  create(data: Partial<StudentPayment>): Promise<StudentPayment>;
  findAll(filters: PaymentFilters): Promise<StudentPayment[]>;
  findById(id: string): Promise<StudentPayment | null>;
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
  update(id: string, data: Partial<StudentPayment>): Promise<StudentPayment>;
  softDelete(id: string): Promise<void>;
}

export const STUDENT_PAYMENT_REPOSITORY = Symbol('STUDENT_PAYMENT_REPOSITORY');
