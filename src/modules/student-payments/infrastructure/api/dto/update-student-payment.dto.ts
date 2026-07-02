import { PartialType, PickType } from '@nestjs/swagger';
import { CreateStudentPaymentDto } from './create-student-payment.dto';

// Only these fields are mutable after creation.
// companyId, studentId, billingMonth, and billingYear are intentionally immutable
// to preserve the integrity of the billing period record.
export class UpdateStudentPaymentDto extends PartialType(
  PickType(CreateStudentPaymentDto, [
    'monthlyFee',
    'amountPaid',
    'paidAt',
    'paymentMethod',
    'notes',
  ] as const),
) {}
