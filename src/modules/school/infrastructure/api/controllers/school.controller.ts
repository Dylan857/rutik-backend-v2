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
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { SchoolService } from '../../../application/school.service';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { SchoolResponseDto } from '../dto/school-response.dto';

@ApiTags('Schools')
@Controller('schools')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school' })
  @ApiCreatedResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiConflictResponse({
    description: 'School name already exists within this company',
  })
  async create(@Body() dto: CreateSchoolDto): Promise<SchoolResponseDto> {
    const school = await this.schoolService.create(dto);
    return plainToInstance(SchoolResponseDto, school, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List all active schools, optionally filtered by company',
  })
  @ApiOkResponse({ type: [SchoolResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter schools by company UUID',
  })
  async findAll(
    @Query('companyId') companyId?: string,
  ): Promise<SchoolResponseDto[]> {
    const schools = await this.schoolService.findAll(companyId);
    return plainToInstance(SchoolResponseDto, schools, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school by ID' })
  @ApiOkResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'School not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SchoolResponseDto> {
    const school = await this.schoolService.findById(id);
    return plainToInstance(SchoolResponseDto, school, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a school' })
  @ApiOkResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'School not found' })
  @ApiConflictResponse({
    description: 'School name already exists within this company',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
  ): Promise<SchoolResponseDto> {
    const school = await this.schoolService.update(id, dto);
    return plainToInstance(SchoolResponseDto, school, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a school' })
  @ApiNoContentResponse({ description: 'School deactivated successfully' })
  @ApiNotFoundResponse({ description: 'School not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.schoolService.softDelete(id);
  }
}
