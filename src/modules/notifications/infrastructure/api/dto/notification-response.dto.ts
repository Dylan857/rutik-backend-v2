import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { NotificationSeverity } from '../../../domain/enums/notification-severity.enum';
import { NotificationSourceType } from '../../../domain/enums/notification-source-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-234567890123' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.VEHICLE_DOCUMENT_EXPIRING,
  })
  @Expose()
  type: NotificationType;

  @ApiProperty({
    enum: NotificationSeverity,
    example: NotificationSeverity.WARNING,
  })
  @Expose()
  severity: NotificationSeverity;

  @ApiProperty({ example: 'SOAT próximo a vencer' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'El SOAT del vehículo ABC-123 vence en 8 días.' })
  @Expose()
  message: string;

  @ApiPropertyOptional({
    enum: NotificationSourceType,
    example: NotificationSourceType.VEHICLE,
    nullable: true,
  })
  @Expose()
  sourceType: NotificationSourceType | null;

  @ApiPropertyOptional({
    example: 'c3d4e5f6-a7b8-9012-cdef-234567890123',
    nullable: true,
  })
  @Expose()
  sourceId: string | null;

  @ApiProperty({ example: false })
  @Expose()
  isRead: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  @Expose()
  readAt: Date | null;

  @ApiProperty({ example: '2026-07-23T10:30:00.000Z' })
  @Expose()
  createdAt: Date;
}
