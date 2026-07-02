import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../domain/interfaces/user.repository';
import { User } from '../../domain/user.entity';

const PG_UNIQUE_VIOLATION = '23505';

function handleUniqueViolation(
  error: { code?: string; detail?: string },
  data: Partial<User>,
): never {
  if (error.code === PG_UNIQUE_VIOLATION) {
    if (error.detail?.includes('email')) {
      throw new ConflictException(
        `A user with email "${data.email}" already exists`,
      );
    }
    if (error.detail?.includes('document')) {
      throw new ConflictException(
        `A user with document "${data.document}" already exists`,
      );
    }
    throw new ConflictException('A user with this data already exists');
  }
  throw error;
}

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    try {
      const user = this.repository.create(data);
      return await this.repository.save(user);
    } catch (error) {
      handleUniqueViolation(error as { code?: string; detail?: string }, data);
    }
  }

  async findAll(companyId?: string): Promise<User[]> {
    const where = companyId ? { companyId } : {};
    return this.repository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByDocument(document: string): Promise<User | null> {
    return this.repository.findOne({ where: { document } });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      await this.repository.update(id, data);
    } catch (error) {
      handleUniqueViolation(error as { code?: string; detail?: string }, data);
    }
    return this.findById(id) as Promise<User>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, { lastLoginAt: new Date() });
  }
}
