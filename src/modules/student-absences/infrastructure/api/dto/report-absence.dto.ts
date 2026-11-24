import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AbsenceLeg } from '../../../domain/enums/absence-leg.enum';

export class ReportAbsenceDto {
  @ApiProperty({
    description: "Student UUID — must be one of the caller's children",
  })
  @IsUUID()
  studentId: string;

  @ApiProperty({
    example: '2026-11-25',
    description: 'Day the student will not ride',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    enum: AbsenceLeg,
    example: AbsenceLeg.BOTH,
    description: 'PICKUP = ida, DROPOFF = regreso, BOTH = ida y regreso',
  })
  @IsEnum(AbsenceLeg)
  leg: AbsenceLeg;

  @ApiPropertyOptional({ example: 'Cita médica' })
  @Transform(({ value }: { value: string }) => value?.trim() || undefined)
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
