import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guardian } from '../../domain/guardian.entity';
import {
  GuardianFilters,
  IGuardianRepository,
} from '../../domain/interfaces/guardian.repository';

@Injectable()
export class GuardianRepositoryImpl implements IGuardianRepository {
  constructor(
    @InjectRepository(Guardian)
    private readonly repository: Repository<Guardian>,
  ) {}

  async create(data: Partial<Guardian>): Promise<Guardian> {
    const guardian = this.repository.create(data);
    return this.repository.save(guardian);
  }

  async findAll(filters: GuardianFilters): Promise<Guardian[]> {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.status) where.status = filters.status;
    if (filters.document) where.document = filters.document;
    if (filters.email) where.email = filters.email;
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Guardian | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByDocumentAndCompany(
    document: string,
    companyId: string,
  ): Promise<Guardian | null> {
    return this.repository.findOne({ where: { document, companyId } });
  }

  async findByEmailAndCompany(
    email: string,
    companyId: string,
  ): Promise<Guardian | null> {
    return this.repository.findOne({ where: { email, companyId } });
  }

  async findByUserId(userId: string): Promise<Guardian | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async update(id: string, data: Partial<Guardian>): Promise<Guardian> {
    await this.repository.update(id, data);
    return this.findById(id) as Promise<Guardian>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
