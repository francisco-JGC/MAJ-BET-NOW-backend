/**
 * Operators live in a Central American CST timezone and every wall-clock
 * time in the domain (`draw_schedules.draw_time`, "today" boundaries, cutoff
 * math) is interpreted in this zone — independently of the process's local
 * timezone. Wrapping all TZ math here means `TZ=UTC` in prod, `TZ=CST` in
 * dev, or containers with no TZ configured all produce identical results.
 */
export const BUSINESS_TZ = 'America/Managua';

export interface BusinessWallClock {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  /** 0 = Sunday .. 6 = Saturday (matches `Date.getDay()` and PG EXTRACT(DOW)). */
  dayOfWeek: number;
}

const WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Returns the wall-clock components of `date` as observed in BUSINESS_TZ.
 * DST-safe: relies on the ICU database inside Node's `Intl`, not on offsets.
 */
export function toBusinessWallClock(date: Date): BusinessWallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const pick = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const rawHour = Number(pick('hour'));
  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    // `en-US` occasionally emits "24" for midnight. Normalize.
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(pick('minute')),
    dayOfWeek: WEEKDAY_TO_DOW[pick('weekday')] ?? 0,
  };
}

/**
 * Builds an absolute Date whose BUSINESS_TZ wall clock equals the passed
 * components. Uses a one-shot correction against the observed offset, so it
 * works across DST transitions (unlike naïve `new Date(y, mo-1, d, h, m)`,
 * which depends on the server's local TZ).
 */
export function fromBusinessWallClock(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute);
  const wall = toBusinessWallClock(new Date(guessUtc));
  const observedUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  return new Date(guessUtc - (observedUtc - guessUtc));
}

/** "HH:MM" → minutes since midnight. */
export function parseHhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  return h * 60 + m;
}
