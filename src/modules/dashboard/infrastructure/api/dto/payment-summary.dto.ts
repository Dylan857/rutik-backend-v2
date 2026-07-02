import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PaymentSummaryDto {
  @ApiProperty({
    example: 74,
    description: 'Students fully paid for the current billing period',
  })
  @Expose()
  paid: number;

  @ApiProperty({
    example: 12,
    description:
      'Students with a partial payment for the current billing period',
  })
  @Expose()
  partial: number;

  @ApiProperty({
    example: 30,
    description: 'Students with no payment yet and not past due',
  })
  @Expose()
  pending: number;

  @ApiProperty({
    example: 12,
    description: 'Students with no payment past the due date',
  })
  @Expose()
  overdue: number;

  @ApiProperty({
    example: 128,
    description: 'Total students billed for the current period',
  })
  @Expose()
  totalStudents: number;

  @ApiProperty({
    example: 57.81,
    description: 'Percentage of billed students who are fully paid',
  })
  @Expose()
  collectionPercentage: number;
}
