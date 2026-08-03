import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class MaintenanceSummaryPeriodDto {
  @ApiProperty({ example: 7 })
  @Expose()
  month: number;

  @ApiProperty({ example: 2026 })
  @Expose()
  year: number;

  @ApiProperty({ example: '2026-07-01' })
  @Expose()
  dateFrom: string;

  @ApiProperty({ example: '2026-07-31' })
  @Expose()
  dateTo: string;
}

export class MaintenanceSummaryResponseDto {
  @ApiProperty({ type: MaintenanceSummaryPeriodDto })
  @Expose()
  @Type(() => MaintenanceSummaryPeriodDto)
  period: MaintenanceSummaryPeriodDto;

  @ApiProperty({
    example: 1450000,
    description: 'Sum of totalCost for the period',
  })
  @Expose()
  totalInvested: number;

  @ApiProperty({ example: 6 })
  @Expose()
  maintenanceCount: number;

  @ApiProperty({ example: 241666.67 })
  @Expose()
  averageCost: number;

  @ApiProperty({
    example: 2,
    description:
      'Vehicles with at least one maintenance record due within 15 days or 500 km, or already overdue',
  })
  @Expose()
  vehiclesWithUpcomingMaintenance: number;
}
