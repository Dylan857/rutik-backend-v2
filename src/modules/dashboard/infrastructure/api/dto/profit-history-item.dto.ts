import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProfitHistoryItemDto {
  @ApiProperty({ example: 3, description: 'Billing month (1-12)' })
  @Expose()
  billingMonth: number;

  @ApiProperty({ example: 2026 })
  @Expose()
  billingYear: number;

  @ApiProperty({ example: 3055000, description: 'income - expenses for the period' })
  @Expose()
  profit: number;
}
