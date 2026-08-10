import { PaymentType } from '../../drivers/domain/enums/payment-type.enum';
import {
  advancePeriod,
  computeFirstPeriod,
  resolveNextPeriodForDriver,
} from './payment-period.util';

describe('payment-period.util', () => {
  describe('computeFirstPeriod', () => {
    it('MONTHLY: prorated first period runs from hireDate to the end of that same month, regardless of when in the month they were hired', () => {
      expect(computeFirstPeriod('2026-07-07', PaymentType.MONTHLY)).toEqual({
        periodStart: '2026-07-07',
        periodEnd: '2026-07-31',
      });
    });

    it('MONTHLY: clamps the month-end cutoff to a shorter month', () => {
      expect(computeFirstPeriod('2026-02-03', PaymentType.MONTHLY)).toEqual({
        periodStart: '2026-02-03',
        // 2026 is not a leap year: Feb has 28 days
        periodEnd: '2026-02-28',
      });
    });

    it('BIWEEKLY: hired before the 15th -> first cutoff is the 15th of that month', () => {
      expect(computeFirstPeriod('2026-07-03', PaymentType.BIWEEKLY)).toEqual({
        periodStart: '2026-07-03',
        periodEnd: '2026-07-15',
      });
    });

    it('BIWEEKLY: hired after the 15th -> first cutoff is the end of that month', () => {
      expect(computeFirstPeriod('2026-07-20', PaymentType.BIWEEKLY)).toEqual({
        periodStart: '2026-07-20',
        periodEnd: '2026-07-31',
      });
    });

    it('BIWEEKLY: hired exactly on the 15th -> cutoff is the 15th itself (same-day period)', () => {
      expect(computeFirstPeriod('2026-07-15', PaymentType.BIWEEKLY)).toEqual({
        periodStart: '2026-07-15',
        periodEnd: '2026-07-15',
      });
    });

    it('WEEKLY: hired mid-week -> first cutoff is the Friday of that same Mon-Fri week', () => {
      // 2026-07-08 is a Wednesday
      expect(computeFirstPeriod('2026-07-08', PaymentType.WEEKLY)).toEqual({
        periodStart: '2026-07-08',
        periodEnd: '2026-07-10', // Friday
      });
    });

    it("WEEKLY: hired on a Monday -> cutoff is that same week's Friday (full 5-day week)", () => {
      // 2026-07-06 is a Monday
      expect(computeFirstPeriod('2026-07-06', PaymentType.WEEKLY)).toEqual({
        periodStart: '2026-07-06',
        periodEnd: '2026-07-10',
      });
    });

    it('WEEKLY: hired on a weekend -> rolls to the Friday of the FOLLOWING work week', () => {
      // 2026-07-11 is a Saturday
      expect(computeFirstPeriod('2026-07-11', PaymentType.WEEKLY)).toEqual({
        periodStart: '2026-07-11',
        periodEnd: '2026-07-17', // next Friday
      });
    });
  });

  describe('advancePeriod', () => {
    it('MONTHLY: every subsequent period is a full calendar month, independent of hireDate', () => {
      const first = computeFirstPeriod('2026-07-07', PaymentType.MONTHLY);
      const second = advancePeriod(PaymentType.MONTHLY, first);
      expect(second).toEqual({
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      });

      const third = advancePeriod(PaymentType.MONTHLY, second);
      expect(third).toEqual({
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
      });
    });

    it('BIWEEKLY: alternates cleanly between the 1-15 and 16-end quincenas', () => {
      const first = computeFirstPeriod('2026-07-03', PaymentType.BIWEEKLY); // ends 2026-07-15
      const second = advancePeriod(PaymentType.BIWEEKLY, first);
      expect(second).toEqual({
        periodStart: '2026-07-16',
        periodEnd: '2026-07-31',
      });

      const third = advancePeriod(PaymentType.BIWEEKLY, second);
      expect(third).toEqual({
        periodStart: '2026-08-01',
        periodEnd: '2026-08-15',
      });
    });

    it('WEEKLY: advances to the next Monday-Friday week, skipping the weekend', () => {
      const first = computeFirstPeriod('2026-07-08', PaymentType.WEEKLY); // ends Friday 2026-07-10
      const second = advancePeriod(PaymentType.WEEKLY, first);
      expect(second).toEqual({
        periodStart: '2026-07-13',
        periodEnd: '2026-07-17',
      });
    });

    it('MONTHLY: two drivers hired on different days converge to identical periods from the second period on', () => {
      const driverA = advancePeriod(
        PaymentType.MONTHLY,
        computeFirstPeriod('2026-07-01', PaymentType.MONTHLY),
      );
      const driverB = advancePeriod(
        PaymentType.MONTHLY,
        computeFirstPeriod('2026-07-29', PaymentType.MONTHLY),
      );
      expect(driverA).toEqual(driverB);
      expect(driverA).toEqual({
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      });
    });
  });

  describe('resolveNextPeriodForDriver', () => {
    it('MONTHLY: opens the current period days before month-end — the cycle can be launched ahead of the cutoff, e.g. the 25th-29th', () => {
      const referenceDate = new Date(2026, 6, 26); // Jul 26, days before month-end
      expect(
        resolveNextPeriodForDriver(
          '2026-07-01',
          PaymentType.MONTHLY,
          null,
          referenceDate,
        ),
      ).toEqual({ periodStart: '2026-07-01', periodEnd: '2026-07-31' });
    });

    it('MONTHLY: opens the current period even mid-month, right after hire', () => {
      const referenceDate = new Date(2026, 6, 8); // Jul 8, right after hiring
      expect(
        resolveNextPeriodForDriver(
          '2026-07-07',
          PaymentType.MONTHLY,
          null,
          referenceDate,
        ),
      ).toEqual({ periodStart: '2026-07-07', periodEnd: '2026-07-31' });
    });

    it('MONTHLY: does not open NEXT month before this month is even over — capped at one period ahead', () => {
      const lastBilled = { periodStart: '2026-07-01', periodEnd: '2026-07-31' };
      const referenceDate = new Date(2026, 6, 31); // still July
      expect(
        resolveNextPeriodForDriver(
          '2026-07-01',
          PaymentType.MONTHLY,
          lastBilled,
          referenceDate,
        ),
      ).toBeNull(); // already open for July — running again this month is a no-op
    });

    it('WEEKLY: opens the current Mon-Fri week before Friday arrives, same as the other frequencies', () => {
      const hireDate = '2026-07-08'; // Wednesday, cutoff is Friday 2026-07-10
      expect(
        resolveNextPeriodForDriver(
          hireDate,
          PaymentType.WEEKLY,
          null,
          new Date(2026, 6, 9),
        ), // Thursday
      ).toEqual({ periodStart: '2026-07-08', periodEnd: '2026-07-10' });
    });

    it('advances only one period past lastBilled, even if more than one cutoff has since passed', () => {
      const lastBilled = { periodStart: '2026-07-01', periodEnd: '2026-07-31' };
      const referenceDate = new Date(2026, 9, 15); // months later

      expect(
        resolveNextPeriodForDriver(
          '2026-07-01',
          PaymentType.MONTHLY,
          lastBilled,
          referenceDate,
        ),
      ).toEqual({ periodStart: '2026-08-01', periodEnd: '2026-08-31' });
    });
  });
});
