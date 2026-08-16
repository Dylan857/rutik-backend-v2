import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { AuditAction } from '../../../../audit-logs/domain/enums/audit-action.enum';
import { AuditEntityType } from '../../../../audit-logs/domain/enums/audit-entity-type.enum';

export class RecentActivityDto {
  @ApiProperty({ example: 'f6a7b8c9-d0e1-2345-fabc-456789012345' })
  @Expose()
  id: string;

  @ApiProperty({ enum: AuditAction, example: AuditAction.CREATED })
  @Expose()
  action: AuditAction;

  @ApiProperty({ enum: AuditEntityType, example: AuditEntityType.STUDENT })
  @Expose()
  entityType: AuditEntityType;

  @ApiPropertyOptional({
    example: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
    nullable: true,
  })
  @Expose()
  entityId: string | null;

  @ApiProperty({ example: 'Se registró el estudiante María Gómez' })
  @Expose()
  description: string;

  @ApiPropertyOptional({ example: 'admin@rutik.com', nullable: true })
  @Expose()
  actorEmail: string | null;

  @ApiProperty({ example: '2026-06-30T14:22:00.000Z' })
  @Expose({ name: 'createdAt' })
  occurredAt: Date;
}
