import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { StudentStatus } from '../../../domain/enums/student-status.enum';
import { TripType } from '../../../domain/enums/trip-type.enum';

export class StudentResponseDto {
  @ApiProperty({ example: 'd4e5f6a7-b8c9-0123-defa-234567890123' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  schoolId: string;

  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  @Expose()
  scheduleId: string;

  @ApiProperty({ example: 'Juan' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Pérez García' })
  @Expose()
  lastName: string;

  @ApiPropertyOptional({ example: '1234567890', nullable: true })
  @Expose()
  document: string | null;

  @ApiPropertyOptional({ example: '2015-08-20', nullable: true })
  @Expose()
  birthDate: string | null;

  @ApiProperty({ example: '3°' })
  @Expose()
  grade: string;

  @ApiProperty({ example: 'Carrera 45 #23-12, Medellín' })
  @Expose()
  address: string;

  @ApiProperty({ example: 6.2442 })
  @Expose()
  latitude: number;

  @ApiProperty({ example: -75.5812 })
  @Expose()
  longitude: number;

  @ApiProperty({ example: '2026-02-01' })
  @Expose()
  startDate: string;

  @ApiProperty({ example: 180000 })
  @Expose()
  monthlyFee: number;

  @ApiProperty({
    example: 5,
    description: 'Day of month (1-31) payment is due.',
  })
  @Expose()
  paymentDueDay: number;

  @ApiPropertyOptional({ example: '2026-02-01', nullable: true })
  @Expose()
  transportStartDate: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  @Expose()
  transportEndDate: string | null;

  @ApiProperty({ enum: StudentStatus, example: StudentStatus.ACTIVE })
  @Expose()
  status: StudentStatus;

  @ApiProperty({ enum: TripType, example: TripType.ROUND_TRIP })
  @Expose()
  tripType: TripType;

  @ApiPropertyOptional({
    example: 'Student requires special assistance.',
    nullable: true,
  })
  @Expose()
  observations: string | null;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
