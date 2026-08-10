import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ExpenseBreakdownItemDto {
  @ApiProperty({
    example: 'fuel',
    description:
      'Stable category key (fuel, maintenance, and future categories)',
  })
  @Expose()
  category: string;

  @ApiProperty({ example: 'Combustible' })
  @Expose()
  label: string;

  @ApiProperty({ example: 580000 })
  @Expose()
  amount: number;
}
