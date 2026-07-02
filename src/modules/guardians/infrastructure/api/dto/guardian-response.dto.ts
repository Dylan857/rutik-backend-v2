import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { GuardianStatus } from '../../../domain/enums/guardian-status.enum';

export class GuardianResponseDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-efab-345678901234' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    nullable: true,
  })
  @Expose()
  userId: string | null;

  @ApiProperty({ example: 'María' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Ramírez Torres' })
  @Expose()
  lastName: string;

  @ApiProperty({ example: '43215678' })
  @Expose()
  document: string;

  @ApiProperty({ example: '+57 310 123 4567' })
  @Expose()
  phone: string;

  @ApiProperty({ example: 'maria.ramirez@email.com' })
  @Expose()
  email: string;

  @ApiPropertyOptional({ example: 'Calle 50 #30-20, Medellín', nullable: true })
  @Expose()
  address: string | null;

  @ApiProperty({ enum: GuardianStatus, example: GuardianStatus.ACTIVE })
  @Expose()
  status: GuardianStatus;

  @ApiPropertyOptional({
    example: 'Guardian prefers to be contacted after 5pm.',
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
