import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { MaintenanceType } from '../../../domain/enums/maintenance-type.enum';
import { MaintenanceStatus } from '../../../domain/enums/maintenance-status.enum';

export class MaintenanceResponseDto {
  @ApiProperty({ example: 'd4e5f6a7-b8c9-0123-defa-456789012345' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  vehicleId: string;

  @ApiProperty({ example: 'ABC123' })
  @Expose()
  vehiclePlate: string;

  @ApiProperty({ example: 'Chevrolet' })
  @Expose()
  vehicleBrand: string;

  @ApiProperty({ example: 'NPR' })
  @Expose()
  vehicleModel: string;

  @ApiProperty({ example: '2026-07-20' })
  @Expose()
  date: string;

  @ApiProperty({ enum: MaintenanceType, example: MaintenanceType.OIL_CHANGE })
  @Expose()
  maintenanceType: MaintenanceType;

  @ApiPropertyOptional({ example: 'Taller Los Amigos', nullable: true })
  @Expose()
  workshop: string | null;

  @ApiProperty({ example: 45230 })
  @Expose()
  mileage: number;

  @ApiPropertyOptional({
    example: 'Cambio de aceite y filtro',
    nullable: true,
  })
  @Expose()
  description: string | null;

  @ApiProperty({ example: 80000 })
  @Expose()
  laborCost: number;

  @ApiProperty({ example: 120000 })
  @Expose()
  partsCost: number;

  @ApiProperty({ example: 200000 })
  @Expose()
  totalCost: number;

  @ApiPropertyOptional({ example: '2026-12-15', nullable: true })
  @Expose()
  nextMaintenanceDate: string | null;

  @ApiPropertyOptional({ example: 65000, nullable: true })
  @Expose()
  nextMaintenanceMileage: number | null;

  @ApiProperty({
    enum: MaintenanceStatus,
    example: MaintenanceStatus.UP_TO_DATE,
  })
  @Expose()
  status: MaintenanceStatus;

  @ApiProperty({ example: '2026-07-20T14:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-20T14:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
