import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DriverPaymentStatus } from '../../../domain/enums/payment-status.enum';
import { DriverPaymentMethod } from '../../../domain/enums/payment-method.enum';

export class DriverPaymentResponseDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-efab-345678901234' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-234567890123' })
  @Expose()
  driverId: string;

  @ApiProperty({ example: '2026-06-01' })
  @Expose()
  periodStart: string;

  @ApiProperty({ example: '2026-06-30' })
  @Expose()
  periodEnd: string;

  @ApiProperty({ example: 1800000 })
  @Expose()
  salaryAmount: number;

  @ApiProperty({ example: 900000 })
  @Expose()
  amountPaid: number;

  @ApiProperty({
    example: 900000,
    description:
      'salaryAmount - amountPaid, computed server-side. Never calculate this on the frontend.',
  })
  @Expose()
  outstandingBalance: number;

  @ApiProperty({
    enum: DriverPaymentStatus,
    example: DriverPaymentStatus.PENDING,
    description:
      'Computed server-side from amountPaid/salaryAmount/dueDate. Never calculate this on the frontend.',
  })
  @Expose()
  status: DriverPaymentStatus;

  @ApiProperty({
    example: '2026-06-30',
    description:
      'Frozen at creation, equal to periodEnd (the calendar cutoff for this period).',
  })
  @Expose()
  dueDate: string;

  @ApiPropertyOptional({
    example: 15,
    nullable: true,
    description:
      'Days past dueDate while unpaid. Null unless status is OVERDUE.',
  })
  @Expose()
  daysOverdue: number | null;

  @ApiPropertyOptional({ example: '2026-07-02T10:00:00.000Z', nullable: true })
  @Expose()
  paidAt: Date | null;

  @ApiPropertyOptional({ enum: DriverPaymentMethod, nullable: true })
  @Expose()
  paymentMethod: DriverPaymentMethod | null;

  @ApiPropertyOptional({
    example: 'Paid via bank transfer ref #98765',
    nullable: true,
  })
  @Expose()
  notes: string | null;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-02T10:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}
