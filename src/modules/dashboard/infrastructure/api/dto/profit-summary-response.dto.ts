import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ExpenseBreakdownItemDto } from './expense-breakdown-item.dto';

export class ProfitSummaryResponseDto {
  @ApiProperty({
    example: 6390000,
    description:
      'Sum of amountPaid for student payments marked as paid or partial during the billing period.',
  })
  @Expose()
  income: number;

  @ApiProperty({
    example: 1860000,
    description: 'Sum of all expense categories for the billing period.',
  })
  @Expose()
  expenses: number;

  @ApiProperty({
    example: 4530000,
    description:
      'income - expenses. Can be negative if expenses exceed income.',
  })
  @Expose()
  profit: number;

  @ApiProperty({
    example: 70.89,
    description: '(profit / income) * 100. 0 when income is zero or negative.',
  })
  @Expose()
  margin: number;

  @ApiProperty({
    example: 580000,
    description: 'Fuel expenses for the period.',
  })
  @Expose()
  fuelExpenses: number;

  @ApiProperty({
    example: 320000,
    description: 'Maintenance expenses for the period.',
  })
  @Expose()
  maintenanceExpenses: number;

  @ApiProperty({
    type: [ExpenseBreakdownItemDto],
    description:
      'Every registered expense category with its total for the period. ' +
      'New categories (insurance, payroll, etc.) show up here automatically ' +
      'once their provider is registered — no contract change needed.',
  })
  @Expose()
  @Type(() => ExpenseBreakdownItemDto)
  expenseBreakdown: ExpenseBreakdownItemDto[];
}
