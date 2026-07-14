import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { DriverPaymentMethod } from '../../../domain/enums/payment-method.enum';

// Status is intentionally NOT part of this DTO — DriverPaymentsService always
// derives it from amountPaid vs salaryAmount vs dueDate. Accepting it from
// the client would let the frontend own a value it must never calculate.
export class CreateDriverPaymentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-234567890123',
    description: 'Driver UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({
    example: '2026-06-01',
    description: 'First day of the period this payment covers',
  })
  @IsDateString()
  periodStart: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'Last day of the period this payment covers',
  })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({
    example: 1800000,
    description: "Amount owed for this period (usually the driver's salary)",
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  salaryAmount: number;

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
    example: '2026-07-02T10:00:00.000Z',
    description:
      'When the payment was made. Defaults to now() if amountPaid > 0 and this is omitted.',
  })
  @IsDateString()
  @IsOptional()
  paidAt?: string;

  @ApiPropertyOptional({ enum: DriverPaymentMethod })
  @IsEnum(DriverPaymentMethod)
  @IsOptional()
  paymentMethod?: DriverPaymentMethod;

  @ApiPropertyOptional({ example: 'Paid via bank transfer ref #98765' })
  @IsString()
  @IsOptional()
  notes?: string;
}
