/**
 * Computes the due date for a billing period, clamping paymentDueDay to the
 * last valid day of that month (e.g. 31 in February clamps to 28/29) so a
 * student's "fin de mes" preference works without a separate sentinel value.
 */
export function computeDueDate(
  billingYear: number,
  billingMonth: number,
  paymentDueDay: number,
): string {
  const lastDayOfMonth = new Date(billingYear, billingMonth, 0).getDate();
  const day = Math.min(paymentDueDay, lastDayOfMonth);
  const mm = String(billingMonth).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${billingYear}-${mm}-${dd}`;
}

/**
 * The billing cycle is always opened one calendar month ahead of "now",
 * regardless of which day of the current month it runs on — running it on
 * June 1st or June 30th both open July, never June. This lets the cycle be
 * triggered manually at any point near month-end without a risk of opening
 * the wrong (current) period.
 */
export function getNextBillingPeriod(referenceDate: Date = new Date()): {
  billingMonth: number;
  billingYear: number;
} {
  const currentMonth = referenceDate.getMonth() + 1; // 1-12
  const currentYear = referenceDate.getFullYear();

  return currentMonth === 12
    ? { billingMonth: 1, billingYear: currentYear + 1 }
    : { billingMonth: currentMonth + 1, billingYear: currentYear };
}
