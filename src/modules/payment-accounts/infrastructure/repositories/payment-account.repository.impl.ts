import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentAccount } from '../../domain/payment-account.entity';
import {
  IPaymentAccountRepository,
  PaymentAccountFilters,
} from '../../domain/interfaces/payment-account.repository';

@Injectable()
export class PaymentAccountRepositoryImpl implements IPaymentAccountRepository {
  constructor(
    @InjectRepository(PaymentAccount)
    private readonly repository: Repository<PaymentAccount>,
  ) {}

  async create(data: Partial<PaymentAccount>): Promise<PaymentAccount> {
    const account = this.repository.create(data);
    return this.repository.save(account);
  }

  async findAll(filters: PaymentAccountFilters): Promise<PaymentAccount[]> {
    return this.repository.find({
      where: {
        companyId: filters.companyId,
        ...(filters.activeOnly && { active: true }),
      },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<PaymentAccount | null> {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<PaymentAccount>): Promise<PaymentAccount> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<PaymentAccount>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
