import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CompanyStatus } from '../../../domain/enums/company-status.enum';

export class CompanyResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Transportes Escolar S.A.S' })
  @Expose()
  name: string;

  @ApiProperty({ example: '900123456-7' })
  @Expose()
  nit: string;

  @ApiProperty({ example: 'admin@transportes.com' })
  @Expose()
  email: string;

  @ApiPropertyOptional({ example: '+57 320 123 4567', nullable: true })
  @Expose()
  phone: string | null;

  @ApiPropertyOptional({
    example: 'Calle 123 #45-67, Bogotá, Colombia',
    nullable: true,
  })
  @Expose()
  address: string | null;

  @ApiPropertyOptional({ example: 6.2442, nullable: true })
  @Expose()
  latitude: number | null;

  @ApiPropertyOptional({ example: -75.5812, nullable: true })
  @Expose()
  longitude: number | null;

  @ApiProperty({ enum: CompanyStatus, example: CompanyStatus.ACTIVE })
  @Expose()
  status: CompanyStatus;

  @ApiProperty({ example: 'America/Bogota' })
  @Expose()
  timezone: string;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
