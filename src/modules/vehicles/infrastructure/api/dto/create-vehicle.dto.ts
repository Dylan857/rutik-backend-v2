import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../../../domain/enums/vehicle-status.enum';
import { VehicleType } from '../../../domain/enums/vehicle-type.enum';

export class CreateVehicleDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    example: 'ABC-123',
    description: 'Vehicle plate (unique within company)',
  })
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate: string;

  @ApiProperty({ example: 'Chevrolet' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @ApiProperty({ example: 'Spark' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @ApiProperty({
    example: 2022,
    description: 'Vehicle model year (cannot exceed current year + 1)',
  })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 'White' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  color: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.VAN })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiProperty({
    example: 15,
    description: 'Maximum passenger capacity (must be greater than zero)',
  })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    example: 'SOAT-2024-001234',
    description: 'SOAT policy number',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  soatNumber: string;

  @ApiProperty({
    example: '2027-03-31',
    description: 'ISO date — must be a future date',
  })
  @IsDateString()
  @IsNotEmpty()
  soatExpirationDate: string;

  @ApiProperty({
    example: 'RTM-2024-005678',
    description: 'Technical inspection (tecnomecánica) number',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  technicalInspectionNumber: string;

  @ApiProperty({
    example: '2026-11-15',
    description: 'ISO date — must be a future date',
  })
  @IsDateString()
  @IsNotEmpty()
  technicalInspectionExpirationDate: string;

  @ApiPropertyOptional({
    example: 12500,
    description: 'Current odometer reading in km (cannot be negative)',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  currentMileage?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether the vehicle is a public-service vehicle (subject to the bimonthly technical inspection). Defaults to true.',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isPublicService?: boolean;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description:
      'Date of the last bimonthly preventive inspection. Only relevant for public-service vehicles; the expiration date is calculated by the backend as this date + 2 months.',
  })
  @IsDateString()
  @IsOptional()
  lastBimonthlyInspectionDate?: string;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiPropertyOptional({ example: 'AC unit needs service.' })
  @IsString()
  @IsOptional()
  observations?: string;
}
