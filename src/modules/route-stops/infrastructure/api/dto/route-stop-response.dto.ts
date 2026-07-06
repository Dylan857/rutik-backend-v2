import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RouteStopResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'SchoolRoute UUID',
  })
  @Expose()
  schoolRouteId: string;

  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-234567890123',
    description: 'Student UUID',
  })
  @Expose()
  studentId: string;

  @ApiProperty({
    example: 3,
    description:
      'Pickup (ida) order within the route (1-based, ascending). ' +
      'Null if the student\'s tripType is DROPOFF_ONLY.',
    nullable: true,
  })
  @Expose()
  stopOrder: number | null;

  @ApiProperty({
    example: 2,
    description:
      'Dropoff (regreso) order within the route (1-based, ascending), ' +
      'computed independently from stopOrder. Null if the student\'s ' +
      'tripType is PICKUP_ONLY.',
    nullable: true,
  })
  @Expose()
  stopOrderReturn: number | null;

  @ApiProperty({
    example: 4.710989,
    description: 'Student latitude captured at assignment time',
  })
  @Expose()
  latitudeSnapshot: number;

  @ApiProperty({
    example: -74.07209,
    description: 'Student longitude captured at assignment time',
  })
  @Expose()
  longitudeSnapshot: number;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
