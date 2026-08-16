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
import { StudentGuardianService } from '../../../application/student-guardians.service';
import { RelationshipType } from '../../../domain/enums/relationship-type.enum';
import { CreateStudentGuardianDto } from '../dto/create-student-guardian.dto';
import { UpdateStudentGuardianDto } from '../dto/update-student-guardian.dto';
import { StudentGuardianResponseDto } from '../dto/student-guardian-response.dto';

@ApiTags('Student Guardians')
@Controller('student-guardians')
export class StudentGuardianController {
  constructor(
    private readonly studentGuardianService: StudentGuardianService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a guardian to a student' })
  @ApiCreatedResponse({ type: StudentGuardianResponseDto })
  @ApiNotFoundResponse({ description: 'Student or guardian not found' })
  @ApiBadRequestResponse({
    description: 'Student and guardian do not belong to the same company',
  })
  @ApiConflictResponse({
    description: 'This student-guardian relationship already exists',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateStudentGuardianDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<StudentGuardianResponseDto> {
    const relation = await this.studentGuardianService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(StudentGuardianResponseDto, relation, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List student-guardian relationships with optional filters',
  })
  @ApiOkResponse({ type: [StudentGuardianResponseDto] })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description: 'Filter by student UUID',
  })
  @ApiQuery({
    name: 'guardianId',
    required: false,
    description: 'Filter by guardian UUID',
  })
  @ApiQuery({
    name: 'relationshipType',
    required: false,
    enum: RelationshipType,
    description: 'Filter by relationship type',
  })
  @ApiQuery({
    name: 'isPrimary',
    required: false,
    type: Boolean,
    description: 'Filter by primary status (true | false)',
  })
  async findAll(
    @Query('studentId') studentId?: string,
    @Query('guardianId') guardianId?: string,
    @Query('relationshipType') relationshipType?: RelationshipType,
    @Query('isPrimary') isPrimaryStr?: string,
  ): Promise<StudentGuardianResponseDto[]> {
    const isPrimary =
      isPrimaryStr !== undefined ? isPrimaryStr === 'true' : undefined;
    const relations = await this.studentGuardianService.findAll({
      studentId,
      guardianId,
      relationshipType,
      isPrimary,
    });
    return plainToInstance(StudentGuardianResponseDto, relations, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a student-guardian relationship by ID' })
  @ApiOkResponse({ type: StudentGuardianResponseDto })
  @ApiNotFoundResponse({ description: 'Relationship not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentGuardianResponseDto> {
    const relation = await this.studentGuardianService.findById(id);
    return plainToInstance(StudentGuardianResponseDto, relation, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a student-guardian relationship' })
  @ApiOkResponse({ type: StudentGuardianResponseDto })
  @ApiNotFoundResponse({ description: 'Relationship not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentGuardianDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<StudentGuardianResponseDto> {
    const relation = await this.studentGuardianService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(StudentGuardianResponseDto, relation, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a student-guardian relationship' })
  @ApiNoContentResponse({ description: 'Relationship removed successfully' })
  @ApiNotFoundResponse({ description: 'Relationship not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.studentGuardianService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
