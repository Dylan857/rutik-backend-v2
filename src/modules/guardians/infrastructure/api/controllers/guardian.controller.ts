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
import { GuardianService } from '../../../application/guardians.service';
import { GuardianStatus } from '../../../domain/enums/guardian-status.enum';
import { CreateGuardianDto } from '../dto/create-guardian.dto';
import { UpdateGuardianDto } from '../dto/update-guardian.dto';
import { GuardianResponseDto } from '../dto/guardian-response.dto';

@ApiTags('Guardians')
@Controller('guardians')
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new guardian' })
  @ApiCreatedResponse({ type: GuardianResponseDto })
  @ApiNotFoundResponse({ description: 'Company or user not found' })
  @ApiBadRequestResponse({ description: 'User does not belong to the company' })
  @ApiConflictResponse({
    description:
      'Document, email, or userId already in use within this company',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateGuardianDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GuardianResponseDto> {
    const guardian = await this.guardianService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(GuardianResponseDto, guardian, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List guardians with optional filters' })
  @ApiOkResponse({ type: [GuardianResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: GuardianStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'document',
    required: false,
    description: 'Filter by document (exact match)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter by email (exact match)',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: GuardianStatus,
    @Query('document') document?: string,
    @Query('email') email?: string,
  ): Promise<GuardianResponseDto[]> {
    const guardians = await this.guardianService.findAll({
      companyId,
      status,
      document,
      email,
    });
    return plainToInstance(GuardianResponseDto, guardians, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a guardian by ID' })
  @ApiOkResponse({ type: GuardianResponseDto })
  @ApiNotFoundResponse({ description: 'Guardian not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GuardianResponseDto> {
    const guardian = await this.guardianService.findById(id);
    return plainToInstance(GuardianResponseDto, guardian, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a guardian' })
  @ApiOkResponse({ type: GuardianResponseDto })
  @ApiNotFoundResponse({ description: 'Guardian or user not found' })
  @ApiBadRequestResponse({ description: 'User does not belong to the company' })
  @ApiConflictResponse({
    description:
      'Document, email, or userId already in use within this company',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuardianDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GuardianResponseDto> {
    const guardian = await this.guardianService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(GuardianResponseDto, guardian, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a guardian' })
  @ApiNoContentResponse({ description: 'Guardian deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Guardian not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.guardianService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
