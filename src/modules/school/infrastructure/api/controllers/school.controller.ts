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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateSchoolDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SchoolResponseDto> {
    const school = await this.schoolService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SchoolResponseDto> {
    const school = await this.schoolService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(SchoolResponseDto, school, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a school' })
  @ApiNoContentResponse({ description: 'School deactivated successfully' })
  @ApiNotFoundResponse({ description: 'School not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.schoolService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
