import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PaymentAccountType } from '../../../domain/enums/payment-account-type.enum';

export class PaymentAccountResponseDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-efab-345678901234' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ enum: PaymentAccountType })
  @Expose()
  type: PaymentAccountType;

  @ApiPropertyOptional({ example: 'Bancolombia', nullable: true })
  @Expose()
  bankName: string | null;

  @ApiProperty({ example: 'Rutik S.A.S.' })
  @Expose()
  accountHolder: string;

  @ApiProperty({ example: '450-12345-678' })
  @Expose()
  accountNumber: string;

  @ApiPropertyOptional({ example: 'Ahorros', nullable: true })
  @Expose()
  accountTypeLabel: string | null;

  @ApiProperty({ example: true })
  @Expose()
  active: boolean;

  @ApiProperty({ example: 0 })
  @Expose()
  displayOrder: number;
}
