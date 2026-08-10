import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RouteStatus } from '../../../domain/enums/route-status.enum';

export class SchoolRouteResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  companyId: string;

  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-234567890123',
    description: 'Linked SchoolAssignment UUID',
  })
  @Expose()
  schoolAssignmentId: string;

  @ApiProperty({ enum: RouteStatus, example: RouteStatus.ACTIVE })
  @Expose()
  status: RouteStatus;

  @ApiProperty({
    example: '_ibE_seK_seK_seK',
    description: 'Encoded Google polyline for the optimized route, if computed',
    nullable: true,
  })
  @Expose()
  polyline: string | null;

  @ApiProperty({ example: 12500, nullable: true })
  @Expose()
  distanceMeters: number | null;

  @ApiProperty({ example: 1800, nullable: true })
  @Expose()
  durationSeconds: number | null;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z', nullable: true })
  @Expose()
  directionsUpdatedAt: Date | null;

  @ApiProperty({
    example: '_ibE_seK_seK_seK',
    description:
      'Encoded Google polyline for the return (drop-off) leg, if computed',
    nullable: true,
  })
  @Expose()
  polylineReturn: string | null;

  @ApiProperty({ example: 12800, nullable: true })
  @Expose()
  distanceMetersReturn: number | null;

  @ApiProperty({ example: 1850, nullable: true })
  @Expose()
  durationSecondsReturn: number | null;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
