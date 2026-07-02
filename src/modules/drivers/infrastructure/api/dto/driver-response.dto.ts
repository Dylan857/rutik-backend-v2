import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DriverStatus } from '../../../domain/enums/driver-status.enum';
import { PaymentType } from '../../../domain/enums/payment-type.enum';

export class DriverResponseDto {
  @ApiProperty({ example: 'd1e2f3a4-b5c6-7890-defa-123456789012' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'Linked User UUID',
  })
  @Expose()
  userId: string;

  @ApiProperty({ example: 'C-123456' })
  @Expose()
  licenseNumber: string;

  @ApiProperty({ example: 'C2' })
  @Expose()
  licenseCategory: string;

  @ApiProperty({ example: '2028-06-01' })
  @Expose()
  licenseExpirationDate: string;

  @ApiProperty({ example: '2024-03-15' })
  @Expose()
  hireDate: string;

  @ApiProperty({ example: 2500000 })
  @Expose()
  salary: number;

  @ApiProperty({ enum: PaymentType, example: PaymentType.MONTHLY })
  @Expose()
  paymentType: PaymentType;

  @ApiProperty({ enum: DriverStatus, example: DriverStatus.ACTIVE })
  @Expose()
  status: DriverStatus;

  @ApiPropertyOptional({
    example: 'Experienced highway driver.',
    nullable: true,
  })
  @Expose()
  observations: string | null;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
