import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { RelationshipType } from '../../../domain/enums/relationship-type.enum';

export class CreateStudentGuardianDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Student UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'Guardian UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  guardianId: string;

  @ApiProperty({ enum: RelationshipType, example: RelationshipType.MOTHER })
  @IsEnum(RelationshipType)
  @IsNotEmpty()
  relationshipType: RelationshipType;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Whether this guardian is the primary contact for the student. ' +
      'Setting to true automatically demotes any previous primary guardian.',
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
