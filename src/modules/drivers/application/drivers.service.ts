import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyService } from '../../company/application/company.service';
import { UserService } from '../../user/application/user.service';
import { UserRole } from '../../user/domain/enums/user-role.enum';
import { Driver } from '../domain/driver.entity';
import {
  DriverFilters,
  DRIVER_REPOSITORY,
  IDriverRepository,
} from '../domain/interfaces/driver.repository';
import { CreateDriverDto } from '../infrastructure/api/dto/create-driver.dto';
import { UpdateDriverDto } from '../infrastructure/api/dto/update-driver.dto';

@Injectable()
export class DriverService {
  constructor(
    @Inject(DRIVER_REPOSITORY)
    private readonly driverRepository: IDriverRepository,
    private readonly companyService: CompanyService,
    private readonly userService: UserService,
  ) {}

  async create(dto: CreateDriverDto): Promise<Driver> {
    await this.companyService.findById(dto.companyId);

    await this.assertLicenseAvailable(dto.licenseNumber, dto.companyId);
    this.assertLicenseNotExpired(dto.licenseExpirationDate);

    // Auto-create the User with role DRIVER. companyId and role are set by us,
    // not by the client, guaranteeing both constraints are always satisfied.
    const user = await this.userService.create({
      companyId: dto.companyId,
      role: UserRole.DRIVER,
      firstName: dto.firstName,
      lastName: dto.lastName,
      document: dto.document,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
    });

    return this.driverRepository.create({
      companyId: dto.companyId,
      userId: user.id,
      licenseNumber: dto.licenseNumber,
      licenseCategory: dto.licenseCategory,
      licenseExpirationDate: dto.licenseExpirationDate,
      hireDate: dto.hireDate,
      salary: dto.salary,
      paymentType: dto.paymentType,
      status: dto.status,
      observations: dto.observations,
    });
  }

  async findAll(filters: DriverFilters): Promise<Driver[]> {
    return this.driverRepository.findAll(filters);
  }

  async findById(id: string): Promise<Driver> {
    const driver = await this.driverRepository.findById(id);

    if (!driver) {
      throw new NotFoundException(`Driver with ID "${id}" not found`);
    }

    return driver;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const current = await this.findById(id);

    if (dto.licenseNumber && dto.licenseNumber !== current.licenseNumber) {
      await this.assertLicenseAvailable(
        dto.licenseNumber,
        current.companyId,
        id,
      );
    }

    if (
      dto.licenseExpirationDate &&
      dto.licenseExpirationDate !== current.licenseExpirationDate
    ) {
      this.assertLicenseNotExpired(dto.licenseExpirationDate);
    }

    return this.driverRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.driverRepository.softDelete(id);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async assertLicenseAvailable(
    licenseNumber: string,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.driverRepository.findByLicenseAndCompany(
      licenseNumber,
      companyId,
    );
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `License number "${licenseNumber}" is already registered in this company`,
      );
    }
  }

  private assertLicenseNotExpired(licenseExpirationDate: string): void {
    const expiration = new Date(licenseExpirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiration <= today) {
      throw new BadRequestException(
        `License expiration date "${licenseExpirationDate}" must be a future date`,
      );
    }
  }
}
