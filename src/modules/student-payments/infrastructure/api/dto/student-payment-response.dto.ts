import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PaymentStatus } from '../../../domain/enums/payment-status.enum';
import { PaymentMethod } from '../../../domain/enums/payment-method.enum';

export class StudentPaymentResponseDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-efab-345678901234' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  studentId: string;

  @ApiProperty({ example: 6 })
  @Expose()
  billingMonth: number;

  @ApiProperty({ example: 2026 })
  @Expose()
  billingYear: number;

  @ApiProperty({ example: 180000 })
  @Expose()
  monthlyFee: number;

  @ApiProperty({ example: 50000 })
  @Expose()
  amountPaid: number;

  @ApiProperty({
    example: 130000,
    description:
      'monthlyFee - amountPaid, computed server-side. Never calculate this on the frontend.',
  })
  @Expose()
  outstandingBalance: number;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
    description:
      'Computed server-side from amountPaid/monthlyFee/dueDate. Never calculate this on the frontend.',
  })
  @Expose()
  status: PaymentStatus;

  @ApiPropertyOptional({ example: '2026-07-05', nullable: true })
  @Expose()
  dueDate: string | null;

  @ApiPropertyOptional({
    example: 15,
    nullable: true,
    description:
      'Days past dueDate while unpaid. Null unless status is OVERDUE.',
  })
  @Expose()
  daysOverdue: number | null;

  @ApiPropertyOptional({ example: '2026-06-15T10:00:00.000Z', nullable: true })
  @Expose()
  paidAt: Date | null;

  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  @Expose()
  paymentMethod: PaymentMethod | null;

  @ApiPropertyOptional({
    example: 'Paid via bank transfer ref #12345',
    nullable: true,
  })
  @Expose()
  notes: string | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/v1/receipt.jpg',
    nullable: true,
    description: 'Receipt photo submitted by the guardian, if any.',
  })
  @Expose()
  receiptUrl: string | null;

  @ApiPropertyOptional({ example: '000123456789', nullable: true })
  @Expose()
  receiptReference: string | null;

  @ApiPropertyOptional({
    example: 'e5f6a7b8-c9d0-1234-efab-345678901234',
    nullable: true,
    description: 'PaymentAccount the guardian claims to have transferred to.',
  })
  @Expose()
  paymentAccountId: string | null;

  @ApiPropertyOptional({
    example: '2026-09-01T15:00:00.000Z',
    nullable: true,
    description: 'When the guardian submitted the receipt currently under review.',
  })
  @Expose()
  submittedAt: Date | null;

  @ApiPropertyOptional({ example: '2026-09-02T10:00:00.000Z', nullable: true })
  @Expose()
  reviewedAt: Date | null;

  @ApiPropertyOptional({
    example: 'La referencia no coincide con el comprobante',
    nullable: true,
    description:
      'Set when the last submitted receipt was rejected. Kept even after status reverts to PENDING/OVERDUE so the guardian sees why.',
  })
  @Expose()
  rejectionReason: string | null;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
  @Expose()
  updatedAt: Date;
}
