import { PartialType, PickType } from '@nestjs/swagger';
import { CreateDriverPaymentDto } from './create-driver-payment.dto';

// Only these fields are mutable after creation.
// companyId, driverId, periodStart, and periodEnd are intentionally immutable
// to preserve the integrity of the payment period record.
export class UpdateDriverPaymentDto extends PartialType(
  PickType(CreateDriverPaymentDto, [
    'salaryAmount',
    'amountPaid',
    'paidAt',
    'paymentMethod',
    'notes',
  ] as const),
) {}
