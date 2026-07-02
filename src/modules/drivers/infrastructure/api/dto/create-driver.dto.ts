import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DriverStatus } from '../../../domain/enums/driver-status.enum';
import { PaymentType } from '../../../domain/enums/payment-type.enum';

export class CreateDriverDto {
  // ── Company ──────────────────────────────────────────────────────────────────

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  // ── User account (auto-created with role DRIVER) ──────────────────────────

  @ApiProperty({ example: 'Carlos' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Martínez Ruiz' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    example: '79543210',
    description: 'National identity document number',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  document: string;

  @ApiProperty({ example: 'carlos.martinez@email.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Minimum 8 characters',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  password: string;

  @ApiPropertyOptional({ example: '+57 310 555 6677' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  // ── Driver profile ────────────────────────────────────────────────────────

  @ApiProperty({
    example: 'C-123456',
    description: 'Driver license number (unique within company)',
  })
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  licenseNumber: string;

  @ApiProperty({
    example: 'C2',
    description: 'License category (e.g. B, C1, C2, D)',
  })
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  licenseCategory: string;

  @ApiProperty({
    example: '2028-06-01',
    description: 'ISO date — must be a future date',
  })
  @IsDateString()
  @IsNotEmpty()
  licenseExpirationDate: string;

  @ApiProperty({
    example: '2024-03-15',
    description: 'ISO date — driver hire date',
  })
  @IsDateString()
  @IsNotEmpty()
  hireDate: string;

  @ApiProperty({ example: 2500000, description: 'Gross salary amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salary: number;

  @ApiProperty({ enum: PaymentType, example: PaymentType.MONTHLY })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  paymentType: PaymentType;

  @ApiPropertyOptional({ enum: DriverStatus, default: DriverStatus.ACTIVE })
  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @ApiPropertyOptional({
    example: 'Experienced highway driver, no prior incidents.',
  })
  @IsString()
  @IsOptional()
  observations?: string;
}
