import { PartialType, PickType } from '@nestjs/swagger';
import { CreatePaymentAccountDto } from './create-payment-account.dto';

// companyId is immutable after creation.
export class UpdatePaymentAccountDto extends PartialType(
  PickType(CreatePaymentAccountDto, [
    'type',
    'bankName',
    'accountHolder',
    'accountNumber',
    'accountTypeLabel',
    'active',
    'displayOrder',
  ] as const),
) {}
