import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum';

// Status is intentionally NOT part of this DTO — StudentPaymentsService always
// derives it from amountPaid vs monthlyFee vs dueDate. Accepting it from the
// client would let the frontend own a value it must never calculate.
export class CreateStudentPaymentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'Student UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    example: 6,
    description: 'Billing month (1 = January … 12 = December)',
  })
  @IsInt()
  @Min(1)
  @Max(12)
  billingMonth: number;

  @ApiProperty({ example: 2026, description: 'Billing year (4 digits)' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  billingYear: number;

  @ApiProperty({
    example: 180000,
    description: 'Monthly fee amount for this period (must be > 0)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monthlyFee: number;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Amount paid so far for this period.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @ApiPropertyOptional({
    example: '2026-06-15T10:00:00.000Z',
    description:
      'When the payment was received. Defaults to now() if amountPaid > 0 and this is omitted.',
  })
  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Paid via bank transfer ref #12345' })
  @IsString()
  @IsOptional()
  notes?: string;
}
