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
import { StudentService } from '../../../application/students.service';
import { StudentStatus } from '../../../domain/enums/student-status.enum';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentResponseDto } from '../dto/student-response.dto';

@ApiTags('Students')
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enroll a new student' })
  @ApiCreatedResponse({ type: StudentResponseDto })
  @ApiNotFoundResponse({
    description: 'Company, school, or schedule not found',
  })
  @ApiBadRequestResponse({
    description:
      'School not in company, schedule not in school, or missing coordinates',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<StudentResponseDto> {
    const student = await this.studentService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(StudentResponseDto, student, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List students with optional filters' })
  @ApiOkResponse({ type: [StudentResponseDto] })
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
    name: 'status',
    required: false,
    enum: StudentStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'grade',
    required: false,
    description: 'Filter by grade (exact match)',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('status') status?: StudentStatus,
    @Query('grade') grade?: string,
  ): Promise<StudentResponseDto[]> {
    const students = await this.studentService.findAll({
      companyId,
      schoolId,
      scheduleId,
      status,
      grade,
    });
    return plainToInstance(StudentResponseDto, students, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiOkResponse({ type: StudentResponseDto })
  @ApiNotFoundResponse({ description: 'Student not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentResponseDto> {
    const student = await this.studentService.findById(id);
    return plainToInstance(StudentResponseDto, student, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a student' })
  @ApiOkResponse({ type: StudentResponseDto })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiBadRequestResponse({
    description: "New schedule does not belong to student's school",
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<StudentResponseDto> {
    const student = await this.studentService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(StudentResponseDto, student, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a student' })
  @ApiNoContentResponse({ description: 'Student deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.studentService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
