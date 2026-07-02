import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CompanyStatus } from '../../../domain/enums/company-status.enum';

export class CreateCompanyDto {
  // ── Company fields ────────────────────────────────────────────────────────

  @ApiProperty({ example: 'Transportes Escolar S.A.S' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: '900123456-7',
    description: 'Unique tax identification number',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nit: string;

  @ApiProperty({
    example: 'admin@transportes.com',
    description: 'Company contact email — also used as the admin user login',
  })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+57 320 123 4567' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67, Bogotá, Colombia' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 6.2442 })
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -75.5812 })
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    enum: CompanyStatus,
    default: CompanyStatus.ACTIVE,
    description: 'Company operational status',
  })
  @IsEnum(CompanyStatus)
  @IsOptional()
  status?: CompanyStatus;

  @ApiPropertyOptional({
    example: 'America/Bogota',
    default: 'UTC',
    description: 'IANA timezone identifier',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  timezone?: string;

  // ── Admin user (auto-created with role ADMIN) ─────────────────────────────

  @ApiProperty({
    example: 'Carlos',
    description: 'First name of the initial admin user',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminFirstName: string;

  @ApiProperty({
    example: 'Ramírez',
    description: 'Last name of the initial admin user',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adminLastName: string;

  @ApiProperty({
    example: '1098765432',
    description: 'National ID of the initial admin user',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  adminDocument: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password for the admin account (min 8 chars)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  adminPassword: string;

  @ApiPropertyOptional({
    example: '+57 310 555 1234',
    description: 'Phone of the admin user',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsOptional()
  @MaxLength(20)
  adminPhone?: string;
}
