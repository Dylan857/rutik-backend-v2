import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { School } from '../domain/school.entity';
import {
  ISchoolRepository,
  SCHOOL_REPOSITORY,
} from '../domain/interfaces/school.repository';
import { CreateSchoolDto } from '../infrastructure/api/dto/create-school.dto';
import { UpdateSchoolDto } from '../infrastructure/api/dto/update-school.dto';

@Injectable()
export class SchoolService {
  constructor(
    @Inject(SCHOOL_REPOSITORY)
    private readonly schoolRepository: ISchoolRepository,
    private readonly companyService: CompanyService,
  ) {}

  async create(dto: CreateSchoolDto): Promise<School> {
    await this.companyService.findById(dto.companyId);

    const existing = await this.schoolRepository.findByNameAndCompany(
      dto.name,
      dto.companyId,
    );
    if (existing) {
      throw new ConflictException(
        `A school named "${dto.name}" already exists in this company`,
      );
    }

    return this.schoolRepository.create(dto);
  }

  async findAll(
    companyId?: string,
  ): Promise<(School & { scheduleCount: number })[]> {
    return this.schoolRepository.findAll(companyId);
  }

  async findById(id: string): Promise<School & { scheduleCount: number }> {
    const school = await this.schoolRepository.findById(id);

    if (!school) {
      throw new NotFoundException(`School with ID "${id}" not found`);
    }

    return school;
  }

  async update(id: string, dto: UpdateSchoolDto): Promise<School> {
    const current = await this.findById(id);

    if (dto.name && dto.name !== current.name) {
      const existing = await this.schoolRepository.findByNameAndCompany(
        dto.name,
        current.companyId,
      );
      if (existing) {
        throw new ConflictException(
          `A school named "${dto.name}" already exists in this company`,
        );
      }
    }

    return this.schoolRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.schoolRepository.softDelete(id);
  }
}
