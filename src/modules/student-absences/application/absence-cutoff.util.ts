import { AbsenceLeg } from '../domain/enums/absence-leg.enum';

/** Current local date/time in a company's timezone. */
export interface ZonedNow {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export interface ScheduleTimes {
  startTime: string; // HH:mm[:ss] — school entry, when the pickup leg ends
  endTime: string; // HH:mm[:ss] — school exit, when the dropoff leg starts
}

export function zonedNow(timeZone: string, now: Date = new Date()): ZonedNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/**
 * Latest time-of-day an absence for `leg` can still be reported or
 * cancelled: the pickup leg is decided by the school's entry time, the
 * dropoff leg by its exit time. BOTH is bound by the earlier one (pickup),
 * since the route would already be running.
 */
export function cutoffTimeFor(
  leg: AbsenceLeg,
  schedule: ScheduleTimes,
): string {
  const time =
    leg === AbsenceLeg.DROPOFF ? schedule.endTime : schedule.startTime;
  return time.slice(0, 5);
}

/** True once it's too late to report/cancel `leg` for `date`. */
export function isPastCutoff(
  date: string,
  leg: AbsenceLeg,
  schedule: ScheduleTimes,
  now: ZonedNow,
): boolean {
  if (date < now.date) return true;
  if (date > now.date) return false;
  return now.time >= cutoffTimeFor(leg, schedule);
}

/** Union of two legs — PICKUP + DROPOFF (or anything + BOTH) is BOTH. */
export function mergeLegs(a: AbsenceLeg, b: AbsenceLeg): AbsenceLeg {
  return a === b ? a : AbsenceLeg.BOTH;
}

export function coversPickup(leg: AbsenceLeg): boolean {
  return leg === AbsenceLeg.PICKUP || leg === AbsenceLeg.BOTH;
}

export function coversDropoff(leg: AbsenceLeg): boolean {
  return leg === AbsenceLeg.DROPOFF || leg === AbsenceLeg.BOTH;
}

const LEG_LABELS: Record<AbsenceLeg, string> = {
  [AbsenceLeg.PICKUP]: 'solo ida',
  [AbsenceLeg.DROPOFF]: 'solo regreso',
  [AbsenceLeg.BOTH]: 'ida y regreso',
};

export function legLabel(leg: AbsenceLeg): string {
  return LEG_LABELS[leg];
}

/** "martes 25 de noviembre" — for notification copy. */
export function formatDateEs(date: string): string {
  // Noon UTC keeps the calendar day stable regardless of the server's zone.
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}
