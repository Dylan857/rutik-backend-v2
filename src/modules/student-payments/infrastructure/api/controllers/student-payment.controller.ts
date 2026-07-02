import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { Roles } from '../../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../common/guards/roles.guard';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';
import { StudentPaymentsService } from '../../../application/student-payments.service';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum';
import { CreateStudentPaymentDto } from '../dto/create-student-payment.dto';
import { UpdateStudentPaymentDto } from '../dto/update-student-payment.dto';
import { StudentPaymentResponseDto } from '../dto/student-payment-response.dto';
import { GenerateBillingCycleResponseDto } from '../dto/billing-cycle-response.dto';

@ApiTags('Student Payments')
@Controller('student-payments')
export class StudentPaymentController {
  constructor(private readonly paymentsService: StudentPaymentsService) {}

  @Post('billing-cycle/generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Generate the next billing cycle for every active company',
    description:
      'Opens the NEXT calendar month\'s billing period for every company with ' +
      "status ACTIVE — running this on any day of June opens July, never June. " +
      'For each company, creates a PENDING student_payments record for every ' +
      'active student whose transport service covers that period and who does ' +
      'not already have one. Safe to run more than once for the same period: ' +
      'students already billed are skipped, never duplicated.',
  })
  @ApiOkResponse({ type: GenerateBillingCycleResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async generateBillingCycle(): Promise<GenerateBillingCycleResponseDto> {
    const summary = await this.paymentsService.generateNextBillingCycle();
    return plainToInstance(GenerateBillingCycleResponseDto, summary, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a payment record for a student',
    description:
      'Registers the monthly payment control record for a student. ' +
      'This does NOT process money — it is an administrative tracking record only. ' +
      'status is always computed server-side from amountPaid vs monthlyFee vs the ' +
      "student's due date — it is never accepted as input. If amountPaid > 0 and " +
      'paidAt is omitted, the current timestamp is used.',
  })
  @ApiCreatedResponse({ type: StudentPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Company or student not found' })
  @ApiBadRequestResponse({
    description: 'Student does not belong to company, or invalid fee',
  })
  @ApiConflictResponse({
    description: 'Payment record already exists for this student and period',
  })
  async create(
    @Body() dto: CreateStudentPaymentDto,
  ): Promise<StudentPaymentResponseDto> {
    const payment = await this.paymentsService.create(dto);
    return plainToInstance(StudentPaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List payment records with optional filters' })
  @ApiOkResponse({ type: [StudentPaymentResponseDto] })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Filter by company UUID',
  })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description: 'Filter by student UUID',
  })
  @ApiQuery({
    name: 'billingMonth',
    required: false,
    description: 'Filter by billing month (1-12)',
  })
  @ApiQuery({
    name: 'billingYear',
    required: false,
    description: 'Filter by billing year',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filter by payment status',
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('studentId') studentId?: string,
    @Query('billingMonth') billingMonth?: string,
    @Query('billingYear') billingYear?: string,
    @Query('status') status?: PaymentStatus,
  ): Promise<StudentPaymentResponseDto[]> {
    const payments = await this.paymentsService.findAll({
      companyId,
      studentId,
      billingMonth: billingMonth ? parseInt(billingMonth, 10) : undefined,
      billingYear: billingYear ? parseInt(billingYear, 10) : undefined,
      status,
    });
    return plainToInstance(StudentPaymentResponseDto, payments, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment record by ID' })
  @ApiOkResponse({ type: StudentPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudentPaymentResponseDto> {
    const payment = await this.paymentsService.findById(id);
    return plainToInstance(StudentPaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a payment record',
    description:
      'Updates the fee, amount paid, payment method, date, or notes of a payment ' +
      'record. student, billingMonth, and billingYear are immutable. status is ' +
      'always recomputed server-side from the resulting amountPaid vs monthlyFee ' +
      'vs the (frozen) due date — it is never accepted as input.',
  })
  @ApiOkResponse({ type: StudentPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  @ApiBadRequestResponse({ description: 'Invalid fee value' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentPaymentDto,
  ): Promise<StudentPaymentResponseDto> {
    const payment = await this.paymentsService.update(id, dto);
    return plainToInstance(StudentPaymentResponseDto, payment, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a payment record' })
  @ApiNoContentResponse({ description: 'Payment record deleted successfully' })
  @ApiNotFoundResponse({ description: 'Payment record not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.paymentsService.softDelete(id);
  }
}
