import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto';

// companyId is immutable after creation, and the password is changed through
// the password-reset flow, not here. Personal info (firstName, lastName,
// document, email, phone) is accepted and written through to the driver's
// linked User account; the rest updates the driver profile itself.
export class UpdateDriverDto extends PartialType(
  OmitType(CreateDriverDto, ['companyId', 'password'] as const),
) {}
