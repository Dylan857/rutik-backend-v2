import { Driver } from '../driver.entity';
import { DriverStatus } from '../enums/driver-status.enum';
import { PaymentType } from '../enums/payment-type.enum';

export interface DriverFilters {
  companyId?: string;
  status?: DriverStatus;
  paymentType?: PaymentType;
}

export interface IDriverRepository {
  create(data: Partial<Driver>): Promise<Driver>;
  findAll(filters: DriverFilters): Promise<Driver[]>;
  findById(id: string): Promise<Driver | null>;
  findByUserId(userId: string): Promise<Driver | null>;
  findByLicenseAndCompany(
    licenseNumber: string,
    companyId: string,
  ): Promise<Driver | null>;
  update(id: string, data: Partial<Driver>): Promise<Driver>;
  softDelete(id: string): Promise<void>;
}

export const DRIVER_REPOSITORY = Symbol('DRIVER_REPOSITORY');
