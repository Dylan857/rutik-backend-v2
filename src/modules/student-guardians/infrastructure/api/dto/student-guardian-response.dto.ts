import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RelationshipType } from '../../../domain/enums/relationship-type.enum';

export class StudentGuardianResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-345678901234' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  studentId: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  guardianId: string;

  @ApiProperty({ enum: RelationshipType, example: RelationshipType.MOTHER })
  @Expose()
  relationshipType: RelationshipType;

  @ApiProperty({
    example: true,
    description: 'Whether this is the primary contact for the student',
  })
  @Expose()
  isPrimary: boolean;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
