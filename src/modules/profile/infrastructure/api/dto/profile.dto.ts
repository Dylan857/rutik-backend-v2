import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../../user/domain/enums/user-role.enum';

// Only name and phone are self-editable — email (the login) and document are
// changed by the company's admin.
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'María' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'López' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '3105556677' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsOptional()
  phone?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'Minimum 8 characters' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  newPassword: string;
}

export class DriverProfileDto {
  @ApiProperty()
  driverId: string;

  @ApiProperty({ example: 'C-123456' })
  licenseNumber: string;

  @ApiProperty({ example: 'C2' })
  licenseCategory: string;

  @ApiProperty({ example: '2028-06-01' })
  licenseExpirationDate: string;

  @ApiProperty({ example: '2024-03-15' })
  hireDate: string;
}

export class ProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ nullable: true })
  companyId: string | null;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  document: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({
    type: DriverProfileDto,
    nullable: true,
    description: 'Only for DRIVER users',
  })
  driver: DriverProfileDto | null;
}
