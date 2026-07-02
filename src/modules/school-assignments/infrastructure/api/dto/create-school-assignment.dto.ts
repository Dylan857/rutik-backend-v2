import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { AssignmentStatus } from '../../../domain/enums/assignment-status.enum';

export class CreateSchoolAssignmentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Company UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'School UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-234567890123',
    description: 'SchoolSchedule UUID (must belong to the given school)',
  })
  @IsUUID()
  @IsNotEmpty()
  scheduleId: string;

  @ApiProperty({
    example: 'd4e5f6a7-b8c9-0123-defa-345678901234',
    description: 'Driver UUID (must belong to the same company)',
  })
  @IsUUID()
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({
    example: 'e5f6a7b8-c9d0-1234-efab-456789012345',
    description: 'Vehicle UUID (must belong to the same company)',
  })
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @ApiPropertyOptional({
    enum: AssignmentStatus,
    default: AssignmentStatus.ACTIVE,
  })
  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;
}
