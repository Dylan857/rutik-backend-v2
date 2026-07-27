import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RevenueSummaryDto {
  @ApiProperty({
    example: 19200000,
    description:
      'Total expected revenue for the billing period. Reflects the ' +
      'current billing period by default, or the billingMonth/billingYear ' +
      'query params when provided.',
  })
  @Expose()
  expected: number;

  @ApiProperty({
    example: 14350000,
    description:
      'Total amount collected for the same billing period as `expected`.',
  })
  @Expose()
  collected: number;

  @ApiProperty({
    example: 4850000,
    description: 'Outstanding revenue still to be collected',
  })
  @Expose()
  remaining: number;

  @ApiProperty({
    example: 74.74,
    description: 'Percentage of expected revenue collected',
  })
  @Expose()
  collectionPercentage: number;
}
