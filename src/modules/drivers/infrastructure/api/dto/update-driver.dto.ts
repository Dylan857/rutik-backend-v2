import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto';

// companyId is immutable after creation.
// Personal info (firstName, lastName, document, phone, email, password) lives on the
// User entity and is updated via PATCH /users/:userId.
// Only driver-specific operational fields are updatable here.
export class UpdateDriverDto extends PartialType(
  OmitType(CreateDriverDto, [
    'companyId',
    'firstName',
    'lastName',
    'document',
    'email',
    'password',
    'phone',
  ] as const),
) {}
