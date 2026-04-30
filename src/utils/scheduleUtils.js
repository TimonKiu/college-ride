export function formatScheduleMinutes(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Shorten any place string for compact display.
 *
 * Logic:
 *  - Named place  (first segment starts with a letter):
 *      show first segment only, truncate at 28 chars
 *      e.g. "Johns Hopkins University - Homewood Campus, 3400 N Charles…"
 *           → "Johns Hopkins University - H…"  (but we keep full if ≤28)
 *
 *  - Street address (first segment starts with a digit):
 *      show  "Number StreetName, City"  — no state, zip, country
 *      e.g. "1919 North Nash Street, Arlington, Virginia, 22209, United States"
 *           → "1919 North Nash St, Arlington"
 *
 * @param {string|null} raw
 * @param {object} [opts]
 * @param {string} [opts.fallback]
 * @param {number} [opts.max]   max chars (default 28)
 */
export function shortPlaceName(raw, { fallback = "—", max = 28 } = {}) {
  if (raw == null) return fallback;
  const s = String(raw).trim();
  if (!s) return fallback;

  const parts = s.split(/\s*[,，]\s*/);
  const first = parts[0]?.trim() || s;

  // Street address: starts with one or more digits
  if (/^\d/.test(first)) {
    const street = first
      .replace(/\bStreet\b/gi, "St")
      .replace(/\bAvenue\b/gi, "Ave")
      .replace(/\bBoulevard\b/gi, "Blvd")
      .replace(/\bDrive\b/gi, "Dr")
      .replace(/\bRoad\b/gi, "Rd")
      .replace(/\bLane\b/gi, "Ln")
      .replace(/\bCourt\b/gi, "Ct")
      .replace(/\bNorth\b/gi, "N")
      .replace(/\bSouth\b/gi, "S")
      .replace(/\bEast\b/gi, "E")
      .replace(/\bWest\b/gi, "W");
    // second part is usually city (skip state/zip/country)
    const city = parts[1]?.trim();
    const result = city ? `${street}, ${city}` : street;
    if (result.length <= max + 6) return result; // a bit more room for address
    return `${result.slice(0, max + 4)}…`;
  }

  // Named place: just the first segment
  if (first.length <= max) return first;
  return `${first.slice(0, max)}…`;
}

/** Legacy alias used by schedule UI */
export function shortSchedulePlaceName(raw, { fallback = "地点" } = {}) {
  return shortPlaceName(raw, { fallback, max: 20 });
}

const DEFAULT_SCHEDULE_GRID_START_MIN = 6 * 60;
const DEFAULT_SCHEDULE_GRID_END_MIN = 23 * 60;

export function getScheduleWeekGridBounds(entries) {
  const defaultStart = DEFAULT_SCHEDULE_GRID_START_MIN;
  const defaultEnd = DEFAULT_SCHEDULE_GRID_END_MIN;
  let minM = Infinity;
  let maxM = -Infinity;
  for (const e of entries) {
    if (e && typeof e.minutes === "number" && !Number.isNaN(e.minutes)) {
      minM = Math.min(minM, e.minutes);
      maxM = Math.max(maxM, e.minutes);
    }
    if (e?.returnEnabled && typeof e.returnMinutes === "number" && !Number.isNaN(e.returnMinutes)) {
      minM = Math.min(minM, e.returnMinutes);
      maxM = Math.max(maxM, e.returnMinutes);
    }
  }
  if (minM === Infinity) {
    return { rowStartMin: defaultStart, rowEndMin: defaultEnd };
  }
  const rowStartMin = Math.min(defaultStart, Math.floor(minM / 60) * 60);
  const rowEndMin = Math.max(defaultEnd, Math.ceil(maxM / 60) * 60);
  return { rowStartMin, rowEndMin: Math.min(rowEndMin, 24 * 60 - 1) };
}

export function buildHourSlotStarts(rowStartMin, rowEndMin) {
  const out = [];
  for (let t = rowStartMin; t <= rowEndMin; t += 60) {
    out.push(t);
  }
  return out;
}

export function scheduleEntryInHourSlot(entry, slotStartMin) {
  return (
    entry &&
    typeof entry.minutes === "number" &&
    !Number.isNaN(entry.minutes) &&
    entry.minutes >= slotStartMin &&
    entry.minutes < slotStartMin + 60
  );
}

export function scheduleReturnInHourSlot(entry, slotStartMin) {
  return (
    entry?.returnEnabled &&
    typeof entry.returnMinutes === "number" &&
    !Number.isNaN(entry.returnMinutes) &&
    entry.returnMinutes >= slotStartMin &&
    entry.returnMinutes < slotStartMin + 60
  );
}

export function getCommonRouteTimeFields(trip) {
  const timeEnabled = trip.timeEnabled !== false;
  return {
    timeEnabled,
    outHour: typeof trip.outHour === "number" && trip.outHour >= 0 && trip.outHour < 24 ? trip.outHour : 8,
    outMinute: typeof trip.outMinute === "number" && trip.outMinute >= 0 && trip.outMinute < 60 ? trip.outMinute : 0,
    returnEnabled: !!trip.returnEnabled,
    returnHour: typeof trip.returnHour === "number" && trip.returnHour >= 0 && trip.returnHour < 24 ? trip.returnHour : 18,
    returnMinute: typeof trip.returnMinute === "number" && trip.returnMinute >= 0 && trip.returnMinute < 60 ? trip.returnMinute : 0,
  };
}

export function resolveTripTimeFields(trip) {
  if (typeof trip.minutes === "number" && !Number.isNaN(trip.minutes)) {
    const m = Math.max(0, Math.min(24 * 60 - 1, trip.minutes));
    const retOn = trip.returnEnabled === true && typeof trip.returnMinutes === "number" && !Number.isNaN(trip.returnMinutes);
    const rm = retOn ? Math.max(0, Math.min(24 * 60 - 1, trip.returnMinutes)) : 0;
    return {
      timeEnabled: true,
      outHour: Math.floor(m / 60) % 24,
      outMinute: m % 60,
      returnEnabled: retOn,
      returnHour: retOn ? Math.floor(rm / 60) % 24 : 18,
      returnMinute: retOn ? rm % 60 : 0,
    };
  }
  return getCommonRouteTimeFields(trip);
}

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
