import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

// companyId and schoolId are immutable after creation.
// scheduleId is updatable: a student may change schedules within the same school.
export class UpdateStudentDto extends PartialType(
  OmitType(CreateStudentDto, ['companyId', 'schoolId'] as const),
) {}
