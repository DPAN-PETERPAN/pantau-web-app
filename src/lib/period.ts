const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Reporting weeks run Minggu (Sun) - Sabtu (Sat). Teams get Senin-Kamis of the
 * following week to log data for the week that just ended, so the "current"
 * period for logging/tracking is always the most recently *completed* Sun-Sat
 * week - it doesn't roll forward to the in-progress week until that one also
 * finishes. E.g. on Senin 7 Sep 2026, the current period is 30 Agu - 5 Sep 2026,
 * and it stays that way through the following Sun 6 Sep before rolling over.
 */
export function currentPeriodRange(date: Date = new Date()): { start: Date; end: Date } {
  const today = atMidnight(date);
  const startOfThisWeek = addDays(today, -today.getDay());
  const start = addDays(startOfThisWeek, -7);
  const end = addDays(start, 6);
  return { start, end };
}

function formatRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = `${start.getDate()} ${BULAN_SINGKAT[start.getMonth()]}${sameYear ? "" : " " + start.getFullYear()}`;
  const endStr = `${end.getDate()} ${BULAN_SINGKAT[end.getMonth()]} ${end.getFullYear()}`;
  return `${startStr} - ${endStr}`;
}

/** "D Bln - D Bln Tahun" date range for the current reporting period, e.g. "30 Agu - 5 Sep 2026". */
export function currentPeriodLabel(date: Date = new Date()): string {
  const { start, end } = currentPeriodRange(date);
  return formatRange(start, end);
}

/**
 * Whether a timestamp was submitted *for* the current reporting period. A log
 * is filed during the Senin-Kamis grace window of the week *after* the period
 * it reports on (see currentPeriodRange), so its own submitted_at never falls
 * inside that period's own Sun-Sat date range - checking raw containment would
 * wrongly reject an on-time grace-window submission, and would just as wrongly
 * credit it to the *next* period once that grace window is itself in the past.
 * Instead, run both dates through the same "which period does this belong to"
 * rule (currentPeriodRange) and compare identities.
 */
export function isInCurrentPeriod(dateStr: string | null | undefined, referenceDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const logPeriod = currentPeriodRange(new Date(dateStr));
  const nowPeriod = currentPeriodRange(referenceDate);
  return logPeriod.start.getTime() === nowPeriod.start.getTime();
}

export function formatDateID(d: Date): string {
  return `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTimeID(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
