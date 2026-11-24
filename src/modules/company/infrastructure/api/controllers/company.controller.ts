import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { assertCompanyAccess } from '../../../../../common/utils/company-scope';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { CompanyService } from '../../../application/company.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';
import { CompanyWithAdminResponseDto } from '../dto/company-with-admin-response.dto';
import { UserResponseDto } from '../../../../user/infrastructure/api/dto/user-response.dto';

@ApiTags('Companies')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new company (tenant)',
    description:
      'Creates the company and automatically provisions an ADMIN user using the company email. ' +
      'Returns both the company record and the created admin user.',
  })
  @ApiCreatedResponse({ type: CompanyWithAdminResponseDto })
  @ApiConflictResponse({
    description: 'NIT, email, or admin document already registered',
  })
  async create(
    @Body() dto: CreateCompanyDto,
  ): Promise<CompanyWithAdminResponseDto> {
    const { company, adminUser } = await this.companyService.create(dto);
    return {
      company: plainToInstance(CompanyResponseDto, company, {
        excludeExtraneousValues: true,
      }),
      adminUser: plainToInstance(UserResponseDto, adminUser, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all active companies' })
  @ApiOkResponse({ type: [CompanyResponseDto] })
  async findAll(): Promise<CompanyResponseDto[]> {
    const companies = await this.companyService.findAll();
    return plainToInstance(CompanyResponseDto, companies, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get a company by ID',
    description: 'ADMIN can only read its own company.',
  })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<CompanyResponseDto> {
    assertCompanyAccess(currentUser, id);
    const company = await this.companyService.findById(id);
    return plainToInstance(CompanyResponseDto, company, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company' })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiConflictResponse({ description: 'NIT or email already registered' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    const company = await this.companyService.update(id, dto);
    return plainToInstance(CompanyResponseDto, company, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a company' })
  @ApiNoContentResponse({ description: 'Company deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.companyService.softDelete(id);
  }
}
