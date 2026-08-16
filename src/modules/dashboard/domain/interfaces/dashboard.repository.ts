import { PaymentStatus } from '../../../student-payments/domain/enums/payment-status.enum';

export interface SummaryCounts {
  students: number;
  schools: number;
  vehicles: number;
  activeRoutes: number;
}

export interface PaymentStatusCounts {
  paid: number;
  partial: number;
  pending: number;
  overdue: number;
  totalStudents: number;
}

export interface PaymentAmountTotals {
  expected: number;
  collected: number;
}

export interface UpcomingPaymentRecord {
  id: string;
  studentName: string;
  schoolName: string;
  scheduleName: string;
  amount: number;
  dueDate: string;
  daysRemaining: number;
  status: PaymentStatus;
}

// Every method is scoped by companyId. The caller (DashboardService) always
// sources it from the authenticated JWT — this repository never accepts a
// company-less query, so cross-company leakage is impossible by construction.
export interface IDashboardRepository {
  getSummaryCounts(companyId: string): Promise<SummaryCounts>;

  getPaymentStatusCounts(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<PaymentStatusCounts>;

  getPaymentAmountTotals(
    companyId: string,
    billingMonth: number,
    billingYear: number,
  ): Promise<PaymentAmountTotals>;

  getUpcomingPayments(
    companyId: string,
    billingMonth: number,
    billingYear: number,
    windowDays: number,
    limit: number,
  ): Promise<UpcomingPaymentRecord[]>;
}

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');
