import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class DriverPaymentCycleCompanyResultDto {
  @ApiProperty({ example: '15497142-62e4-4929-af87-ce7490e7297d' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'Transporte Escolar ABC' })
  @Expose()
  companyName: string;

  @ApiProperty({
    example: 8,
    description:
      'Active drivers considered for this company (excludes PER_ROUTE drivers)',
  })
  @Expose()
  driversProcessed: number;

  @ApiProperty({
    example: 5,
    description: 'PENDING payment records created for this company',
  })
  @Expose()
  created: number;

  @ApiProperty({
    example: 3,
    description:
      'Drivers skipped for this company: either their current period is ' +
      'already open, or a record for it already exists',
  })
  @Expose()
  skipped: number;
}

export class GenerateDriverPaymentCycleResponseDto {
  @ApiProperty({
    example: '2026-07-14T10:00:00.000Z',
    description:
      'Reference timestamp used as "now" for this run — a period is only ' +
      'opened once its periodEnd is on or before this instant.',
  })
  @Expose()
  referenceDate: Date;

  @ApiProperty({ example: 12 })
  @Expose()
  companiesProcessed: number;

  @ApiProperty({ example: 34 })
  @Expose()
  totalCreated: number;

  @ApiProperty({ example: 41 })
  @Expose()
  totalSkipped: number;

  @ApiProperty({ type: [DriverPaymentCycleCompanyResultDto] })
  @Expose()
  @Type(() => DriverPaymentCycleCompanyResultDto)
  results: DriverPaymentCycleCompanyResultDto[];
}
