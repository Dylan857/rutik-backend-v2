import { PaymentType } from '../../drivers/domain/enums/payment-type.enum';

export interface PaymentPeriod {
  periodStart: string;
  periodEnd: string;
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateOnly(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function lastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** ISO day of week: Monday = 1 ... Sunday = 7 (JS's getDay() has Sunday = 0). */
function isoDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * The cutoff date (periodEnd) for the calendar period that contains `date`,
 * per payment frequency. Unlike a fixed N-days-from-hire block, these
 * cutoffs are the SAME real-world dates for every driver of that frequency
 * — a driver hired mid-month is still paid at month-end like everyone else,
 * not a month after their hire date.
 *
 *  - MONTHLY: last day of the month containing `date`.
 *  - BIWEEKLY: the 15th if `date` is on/before the 15th, otherwise the last
 *    day of the month ("quincenas": 1-15, 16-fin de mes).
 *  - WEEKLY: the Friday of the Monday-Friday work week containing `date`. A
 *    `date` that falls on a weekend resolves to the Friday of the FOLLOWING
 *    work week (there's no Mon-Fri week "containing" a Saturday or Sunday).
 */
function cutoffForType(date: Date, paymentType: PaymentType): Date {
  switch (paymentType) {
    case PaymentType.WEEKLY: {
      const dow = isoDayOfWeek(date);
      const daysUntilFriday = dow <= 5 ? 5 - dow : 5 + 7 - dow;
      return addDays(date, daysUntilFriday);
    }
    case PaymentType.BIWEEKLY:
      return date.getDate() <= 15
        ? new Date(date.getFullYear(), date.getMonth(), 15)
        : lastDayOfMonth(date);
    case PaymentType.MONTHLY:
    default:
      return lastDayOfMonth(date);
  }
}

/**
 * The first day of the period right after a cutoff date. MONTHLY/BIWEEKLY
 * cutoffs roll straight into the next calendar day; a WEEKLY cutoff (always
 * a Friday) rolls into the following Monday, skipping the weekend so every
 * period after the first stays aligned to a clean Mon-Fri work week.
 */
function nextPeriodStart(
  previousPeriodEnd: Date,
  paymentType: PaymentType,
): Date {
  return addDays(previousPeriodEnd, paymentType === PaymentType.WEEKLY ? 3 : 1);
}

/**
 * The first period ever open for a driver: starts exactly on hireDate (even
 * if that's mid-month/mid-week) and ends at the next calendar cutoff for
 * their payment frequency — a prorated first period, same as everyone else
 * gets paid at that same cutoff.
 */
export function computeFirstPeriod(
  hireDate: string,
  paymentType: PaymentType,
): PaymentPeriod {
  const start = parseDateOnly(hireDate);
  const end = cutoffForType(start, paymentType);
  return { periodStart: formatDateOnly(start), periodEnd: formatDateOnly(end) };
}

/** The period immediately following `lastPeriod`, contiguous with no gap. */
export function advancePeriod(
  paymentType: PaymentType,
  lastPeriod: PaymentPeriod,
): PaymentPeriod {
  const start = nextPeriodStart(
    parseDateOnly(lastPeriod.periodEnd),
    paymentType,
  );
  const end = cutoffForType(start, paymentType);
  return { periodStart: formatDateOnly(start), periodEnd: formatDateOnly(end) };
}

/**
 * Next period to open for a driver — either the first one ever, or the one
 * right after `lastBilled` — capped at the period containing `referenceDate`
 * (its own calendar cutoff, e.g. this month's last day for MONTHLY).
 *
 * Mirrors StudentPaymentsService's billing-cycle ceiling: the cycle can be
 * launched any day — companies typically run it a few days ahead of each
 * cutoff (e.g. the 25th-29th for MONTHLY, to leave room for weekends or for
 * admins who pay a few days early) — and it opens the current period as a
 * PENDING record rather than waiting for the cutoff to already be in the
 * past. The point of the record existing is to surface an upcoming payment,
 * not to only show up once it's already overdue.
 *
 * Only one period is advanced per call past `lastBilled`, so calling this
 * again within the same period is a no-op (returns null: already open) —
 * safe to call repeatedly near each cutoff without ever skipping a driver
 * ahead by more than one period.
 */
export function resolveNextPeriodForDriver(
  hireDate: string,
  paymentType: PaymentType,
  lastBilled: PaymentPeriod | null,
  referenceDate: Date = new Date(),
): PaymentPeriod | null {
  const ceiling = cutoffForType(referenceDate, paymentType);

  const candidate = lastBilled
    ? advancePeriod(paymentType, lastBilled)
    : computeFirstPeriod(hireDate, paymentType);

  const isAfterCeiling =
    parseDateOnly(candidate.periodEnd).getTime() > ceiling.getTime();
  return isAfterCeiling ? null : candidate;
}
