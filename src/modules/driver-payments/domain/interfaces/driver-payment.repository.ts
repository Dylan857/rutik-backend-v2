import { DriverPayment } from '../driver-payment.entity';
import { DriverPaymentStatus } from '../enums/payment-status.enum';

export interface DriverPaymentFilters {
  companyId?: string;
  driverId?: string;
  status?: DriverPaymentStatus;
  // Exact-match on the frozen period columns — used by the frontend to
  // detect an existing record for a driver+period combo before creating a
  // duplicate (mirrors the studentId+billingMonth+billingYear lookup).
  periodStart?: string;
  periodEnd?: string;
}

export interface IDriverPaymentRepository {
  create(data: Partial<DriverPayment>): Promise<DriverPayment>;
  findAll(filters: DriverPaymentFilters): Promise<DriverPayment[]>;
  findById(id: string): Promise<DriverPayment | null>;
  // Used to enforce the no-duplicate-per-driver-period rule
  findByDriverAndPeriod(
    driverId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<DriverPayment | null>;
  // Most recent period the driver has ever been paid for, or null if the
  // driver has no payment history at all. Used by generateNextPaymentCycle
  // to decide which period to open next (see payment-period.util.ts).
  findLatestPeriodByDriver(
    driverId: string,
  ): Promise<{ periodStart: string; periodEnd: string } | null>;
  update(id: string, data: Partial<DriverPayment>): Promise<DriverPayment>;
  softDelete(id: string): Promise<void>;
}

export const DRIVER_PAYMENT_REPOSITORY = Symbol('DRIVER_PAYMENT_REPOSITORY');
