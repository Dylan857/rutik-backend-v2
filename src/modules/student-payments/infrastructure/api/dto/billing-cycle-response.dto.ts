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
    example: 7,
    nullable: true,
    description:
      'Billing month (1-12) opened for this company in this run, or null if upToDate',
  })
  @Expose()
  billingMonth: number | null;

  @ApiProperty({
    example: 2026,
    nullable: true,
    description:
      'Billing year opened for this company in this run, or null if upToDate',
  })
  @Expose()
  billingYear: number | null;

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

  @ApiProperty({
    example: false,
    description:
      'True when this company had already reached the reference period and ' +
      'nothing was opened for it in this run',
  })
  @Expose()
  upToDate: boolean;
}

export class GenerateBillingCycleResponseDto {
  @ApiProperty({
    example: 8,
    description:
      'Reference ceiling for this run ("now + 1"). Companies with billing ' +
      'history are brought up to this period; companies without history may ' +
      'open an earlier period first — see billingMonth/billingYear per company in `results`.',
  })
  @Expose()
  referenceMonth: number;

  @ApiProperty({
    example: 2026,
    description: 'Reference ceiling year for this run',
  })
  @Expose()
  referenceYear: number;

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
