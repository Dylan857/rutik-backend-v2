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
  ApiBadRequestResponse,
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
import { SchoolAssignmentsService } from '../../../application/school-assignments.service';
import { AssignmentStatus } from '../../../domain/enums/assignment-status.enum';
import { CreateSchoolAssignmentDto } from '../dto/create-school-assignment.dto';
import { UpdateSchoolAssignmentDto } from '../dto/update-school-assignment.dto';
import { SchoolAssignmentResponseDto } from '../dto/school-assignment-response.dto';

@ApiTags('School Assignments')
@Controller('school-assignments')
export class SchoolAssignmentController {
  constructor(private readonly assignmentsService: SchoolAssignmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a school assignment',
    description:
      'Assigns a driver and vehicle to attend a school in a specific schedule. ' +
      'All referenced entities must belong to the same company. ' +
      'Automatically triggers a SchoolRoute sync.',
  })
  @ApiCreatedResponse({ type: SchoolAssignmentResponseDto })
  @ApiNotFoundResponse({
    description: 'Company, school, schedule, driver, or vehicle not found',
  })
  @ApiBadRequestResponse({
    description:
      'Cross-company ownership violation or schedule does not belong to school',
  })
  @ApiConflictResponse({
    description:
      'Duplicate active assignment for this school/schedule, or driver/vehicle already assigned in this schedule',
  })
  async create(
    @Body() dto: CreateSchoolAssignmentDto,
  ): Promise<SchoolAssignmentResponseDto> {
    const assignment = await this.assignmentsService.create(dto);
    return plainToInstance(SchoolAssignmentResponseDto, assignment, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List school assignments with optional filters' })
  @ApiOkResponse({ type: [SchoolAssignmentResponseDto] })
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
  @ApiQuery({
    name: 'scheduleId',
    required: false,
    description: 'Filter by schedule UUID',
  })
  @ApiQuery({
    name: 'driverId',
    required: false,
    description: 'Filter by driver UUID',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AssignmentStatus,
    description: 'Filter by status',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: AssignmentStatus,
  ): Promise<SchoolAssignmentResponseDto[]> {
    const assignments = await this.assignmentsService.findAll({
      companyId,
      schoolId,
      scheduleId,
      driverId,
      vehicleId,
      status,
    });
    return plainToInstance(SchoolAssignmentResponseDto, assignments, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school assignment by ID' })
  @ApiOkResponse({ type: SchoolAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'School assignment not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SchoolAssignmentResponseDto> {
    const assignment = await this.assignmentsService.findById(id);
    return plainToInstance(SchoolAssignmentResponseDto, assignment, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a school assignment',
    description:
      'Updates the assigned driver, vehicle, or status. ' +
      'company, school, and schedule are immutable after creation. ' +
      'Triggers a SchoolRoute sync when driver/vehicle change or assignment is deactivated.',
  })
  @ApiOkResponse({ type: SchoolAssignmentResponseDto })
  @ApiNotFoundResponse({
    description: 'School assignment, driver, or vehicle not found',
  })
  @ApiBadRequestResponse({
    description: 'New driver or vehicle does not belong to this company',
  })
  @ApiConflictResponse({
    description: 'Driver or vehicle already assigned in this schedule',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSchoolAssignmentDto,
  ): Promise<SchoolAssignmentResponseDto> {
    const assignment = await this.assignmentsService.update(id, dto);
    return plainToInstance(SchoolAssignmentResponseDto, assignment, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a school assignment',
    description:
      'Deactivates the assignment and triggers a SchoolRoute deactivation.',
  })
  @ApiNoContentResponse({ description: 'Assignment deactivated successfully' })
  @ApiNotFoundResponse({ description: 'School assignment not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.assignmentsService.softDelete(id);
  }
}
