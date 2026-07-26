import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

// companyId is intentionally NOT part of this DTO — it is always derived
// server-side from the vehicle's own companyId, mirroring how vehicleId is
// the only identity the client needs to provide.
export class CreateFuelLogDto {
  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'Vehicle UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({
    example: '2026-07-20',
    description: 'Date the vehicle was fueled',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 250000, description: 'Amount paid for this fuel-up' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountPaid: number;

  @ApiProperty({ example: 32.5, description: 'Gallons loaded' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.01)
  gallons: number;

  @ApiPropertyOptional({
    example: 45230,
    description:
      'Odometer reading at the moment of fueling. Not required today, but ' +
      'needed to later compute real fuel efficiency between consecutive logs.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  odometer?: number;

  @ApiPropertyOptional({ example: 'Estación Terpel Autopista Norte' })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  gasStation?: string;

  @ApiPropertyOptional({ example: 'Tanqueo completo, tanque lleno' })
  @IsString()
  @IsOptional()
  notes?: string;
}
