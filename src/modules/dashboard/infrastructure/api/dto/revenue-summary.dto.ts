import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RevenueSummaryDto {
  @ApiProperty({
    example: 19200000,
    description: 'Total expected revenue for the current billing period',
  })
  @Expose()
  expected: number;

  @ApiProperty({
    example: 14350000,
    description:
      'Total amount collected. Reflects the current billing period by ' +
      'default, or the billingMonth/billingYear query params when provided ' +
      '— the only value in the dashboard affected by that filter.',
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
