import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { AuditLogsService } from '../../audit-logs/application/audit-logs.service';
import { AuditAction } from '../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../audit-logs/domain/enums/audit-entity-type.enum';
import { AuditActor } from '../../audit-logs/domain/interfaces/audit-actor.interface';
import { PaymentAccount } from '../domain/payment-account.entity';
import {
  IPaymentAccountRepository,
  PAYMENT_ACCOUNT_REPOSITORY,
} from '../domain/interfaces/payment-account.repository';
import { CreatePaymentAccountDto } from '../infrastructure/api/dto/create-payment-account.dto';
import { UpdatePaymentAccountDto } from '../infrastructure/api/dto/update-payment-account.dto';

@Injectable()
export class PaymentAccountsService {
  constructor(
    @Inject(PAYMENT_ACCOUNT_REPOSITORY)
    private readonly repository: IPaymentAccountRepository,
    private readonly companyService: CompanyService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    dto: CreatePaymentAccountDto,
    actor: AuditActor,
  ): Promise<PaymentAccount> {
    await this.companyService.findById(dto.companyId);

    const created = await this.repository.create({
      companyId: dto.companyId,
      type: dto.type,
      bankName: dto.bankName ?? null,
      accountHolder: dto.accountHolder,
      accountNumber: dto.accountNumber,
      accountTypeLabel: dto.accountTypeLabel ?? null,
      active: dto.active ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });

    await this.auditLogsService.record({
      companyId: created.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.CREATED,
      entityType: AuditEntityType.PAYMENT_ACCOUNT,
      entityId: created.id,
      description: `Se agregó la cuenta de pago ${this.describe(created)}`,
    });

    return created;
  }

  /** activeOnly=true hides inactive accounts — the guardian-facing view. */
  async findAll(companyId: string, activeOnly: boolean): Promise<PaymentAccount[]> {
    return this.repository.findAll({ companyId, activeOnly });
  }

  async findById(id: string): Promise<PaymentAccount> {
    const account = await this.repository.findById(id);
    if (!account) {
      throw new NotFoundException(`Payment account with ID "${id}" not found`);
    }
    return account;
  }

  async update(
    id: string,
    dto: UpdatePaymentAccountDto,
    actor: AuditActor,
  ): Promise<PaymentAccount> {
    await this.findById(id);
    const updated = await this.repository.update(id, dto);

    await this.auditLogsService.record({
      companyId: updated.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.UPDATED,
      entityType: AuditEntityType.PAYMENT_ACCOUNT,
      entityId: updated.id,
      description: `Se actualizó la cuenta de pago ${this.describe(updated)}`,
    });

    return updated;
  }

  async softDelete(id: string, actor: AuditActor): Promise<void> {
    const account = await this.findById(id);
    await this.repository.softDelete(id);

    await this.auditLogsService.record({
      companyId: account.companyId,
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: AuditAction.DELETED,
      entityType: AuditEntityType.PAYMENT_ACCOUNT,
      entityId: account.id,
      description: `Se eliminó la cuenta de pago ${this.describe(account)}`,
    });
  }

  private describe(account: PaymentAccount): string {
    return account.bankName ? `${account.bankName} (${account.type})` : account.type;
  }
}
