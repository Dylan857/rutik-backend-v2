import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGuardianDto } from './create-guardian.dto';

// companyId is immutable after creation.
// userId is updatable: a guardian account can be linked or unlinked from a user at any time.
export class UpdateGuardianDto extends PartialType(
  OmitType(CreateGuardianDto, ['companyId'] as const),
) {}
