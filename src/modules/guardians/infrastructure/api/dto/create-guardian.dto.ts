import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { GuardianStatus } from '../../../domain/enums/guardian-status.enum';

export class CreateGuardianDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description:
      'User account UUID (role GUARDIAN) for mobile app access. Must belong to the same company.',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'María' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Ramírez Torres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    example: '43215678',
    description: 'National ID or document number',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  document: string;

  @ApiProperty({ example: '+57 310 123 4567' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'maria.ramirez@email.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: 'Calle 50 #30-20, Medellín' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ enum: GuardianStatus, default: GuardianStatus.ACTIVE })
  @IsEnum(GuardianStatus)
  @IsOptional()
  status?: GuardianStatus;

  @ApiPropertyOptional({
    example: 'Guardian prefers to be contacted after 5pm.',
  })
  @IsString()
  @IsOptional()
  observations?: string;
}
