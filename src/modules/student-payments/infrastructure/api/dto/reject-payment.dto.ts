import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPaymentDto {
  @ApiProperty({ example: 'La referencia no coincide con el comprobante' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
