import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { VehicleStatus } from '../../../domain/enums/vehicle-status.enum';
import { VehicleType } from '../../../domain/enums/vehicle-type.enum';

export class VehicleResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-234567890123' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'ABC-123' })
  @Expose()
  plate: string;

  @ApiProperty({ example: 'Chevrolet' })
  @Expose()
  brand: string;

  @ApiProperty({ example: 'Spark' })
  @Expose()
  model: string;

  @ApiProperty({ example: 2022 })
  @Expose()
  year: number;

  @ApiProperty({ example: 'White' })
  @Expose()
  color: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.VAN })
  @Expose()
  vehicleType: VehicleType;

  @ApiProperty({ example: 15 })
  @Expose()
  capacity: number;

  @ApiProperty({ example: 'SOAT-2024-001234' })
  @Expose()
  soatNumber: string;

  @ApiProperty({ example: '2027-03-31' })
  @Expose()
  soatExpirationDate: string;

  @ApiProperty({ example: 'RTM-2024-005678' })
  @Expose()
  technicalInspectionNumber: string;

  @ApiProperty({ example: '2026-11-15' })
  @Expose()
  technicalInspectionExpirationDate: string;

  @ApiProperty({ example: 12500 })
  @Expose()
  currentMileage: number;

  @ApiProperty({ example: true })
  @Expose()
  isPublicService: boolean;

  @ApiPropertyOptional({ example: '2026-06-01', nullable: true })
  @Expose()
  lastBimonthlyInspectionDate: string | null;

  @ApiPropertyOptional({ example: '2026-08-01', nullable: true })
  @Expose()
  bimonthlyInspectionExpirationDate: string | null;

  @ApiProperty({ enum: VehicleStatus, example: VehicleStatus.ACTIVE })
  @Expose()
  status: VehicleStatus;

  @ApiPropertyOptional({ example: 'AC unit needs service.', nullable: true })
  @Expose()
  observations: string | null;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
