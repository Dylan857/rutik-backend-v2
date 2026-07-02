import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ScheduleStatus } from '../../../domain/enums/schedule-status.enum';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TIME_EXAMPLE_MSG = 'HH:MM in 24-hour format, e.g. "07:00"';

export class CreateSchoolScheduleDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'School UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ example: 'Jornada Mañana' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '06:30', description: TIME_EXAMPLE_MSG })
  @Matches(TIME_REGEX, {
    message: `startTime must be a valid time in HH:MM format`,
  })
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '12:30', description: TIME_EXAMPLE_MSG })
  @Matches(TIME_REGEX, {
    message: `endTime must be a valid time in HH:MM format`,
  })
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ enum: ScheduleStatus, default: ScheduleStatus.ACTIVE })
  @IsEnum(ScheduleStatus)
  @IsOptional()
  status?: ScheduleStatus;
}
