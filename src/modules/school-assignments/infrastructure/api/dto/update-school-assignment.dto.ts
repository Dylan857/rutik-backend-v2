import { PartialType, PickType } from '@nestjs/swagger';
import { CreateSchoolAssignmentDto } from './create-school-assignment.dto';

// companyId, schoolId, and scheduleId are immutable after creation — they define
// the operational context. Only the assigned resources and status are updatable.
export class UpdateSchoolAssignmentDto extends PartialType(
  PickType(CreateSchoolAssignmentDto, [
    'driverId',
    'vehicleId',
    'status',
  ] as const),
) {}
