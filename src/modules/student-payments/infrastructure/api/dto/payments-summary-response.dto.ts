import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class PaymentStatusSummaryDto {
  @ApiProperty({
    example: 74,
    description: 'Students fully paid for the filtered period',
  })
  @Expose()
  paid: number;

  @ApiProperty({ example: 12, description: 'Students with a partial payment' })
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
    description: 'Total students billed for the filtered period',
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

class RevenueSummaryFilteredDto {
  @ApiProperty({
    example: 5800000,
    description: 'Total expected revenue for the filtered period/school',
  })
  @Expose()
  expected: number;

  @ApiProperty({
    example: 4200000,
    description: 'Total amount collected for the filtered period/school',
  })
  @Expose()
  collected: number;

  @ApiProperty({
    example: 1600000,
    description: 'Outstanding revenue still to be collected',
  })
  @Expose()
  remaining: number;

  @ApiProperty({
    example: 72.41,
    description: 'Percentage of expected revenue collected',
  })
  @Expose()
  collectionPercentage: number;
}

export class PaymentsSummaryResponseDto {
  @ApiProperty({
    example: 7,
    description: 'Billing month (1-12) this summary reflects',
  })
  @Expose()
  billingMonth: number;

  @ApiProperty({
    example: 2026,
    description: 'Billing year this summary reflects',
  })
  @Expose()
  billingYear: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description:
      'School UUID this summary was filtered by, or null when covering every school',
  })
  @Expose()
  schoolId: string | null;

  @ApiProperty({ type: PaymentStatusSummaryDto })
  @Expose()
  @Type(() => PaymentStatusSummaryDto)
  paymentStatus: PaymentStatusSummaryDto;

  @ApiProperty({ type: RevenueSummaryFilteredDto })
  @Expose()
  @Type(() => RevenueSummaryFilteredDto)
  revenue: RevenueSummaryFilteredDto;
}
