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
import { DriverService } from '../../../application/drivers.service';
import { DriverStatus } from '../../../domain/enums/driver-status.enum';
import { PaymentType } from '../../../domain/enums/payment-type.enum';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import { DriverResponseDto } from '../dto/driver-response.dto';

@ApiTags('Drivers')
@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new driver',
    description:
      'Creates a User account with role DRIVER and the associated driver profile in one request.',
  })
  @ApiCreatedResponse({ type: DriverResponseDto })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiBadRequestResponse({
    description: 'License expiration date is not a future date',
  })
  @ApiConflictResponse({
    description: 'Email, document, or license number already in use',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateDriverDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverResponseDto> {
    const driver = await this.driverService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(DriverResponseDto, driver, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List drivers with optional filters' })
  @ApiOkResponse({ type: [DriverResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DriverStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'paymentType',
    required: false,
    enum: PaymentType,
    description: 'Filter by payment type',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('status') status?: DriverStatus,
    @Query('paymentType') paymentType?: PaymentType,
  ): Promise<DriverResponseDto[]> {
    const drivers = await this.driverService.findAll({
      companyId,
      status,
      paymentType,
    });
    return plainToInstance(DriverResponseDto, drivers, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a driver by ID' })
  @ApiOkResponse({ type: DriverResponseDto })
  @ApiNotFoundResponse({ description: 'Driver not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverResponseDto> {
    const driver = await this.driverService.findById(id);
    return plainToInstance(DriverResponseDto, driver, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a driver profile',
    description:
      'Updates driver-specific fields only. Personal info is updated via PATCH /users/:userId.',
  })
  @ApiOkResponse({ type: DriverResponseDto })
  @ApiNotFoundResponse({ description: 'Driver not found' })
  @ApiBadRequestResponse({
    description: 'License expiration date is not a future date',
  })
  @ApiConflictResponse({
    description: 'License number already in use within this company',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverResponseDto> {
    const driver = await this.driverService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(DriverResponseDto, driver, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a driver profile' })
  @ApiNoContentResponse({ description: 'Driver deactivated successfully' })
  @ApiNotFoundResponse({ description: 'Driver not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.driverService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
