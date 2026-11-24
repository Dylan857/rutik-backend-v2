import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { GuardianMessage } from '../../domain/guardian-message.entity';
import {
  GuardianMessageFilters,
  IGuardianMessageRepository,
} from '../../domain/interfaces/guardian-message.repository';

@Injectable()
export class GuardianMessageRepositoryImpl implements IGuardianMessageRepository {
  constructor(
    @InjectRepository(GuardianMessage)
    private readonly repository: Repository<GuardianMessage>,
  ) {}

  async create(data: Partial<GuardianMessage>): Promise<GuardianMessage> {
    const message = this.repository.create(data);
    const saved = await this.repository.save(message);
    return this.findById(saved.id) as Promise<GuardianMessage>;
  }

  async findAll(filters: GuardianMessageFilters): Promise<GuardianMessage[]> {
    const where: FindOptionsWhere<GuardianMessage> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.guardianUserId) where.guardianUserId = filters.guardianUserId;
    if (filters.status) where.status = filters.status;

    return this.repository.find({
      where,
      relations: { guardianUser: true, student: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<GuardianMessage | null> {
    return this.repository.findOne({
      where: { id },
      relations: { guardianUser: true, student: true },
    });
  }

  async update(
    id: string,
    data: Partial<GuardianMessage>,
  ): Promise<GuardianMessage> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<GuardianMessage>;
  }
}
