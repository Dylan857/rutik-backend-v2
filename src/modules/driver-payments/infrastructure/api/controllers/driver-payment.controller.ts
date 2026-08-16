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
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { JwtPayload } from '../../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { DriverPaymentsService } from '../../../application/driver-payments.service';
import { DriverPaymentStatus } from '../../../domain/enums/payment-status.enum';
import { CreateDriverPaymentDto } from '../dto/create-driver-payment.dto';
import { UpdateDriverPaymentDto } from '../dto/update-driver-payment.dto';
import { DriverPaymentResponseDto } from '../dto/driver-payment-response.dto';
import { GenerateDriverPaymentCycleResponseDto } from '../dto/payment-cycle-response.dto';

@ApiTags('Driver Payments')
@Controller('driver-payments')
export class DriverPaymentController {
  constructor(private readonly paymentsService: DriverPaymentsService) {}

  @Post('payment-cycle/generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Generate the current payment period for every active driver',
    description:
      'For every company with status ACTIVE, opens the current payment ' +
      'period for each ACTIVE driver whose paymentType is MONTHLY, WEEKLY, ' +
      'or BIWEEKLY (PER_ROUTE drivers are skipped — they are paid ' +
      'manually). Meant to be launched a few days ahead of each cutoff ' +
      '(e.g. the 25th-29th for MONTHLY drivers) so the record shows up as ' +
      "a PENDING reminder before it's due, not only after the fact — the " +
      'period is capped at "the period containing today", never more than ' +
      "one ahead of the driver's last billed period. Safe to run more " +
      'than once: a driver whose current period is already open, or who ' +
      'already has a record for it, is skipped and nothing is duplicated.',
  })
  @ApiOkResponse({ type: GenerateDriverPaymentCycleResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async generatePaymentCycle(
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<GenerateDriverPaymentCycleResponseDto> {
    const summary = await this.paymentsService.generateNextPaymentCycle({
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(GenerateDriverPaymentCycleResponseDto, summary, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a payment record for a driver',
    description:
      'Registers a payroll record for a driver covering periodStart to ' +
      'periodEnd. This does NOT process money — it is an administrative ' +
      'tracking record only. status is always computed server-side from ' +
      "amountPaid vs salaryAmount vs the period's due date — it is never " +
      'accepted as input. If amountPaid > 0 and paidAt is omitted, the ' +
      'current timestamp is used.',
  })
  @ApiCreatedResponse({ type: DriverPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Company or driver not found' })
  @ApiBadRequestResponse({
    description: 'Driver does not belong to company, or invalid period/fee',
  })
  @ApiConflictResponse({
    description: 'Payment record already exists for this driver and period',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async create(
    @Body() dto: CreateDriverPaymentDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverPaymentResponseDto> {
    const payment = await this.paymentsService.create(dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(DriverPaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List payment records with optional filters' })
  @ApiOkResponse({ type: [DriverPaymentResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'driverId',
    required: false,
    description: 'Filter by driver UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DriverPaymentStatus,
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'periodStart',
    required: false,
    description:
      'Exact-match filter on periodStart (YYYY-MM-DD). Combine with periodEnd to look up a specific period.',
  })
  @ApiQuery({
    name: 'periodEnd',
    required: false,
    description: 'Exact-match filter on periodEnd (YYYY-MM-DD)',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('driverId') driverId?: string,
    @Query('status') status?: DriverPaymentStatus,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ): Promise<DriverPaymentResponseDto[]> {
    const payments = await this.paymentsService.findAll({
      companyId,
      driverId,
      status,
      periodStart,
      periodEnd,
    });
    return plainToInstance(DriverPaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment record by ID' })
  @ApiOkResponse({ type: DriverPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverPaymentResponseDto> {
    const payment = await this.paymentsService.findById(id);
    return plainToInstance(DriverPaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a payment record',
    description:
      'Updates the salary amount, amount paid, payment method, date, or ' +
      'notes of a payment record. driver, periodStart, and periodEnd are ' +
      'immutable. status is always recomputed server-side from the ' +
      'resulting amountPaid vs salaryAmount vs the (frozen) due date — it ' +
      'is never accepted as input.',
  })
  @ApiOkResponse({ type: DriverPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  @ApiBadRequestResponse({ description: 'Invalid salary amount' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverPaymentDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<DriverPaymentResponseDto> {
    const payment = await this.paymentsService.update(id, dto, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
    return plainToInstance(DriverPaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete a payment record' })
  @ApiNoContentResponse({ description: 'Payment record deleted successfully' })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<void> {
    await this.paymentsService.softDelete(id, {
      userId: currentUser.sub,
      email: currentUser.email,
    });
  }
}
