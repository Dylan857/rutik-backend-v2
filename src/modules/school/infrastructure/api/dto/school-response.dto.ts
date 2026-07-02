import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { SchoolStatus } from '../../../domain/enums/school-status.enum';

export class SchoolResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'Colegio San Ignacio' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ example: 'Calle 10 #23-45, Medellín', nullable: true })
  @Expose()
  address: string | null;

  @ApiPropertyOptional({ example: 6.2442, nullable: true })
  @Expose()
  latitude: number | null;

  @ApiPropertyOptional({ example: -75.5812, nullable: true })
  @Expose()
  longitude: number | null;

  @ApiPropertyOptional({ example: '+57 604 123 4567', nullable: true })
  @Expose()
  phone: string | null;

  @ApiPropertyOptional({
    example: 'contacto@sanignacio.edu.co',
    nullable: true,
  })
  @Expose()
  email: string | null;

  @ApiProperty({ enum: SchoolStatus, example: SchoolStatus.ACTIVE })
  @Expose()
  status: SchoolStatus;

  @ApiPropertyOptional({
    example: 3,
    description: 'Number of schedules ("jornadas") registered for this school',
  })
  @Expose()
  scheduleCount?: number;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
