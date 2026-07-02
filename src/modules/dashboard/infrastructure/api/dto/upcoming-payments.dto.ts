import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PaymentStatus } from '../../../../student-payments/domain/enums/payment-status.enum';

export class UpcomingPaymentDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-efab-345678901234' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Juan Pérez García' })
  @Expose()
  studentName: string;

  @ApiProperty({ example: 'Colegio San José' })
  @Expose()
  schoolName: string;

  @ApiProperty({ example: 'Mañana' })
  @Expose()
  scheduleName: string;

  @ApiProperty({
    example: 180000,
    description: 'Outstanding balance for the period (monthlyFee - amountPaid)',
  })
  @Expose()
  amount: number;

  @ApiProperty({ example: '2026-07-05' })
  @Expose()
  dueDate: string;

  @ApiProperty({
    example: -3,
    description: 'Days until the due date; negative when already overdue',
  })
  @Expose()
  daysRemaining: number;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.OVERDUE })
  @Expose()
  status: PaymentStatus;
}
