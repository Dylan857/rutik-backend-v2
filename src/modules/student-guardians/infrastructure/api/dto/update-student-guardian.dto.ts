import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateStudentGuardianDto } from './create-student-guardian.dto';

// studentId and guardianId are immutable: the pair defines the relationship itself.
// To change who is linked, delete this record and create a new one.
export class UpdateStudentGuardianDto extends PartialType(
  OmitType(CreateStudentGuardianDto, ['studentId', 'guardianId'] as const),
) {}
