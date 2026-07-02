import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../domain/company.entity';
import { ICompanyRepository } from '../../domain/interfaces/company.repository';

// PostgreSQL unique constraint violation error code
const PG_UNIQUE_VIOLATION = '23505';

function handleUniqueViolation(
  error: { code?: string; detail?: string },
  data: Partial<Company>,
): never {
  if (error.code === PG_UNIQUE_VIOLATION) {
    if (error.detail?.includes('nit')) {
      throw new ConflictException(
        `A company with NIT "${data.nit}" already exists`,
      );
    }
    if (error.detail?.includes('email')) {
      throw new ConflictException(
        `A company with email "${data.email}" already exists`,
      );
    }
    throw new ConflictException('A company with this data already exists');
  }
  throw error;
}

@Injectable()
export class CompanyRepositoryImpl implements ICompanyRepository {
  constructor(
    @InjectRepository(Company)
    private readonly repository: Repository<Company>,
  ) {}

  async create(data: Partial<Company>): Promise<Company> {
    try {
      const company = this.repository.create(data);
      return await this.repository.save(company);
    } catch (error) {
      handleUniqueViolation(error as { code?: string; detail?: string }, data);
    }
  }

  async findAll(): Promise<Company[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Company | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByNit(nit: string): Promise<Company | null> {
    return this.repository.findOne({ where: { nit } });
  }

  async findByEmail(email: string): Promise<Company | null> {
    return this.repository.findOne({ where: { email } });
  }

  async update(id: string, data: Partial<Company>): Promise<Company> {
    try {
      await this.repository.update(id, data);
    } catch (error) {
      handleUniqueViolation(error as { code?: string; detail?: string }, data);
    }
    return this.findById(id) as Promise<Company>;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
