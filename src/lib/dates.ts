const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY);
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / MINUTE);
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export function formatRelative(iso: string, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - new Date(iso).getTime());
  if (elapsed < MINUTE) return plural(Math.round(elapsed / 1000), "second");
  if (elapsed < HOUR) return plural(Math.round(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return plural(Math.round(elapsed / HOUR), "hour");
  return plural(Math.round(elapsed / DAY), "day");
}

export function formatUtc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
