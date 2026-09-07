import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentAccountType } from '../../../domain/enums/payment-account-type.enum';

export class CreatePaymentAccountDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ enum: PaymentAccountType, example: PaymentAccountType.BANK_TRANSFER })
  @IsEnum(PaymentAccountType)
  type: PaymentAccountType;

  @ApiPropertyOptional({ example: 'Bancolombia' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ example: 'Rutik S.A.S.' })
  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @ApiProperty({ example: '450-12345-678' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiPropertyOptional({ example: 'Ahorros' })
  @IsString()
  @IsOptional()
  accountTypeLabel?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
