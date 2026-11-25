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
import {
  assertCompanyAccess,
  resolveCompanyScope,
} from '../../../../../common/utils/company-scope';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { SchoolService } from '../../../application/school.service';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { SchoolResponseDto } from '../dto/school-response.dto';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';

@ApiTags('Schools')
@Controller('schools')
// Admin panel only — guardians and drivers use their own scoped
// endpoints (/student-guardians/me, /student-absences, /driver, /me).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
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
    @CurrentUser() currentUser: JwtPayload,
    @Query('companyId') companyId?: string,
  ): Promise<SchoolResponseDto[]> {
    const schools = await this.schoolService.findAll(
      resolveCompanyScope(currentUser, companyId),
    );
    return plainToInstance(SchoolResponseDto, schools, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a school by ID' })
  @ApiOkResponse({ type: SchoolResponseDto })
  @ApiNotFoundResponse({ description: 'School not found' })
  async findById(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SchoolResponseDto> {
    const school = await this.schoolService.findById(id);
    assertCompanyAccess(currentUser, school.companyId);
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
