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
  ApiBadRequestResponse,
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
import { SchoolScheduleService } from '../../../application/school-schedules.service';
import { CreateSchoolScheduleDto } from '../dto/create-school-schedule.dto';
import { UpdateSchoolScheduleDto } from '../dto/update-school-schedule.dto';
import { SchoolScheduleResponseDto } from '../dto/school-schedule-response.dto';

@ApiTags('School Schedules')
@Controller('school-schedules')
export class SchoolScheduleController {
  constructor(private readonly scheduleService: SchoolScheduleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school schedule' })
  @ApiCreatedResponse({ type: SchoolScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'Company or school not found' })
  @ApiBadRequestResponse({
    description: 'School does not belong to company, or startTime >= endTime',
  })
  @ApiConflictResponse({
    description: 'Schedule name already exists for this school',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateSchoolScheduleDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SchoolScheduleResponseDto> {
    const schedule = await this.scheduleService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(SchoolScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({
    summary:
      'List all active schedules, optionally filtered by company or school',
  })
  @ApiOkResponse({ type: [SchoolScheduleResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'schoolId',
    required: false,
    description: 'Filter by school UUID',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('schoolId') schoolId?: string,
  ): Promise<SchoolScheduleResponseDto[]> {
    const schedules = await this.scheduleService.findAll({
      companyId,
      schoolId,
    });
    return plainToInstance(SchoolScheduleResponseDto, schedules, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school schedule by ID' })
  @ApiOkResponse({ type: SchoolScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'School schedule not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SchoolScheduleResponseDto> {
    const schedule = await this.scheduleService.findById(id);
    return plainToInstance(SchoolScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a school schedule' })
  @ApiOkResponse({ type: SchoolScheduleResponseDto })
  @ApiNotFoundResponse({ description: 'School schedule not found' })
  @ApiBadRequestResponse({ description: 'startTime >= endTime' })
  @ApiConflictResponse({
    description: 'Schedule name already exists for this school',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolScheduleDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<SchoolScheduleResponseDto> {
    const schedule = await this.scheduleService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(SchoolScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a school schedule' })
  @ApiNoContentResponse({ description: 'Schedule deactivated successfully' })
  @ApiNotFoundResponse({ description: 'School schedule not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.scheduleService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
