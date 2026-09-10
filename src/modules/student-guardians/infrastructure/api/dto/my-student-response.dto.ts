import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RelationshipType } from '../../../domain/enums/relationship-type.enum';
import { StudentStatus } from '../../../../students/domain/enums/student-status.enum';

export class MyStudentResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-345678901234' })
  @Expose()
  studentGuardianId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  studentId: string;

  @ApiProperty({ enum: RelationshipType, example: RelationshipType.MOTHER })
  @Expose()
  relationshipType: RelationshipType;

  @ApiProperty({ example: true })
  @Expose()
  isPrimary: boolean;

  @ApiProperty({ example: 'Luciana' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Pérez García' })
  @Expose()
  lastName: string;

  @ApiProperty({ example: '5°' })
  @Expose()
  grade: string;

  @ApiProperty({ enum: StudentStatus, example: StudentStatus.ACTIVE })
  @Expose()
  status: StudentStatus;

  @ApiProperty({ example: 'Ruta Mañana' })
  @Expose()
  scheduleName: string;

  @ApiPropertyOptional({
    example: '06:35:00',
    nullable: true,
    description: 'Schedule start time. Null if there is no active driver/vehicle assignment yet.',
  })
  @Expose()
  pickupTime: string | null;

  @ApiPropertyOptional({ example: 'Jorge', nullable: true })
  @Expose()
  driverFirstName: string | null;

  @ApiPropertyOptional({ example: 'Martínez', nullable: true })
  @Expose()
  driverLastName: string | null;
}
