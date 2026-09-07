import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Company } from '../../company/domain/company.entity';
import { PaymentAccountType } from './enums/payment-account-type.enum';

// A company-configured destination for manual transfers (Nequi, Daviplata,
// or a bank account) that guardians see and pick from when reporting a
// payment. Company-admin managed — never hardcoded in the client apps.
@Entity('payment_accounts')
export class PaymentAccount extends BaseEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'enum', enum: PaymentAccountType })
  type: PaymentAccountType;

  // Only meaningful when type = BANK_TRANSFER (e.g. "Bancolombia", "Davivienda").
  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true, default: null })
  bankName: string | null;

  @Column({ name: 'account_holder', type: 'varchar', length: 255 })
  accountHolder: string;

  @Column({ name: 'account_number', type: 'varchar', length: 100 })
  accountNumber: string;

  // e.g. "Ahorros", "Corriente" — only meaningful for BANK_TRANSFER.
  @Column({ name: 'account_type_label', type: 'varchar', length: 50, nullable: true, default: null })
  accountTypeLabel: string | null;

  // Inactive accounts stay in the table (payment history may reference them
  // via paymentAccountId) but are hidden from the guardian-facing list.
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'display_order', type: 'smallint', default: 0 })
  displayOrder: number;
}
