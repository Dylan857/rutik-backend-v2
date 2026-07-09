import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class VerifyResetCodeDto {
  @ApiProperty({ example: 'juan.perez@empresa.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code: string;
}
