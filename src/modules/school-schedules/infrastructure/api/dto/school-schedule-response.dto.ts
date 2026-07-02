import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ScheduleStatus } from '../../../domain/enums/schedule-status.enum';

export class SchoolScheduleResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  schoolId: string;

  @ApiProperty({ example: 'Jornada Mañana' })
  @Expose()
  name: string;

  @ApiProperty({ example: '06:30:00', description: 'Start time (HH:MM:SS)' })
  @Expose()
  startTime: string;

  @ApiProperty({ example: '12:30:00', description: 'End time (HH:MM:SS)' })
  @Expose()
  endTime: string;

  @ApiProperty({ enum: ScheduleStatus, example: ScheduleStatus.ACTIVE })
  @Expose()
  status: ScheduleStatus;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
