import { ApiProperty } from '@nestjs/swagger';
import { AbsenceLeg } from '../../../domain/enums/absence-leg.enum';
import { AbsenceStatus } from '../../../domain/enums/absence-status.enum';

export class StudentAbsenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty({ example: 'Sofía Gómez' })
  studentName: string;

  @ApiProperty({ example: '2026-11-25' })
  date: string;

  @ApiProperty({ enum: AbsenceLeg })
  leg: AbsenceLeg;

  @ApiProperty({ nullable: true, example: 'Cita médica' })
  reason: string | null;

  @ApiProperty({ enum: AbsenceStatus })
  status: AbsenceStatus;

  @ApiProperty({
    description: 'False once the cutoff (school entry/exit time) has passed',
  })
  canCancel: boolean;

  @ApiProperty()
  createdAt: Date;
}
