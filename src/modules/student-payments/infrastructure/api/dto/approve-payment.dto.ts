import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class ApprovePaymentDto {
  @ApiPropertyOptional({
    example: 250000,
    description:
      'Amount to record as paid. Defaults to the full monthlyFee when omitted.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  amountPaid?: number;
}
