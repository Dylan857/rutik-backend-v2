import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { MaintenanceType } from '../../../domain/enums/maintenance-type.enum';

// companyId is intentionally NOT part of this DTO — it is always derived
// server-side from the vehicle's own companyId, mirroring fuel-logs.
export class CreateMaintenanceDto {
  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'Vehicle UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({
    example: '2026-07-20',
    description: 'Date the maintenance was performed',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: MaintenanceType, example: MaintenanceType.OIL_CHANGE })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiPropertyOptional({ example: 'Taller Los Amigos' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  workshop?: string;

  @ApiProperty({
    example: 45230,
    description: 'Vehicle odometer reading at the moment of the maintenance',
  })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiPropertyOptional({ example: 'Cambio de aceite y filtro' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 80000, description: 'Labor cost' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  laborCost?: number;

  @ApiPropertyOptional({ example: 120000, description: 'Parts cost' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  partsCost?: number;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsDateString()
  @IsOptional()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({ example: 65000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  nextMaintenanceMileage?: number;
}
