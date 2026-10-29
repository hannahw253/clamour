/**
 * Dates for the prototype. Everything is read in UK time (Europe/London), because
 * legal clocks count UK working days whatever device or server the app runs on.
 */

const LONDON = "Europe/London";

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A calendar date in UK time, as YYYY-MM-DD. */
export type Ymd = string;

export function londonParts(iso: string | Date): { ymd: Ymd; hour: number; minute: number } {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(typeof iso === "string" ? new Date(iso) : iso).map((p) => [p.type, p.value]),
  );
  return { ymd: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

export function todayYmd(now = new Date()): Ymd {
  return londonParts(now).ymd;
}

function ymdToUtc(ymd: Ymd): Date {
  return new Date(`${ymd}T12:00:00Z`);
}

export function addDays(ymd: Ymd, days: number): Ymd {
  const d = ymdToUtc(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(ymd: Ymd): number {
  return ymdToUtc(ymd).getUTCDay();
}

/** Whole calendar days from a to b (b later gives a positive number). */
export function daysBetween(a: Ymd, b: Ymd): number {
  return Math.round((ymdToUtc(b).getTime() - ymdToUtc(a).getTime()) / 86_400_000);
}

/** "Mon 9 Nov" */
export function shortDate(ymd: Ymd): string {
  return ymdToUtc(ymd).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** "Monday 9 November 2026" */
export function longDate(ymd: Ymd): string {
  return ymdToUtc(ymd).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "9 November 2026", for letters. */
export function letterDate(ymd: Ymd): string {
  return ymdToUtc(ymd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const stampFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

/** Evidence timestamp: "28 Oct 2026, 14:03 GMT". */
export function stamp(iso: string): string {
  return stampFormat.format(new Date(iso));
}

/** "today", "yesterday" or "12 days ago". */
export function agoWords(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Value for a datetime-local input, in the device's own time. */
export function toLocalInput(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
