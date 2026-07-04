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

function addOneMonth(period: { billingMonth: number; billingYear: number }): {
  billingMonth: number;
  billingYear: number;
} {
  return period.billingMonth === 12
    ? { billingMonth: 1, billingYear: period.billingYear + 1 }
    : {
        billingMonth: period.billingMonth + 1,
        billingYear: period.billingYear,
      };
}

/**
 * Per-company billing period to open next. Unlike getNextBillingPeriod
 * (which is a pure "now + 1" wall-clock rule), this looks at the company's
 * own billing history so a company that has never been billed doesn't get
 * skipped straight to "now + 1":
 *  - No prior period at all (brand new company, or one that never had the
 *    cycle run for it) -> opens the CURRENT month first, same as any other
 *    company would have had it opened by now if the cycle had run on time.
 *  - Has a prior period -> advances exactly one month from it.
 * Either way the result is capped at getNextBillingPeriod (the ceiling
 * every other company is held to), so a company can never end up billed
 * further ahead than the rest in a single run. Once a company's last period
 * reaches that ceiling, this returns null: nothing left to open this run.
 */
export function resolveBillingPeriodForCompany(
  lastBilled: { billingMonth: number; billingYear: number } | null,
  referenceDate: Date = new Date(),
): { billingMonth: number; billingYear: number } | null {
  const ceiling = getNextBillingPeriod(referenceDate);

  const candidate = lastBilled
    ? addOneMonth(lastBilled)
    : {
        billingMonth: referenceDate.getMonth() + 1,
        billingYear: referenceDate.getFullYear(),
      };

  const isAfterCeiling =
    candidate.billingYear > ceiling.billingYear ||
    (candidate.billingYear === ceiling.billingYear &&
      candidate.billingMonth > ceiling.billingMonth);

  return isAfterCeiling ? null : candidate;
}
