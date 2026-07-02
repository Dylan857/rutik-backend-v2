import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSchoolScheduleDto } from './create-school-schedule.dto';

export class UpdateSchoolScheduleDto extends PartialType(
  OmitType(CreateSchoolScheduleDto, ['companyId', 'schoolId'] as const),
) {}
