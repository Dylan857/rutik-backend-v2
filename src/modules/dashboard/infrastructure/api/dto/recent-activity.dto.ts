import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PaymentMethod } from '../../../../student-payments/domain/enums/payment-method.enum';

export class RecentActivityDto {
  @ApiProperty({ example: 'f6a7b8c9-d0e1-2345-fabc-456789012345' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'María Gómez' })
  @Expose()
  studentName: string;

  @ApiProperty({ example: 'Colegio San José' })
  @Expose()
  schoolName: string;

  @ApiProperty({
    example: 180000,
    description: 'Amount paid in this transaction',
  })
  @Expose()
  amount: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.TRANSFER,
    nullable: true,
  })
  @Expose()
  paymentMethod: PaymentMethod | null;

  @ApiProperty({ example: '2026-06-30T14:22:00.000Z' })
  @Expose()
  paidAt: Date;
}
