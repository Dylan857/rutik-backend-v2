import { PaymentAccount } from '../payment-account.entity';

export interface PaymentAccountFilters {
  companyId: string;
  activeOnly?: boolean;
}

export interface IPaymentAccountRepository {
  create(data: Partial<PaymentAccount>): Promise<PaymentAccount>;
  findAll(filters: PaymentAccountFilters): Promise<PaymentAccount[]>;
  findById(id: string): Promise<PaymentAccount | null>;
  update(id: string, data: Partial<PaymentAccount>): Promise<PaymentAccount>;
  softDelete(id: string): Promise<void>;
}

export const PAYMENT_ACCOUNT_REPOSITORY = Symbol('PAYMENT_ACCOUNT_REPOSITORY');
