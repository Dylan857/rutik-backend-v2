import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IVerificationCodeRepository } from '../../domain/interfaces/verification-code.repository';
import { VerificationCode } from '../../domain/verification-code.entity';
import { VerificationPurpose } from '../../domain/enums/verification-purpose.enum';

@Injectable()
export class VerificationCodeRepositoryImpl implements IVerificationCodeRepository {
  constructor(
    @InjectRepository(VerificationCode)
    private readonly repository: Repository<VerificationCode>,
  ) {}

  async create(data: Partial<VerificationCode>): Promise<VerificationCode> {
    const code = this.repository.create(data);
    return this.repository.save(code);
  }

  async findLatestByUserAndPurpose(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationCode | null> {
    return this.repository.findOne({
      where: { userId, purpose },
      order: { createdAt: 'DESC' },
    });
  }

  async findByHash(
    codeHash: string,
    purpose: VerificationPurpose,
  ): Promise<VerificationCode | null> {
    return this.repository.findOne({ where: { codeHash, purpose } });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.repository.increment({ id }, 'attempts', 1);
  }

  async deleteByUserAndPurpose(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    await this.repository.delete({ userId, purpose });
  }
}
