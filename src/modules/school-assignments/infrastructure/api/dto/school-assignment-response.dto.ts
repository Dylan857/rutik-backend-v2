import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { AssignmentStatus } from '../../../domain/enums/assignment-status.enum';

class AssignmentSchoolSummaryDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Colegio San Ignacio' })
  @Expose()
  name: string;
}

class AssignmentDriverSummaryDto {
  @ApiProperty({ example: 'd4e5f6a7-b8c9-0123-defa-345678901234' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Carlos' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Ramírez' })
  @Expose()
  lastName: string;
}

class AssignmentVehicleSummaryDto {
  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-efab-456789012345' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'ABC123' })
  @Expose()
  plate: string;
}

export class SchoolAssignmentResponseDto {
  @ApiProperty({ example: 'f6a7b8c9-d0e1-2345-fabc-567890123456' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  companyId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  schoolId: string;

  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-234567890123' })
  @Expose()
  scheduleId: string;

  @ApiProperty({ example: 'd4e5f6a7-b8c9-0123-defa-345678901234' })
  @Expose()
  driverId: string;

  @ApiProperty({ example: 'e5f6a7b8-c9d0-1234-efab-456789012345' })
  @Expose()
  vehicleId: string;

  @ApiProperty({ enum: AssignmentStatus, example: AssignmentStatus.ACTIVE })
  @Expose()
  status: AssignmentStatus;

  @ApiPropertyOptional({
    type: AssignmentSchoolSummaryDto,
    description: 'Embedded school summary — avoids a separate /schools lookup',
  })
  @Expose()
  school?: AssignmentSchoolSummaryDto;

  @ApiPropertyOptional({
    type: AssignmentDriverSummaryDto,
    description: 'Embedded driver summary — avoids a separate /users lookup',
  })
  @Expose()
  driver?: AssignmentDriverSummaryDto;

  @ApiPropertyOptional({
    type: AssignmentVehicleSummaryDto,
    description:
      'Embedded vehicle summary — avoids a separate /vehicles lookup',
  })
  @Expose()
  vehicle?: AssignmentVehicleSummaryDto;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
