import { AbsenceLeg } from '../domain/enums/absence-leg.enum';
import {
  cutoffTimeFor,
  formatDateEs,
  isPastCutoff,
  mergeLegs,
  zonedNow,
} from './absence-cutoff.util';

const SCHEDULE = { startTime: '06:30:00', endTime: '13:00:00' };

describe('absence-cutoff.util', () => {
  describe('zonedNow', () => {
    it('converts to the company timezone (Bogotá is UTC-5)', () => {
      // 03:00 UTC on the 25th is still 22:00 on the 24th in Bogotá.
      expect(
        zonedNow('America/Bogota', new Date('2026-11-25T03:00:00Z')),
      ).toEqual({
        date: '2026-11-24',
        time: '22:00',
      });
    });
  });

  describe('cutoffTimeFor', () => {
    it('uses entry time for ida and for ida+regreso, exit time for regreso', () => {
      expect(cutoffTimeFor(AbsenceLeg.PICKUP, SCHEDULE)).toBe('06:30');
      expect(cutoffTimeFor(AbsenceLeg.BOTH, SCHEDULE)).toBe('06:30');
      expect(cutoffTimeFor(AbsenceLeg.DROPOFF, SCHEDULE)).toBe('13:00');
    });
  });

  describe('isPastCutoff', () => {
    const today = '2026-11-25';

    it('is always past for an earlier date and never for a later one', () => {
      const now = { date: today, time: '00:00' };
      expect(
        isPastCutoff('2026-11-24', AbsenceLeg.DROPOFF, SCHEDULE, now),
      ).toBe(true);
      expect(
        isPastCutoff('2026-11-26', AbsenceLeg.PICKUP, SCHEDULE, {
          date: today,
          time: '23:59',
        }),
      ).toBe(false);
    });

    it('closes the ida at the entry time, the regreso at the exit time', () => {
      const before = { date: today, time: '06:29' };
      const atEntry = { date: today, time: '06:30' };
      const midday = { date: today, time: '12:59' };
      const atExit = { date: today, time: '13:00' };

      expect(isPastCutoff(today, AbsenceLeg.PICKUP, SCHEDULE, before)).toBe(
        false,
      );
      expect(isPastCutoff(today, AbsenceLeg.PICKUP, SCHEDULE, atEntry)).toBe(
        true,
      );
      expect(isPastCutoff(today, AbsenceLeg.BOTH, SCHEDULE, atEntry)).toBe(
        true,
      );
      expect(isPastCutoff(today, AbsenceLeg.DROPOFF, SCHEDULE, midday)).toBe(
        false,
      );
      expect(isPastCutoff(today, AbsenceLeg.DROPOFF, SCHEDULE, atExit)).toBe(
        true,
      );
    });
  });

  it('mergeLegs widens to BOTH when the legs differ', () => {
    expect(mergeLegs(AbsenceLeg.PICKUP, AbsenceLeg.PICKUP)).toBe(
      AbsenceLeg.PICKUP,
    );
    expect(mergeLegs(AbsenceLeg.PICKUP, AbsenceLeg.DROPOFF)).toBe(
      AbsenceLeg.BOTH,
    );
    expect(mergeLegs(AbsenceLeg.BOTH, AbsenceLeg.DROPOFF)).toBe(
      AbsenceLeg.BOTH,
    );
  });

  it('formatDateEs keeps the calendar day', () => {
    expect(formatDateEs('2026-11-25')).toBe('miércoles, 25 de noviembre');
  });
});
