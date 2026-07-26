import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FuelLogResponseDto {
  @ApiProperty({ example: 'd4e5f6a7-b8c9-0123-defa-456789012345' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  vehicleId: string;

  @ApiProperty({ example: '2026-07-20' })
  @Expose()
  date: string;

  @ApiProperty({ example: 250000 })
  @Expose()
  amountPaid: number;

  @ApiProperty({ example: 32.5 })
  @Expose()
  gallons: number;

  @ApiPropertyOptional({ example: 45230, nullable: true })
  @Expose()
  odometer: number | null;

  @ApiPropertyOptional({
    example: 'Estación Terpel Autopista Norte',
    nullable: true,
  })
  @Expose()
  gasStation: string | null;

  @ApiPropertyOptional({
    example: 'Tanqueo completo, tanque lleno',
    nullable: true,
  })
  @Expose()
  notes: string | null;

  @ApiProperty({ example: '2026-07-20T14:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-07-20T14:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
