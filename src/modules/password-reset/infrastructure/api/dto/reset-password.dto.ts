import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'juan.perez@empresa.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;

  @ApiProperty({
    example: 'NewSecurePass123',
    description: 'Minimum 8 characters',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  newPassword: string;
}
