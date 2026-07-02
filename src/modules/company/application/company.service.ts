import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../../user/application/user.service';
import { UserRole } from '../../user/domain/enums/user-role.enum';
import { User } from '../../user/domain/user.entity';
import { Company } from '../domain/company.entity';
import {
  COMPANY_REPOSITORY,
  ICompanyRepository,
} from '../domain/interfaces/company.repository';
import { CreateCompanyDto } from '../infrastructure/api/dto/create-company.dto';
import { UpdateCompanyDto } from '../infrastructure/api/dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: ICompanyRepository,
    private readonly userService: UserService,
  ) {}

  async create(
    dto: CreateCompanyDto,
  ): Promise<{ company: Company; adminUser: User }> {
    // ── Company uniqueness checks ─────────────────────────────────────────────
    const [byNit, byEmail] = await Promise.all([
      this.companyRepository.findByNit(dto.nit),
      this.companyRepository.findByEmail(dto.email),
    ]);

    if (byNit) {
      throw new ConflictException(
        `A company with NIT "${dto.nit}" already exists`,
      );
    }
    if (byEmail) {
      throw new ConflictException(
        `A company with email "${dto.email}" already exists`,
      );
    }

    // ── Admin user pre-check (document) before writing anything ──────────────
    // Email will be the company email — also verified by UserService.create().
    // Document uniqueness is checked here early to give a clear error before
    // any company record is written.
    const existingByDocument = await this.userService.findByDocument(
      dto.adminDocument,
    );
    if (existingByDocument) {
      throw new ConflictException(
        `A user with document "${dto.adminDocument}" already exists`,
      );
    }

    // ── Create company ────────────────────────────────────────────────────────
    const company = await this.companyRepository.create(dto);

    // ── Create ADMIN user linked to the new company ───────────────────────────
    // The company email doubles as the admin login — one less credential to manage.
    const adminUser = await this.userService.create({
      companyId: company.id,
      role: UserRole.ADMIN,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      document: dto.adminDocument,
      email: dto.email,
      password: dto.adminPassword,
      phone: dto.adminPhone,
    });

    return { company, adminUser };
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.findAll();
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const current = await this.findById(id);

    if (dto.nit && dto.nit !== current.nit) {
      const existing = await this.companyRepository.findByNit(dto.nit);
      if (existing) {
        throw new ConflictException(
          `A company with NIT "${dto.nit}" already exists`,
        );
      }
    }

    if (dto.email && dto.email !== current.email) {
      const existing = await this.companyRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException(
          `A company with email "${dto.email}" already exists`,
        );
      }
    }

    return this.companyRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.companyRepository.softDelete(id);
  }
}
