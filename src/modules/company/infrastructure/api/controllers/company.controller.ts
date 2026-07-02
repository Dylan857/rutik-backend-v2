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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CompanyService } from '../../../application/company.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyResponseDto } from '../dto/company-response.dto';
import { CompanyWithAdminResponseDto } from '../dto/company-with-admin-response.dto';
import { UserResponseDto } from '../../../../user/infrastructure/api/dto/user-response.dto';

@ApiTags('Companies')
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
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompanyResponseDto> {
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
