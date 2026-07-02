import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class BillingCycleCompanyResultDto {
  @ApiProperty({ example: '15497142-62e4-4929-af87-ce7490e7297d' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'Transporte Escolar ABC' })
  @Expose()
  companyName: string;

  @ApiProperty({
    example: 42,
    description: 'PENDING payment records created for this company',
  })
  @Expose()
  created: number;

  @ApiProperty({
    example: 3,
    description:
      'Students skipped for this company (already billed for the period, or ' +
      'outside their transport service window)',
  })
  @Expose()
  skipped: number;
}

export class GenerateBillingCycleResponseDto {
  @ApiProperty({ example: 7, description: 'Billing month opened (1-12)' })
  @Expose()
  billingMonth: number;

  @ApiProperty({ example: 2026, description: 'Billing year opened' })
  @Expose()
  billingYear: number;

  @ApiProperty({ example: 12 })
  @Expose()
  companiesProcessed: number;

  @ApiProperty({ example: 340 })
  @Expose()
  totalCreated: number;

  @ApiProperty({ example: 15 })
  @Expose()
  totalSkipped: number;

  @ApiProperty({ type: [BillingCycleCompanyResultDto] })
  @Expose()
  @Type(() => BillingCycleCompanyResultDto)
  results: BillingCycleCompanyResultDto[];
}
