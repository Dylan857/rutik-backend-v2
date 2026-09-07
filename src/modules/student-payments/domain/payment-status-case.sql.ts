import { PaymentStatus } from './enums/payment-status.enum';

/**
 * Raw SQL CASE expression that derives a payment's live status the same way
 * StudentPaymentsService.deriveComputedFields does (priority order PAID >
 * PARTIAL > OVERDUE > PENDING). The persisted `status` column can be stale —
 * there is no cron sweeping PENDING rows into OVERDUE — so every aggregation
 * that needs status must recompute it this way instead of trusting the
 * column, exactly like individual reads already do.
 *
 * Expects the StudentPayment query builder alias to be `payment`.
 */
export const PAYMENT_STATUS_CASE = `
  CASE
    WHEN payment.submittedAt IS NOT NULL THEN '${PaymentStatus.IN_REVIEW}'
    WHEN payment.amountPaid >= payment.monthlyFee THEN '${PaymentStatus.PAID}'
    WHEN payment.amountPaid > 0 THEN '${PaymentStatus.PARTIAL}'
    WHEN payment.dueDate IS NOT NULL AND payment.dueDate < CURRENT_DATE THEN '${PaymentStatus.OVERDUE}'
    ELSE '${PaymentStatus.PENDING}'
  END
`;
