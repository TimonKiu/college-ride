import {
  haversineKm,
  co2SavedCarpoolKg,
  savingsVsRideshareBenchmarkUsd,
} from "./utils/fareCalculator.js";

export { haversineKm, co2SavedCarpoolKg };

const STORAGE_PREFIX = "cr-user-ledger-v1";

export function emptyLedger() {
  return {
    version: 1,
    stats: {
      passengerTrips: 0,
      driverTrips: 0,
      riderSpendUsd: 0,
      riderSavingsUsd: 0,
      driverIncomeUsd: 0,
      carbonKg: 0,
    },
    trips: [],
  };
}

function normalizeLedger(raw) {
  if (!raw || typeof raw !== "object") return emptyLedger();
  const base = emptyLedger();
  const s = raw.stats || {};
  base.stats = {
    passengerTrips: Number(s.passengerTrips) || 0,
    driverTrips: Number(s.driverTrips) || 0,
    riderSpendUsd: Number(s.riderSpendUsd) || 0,
    riderSavingsUsd: Number(s.riderSavingsUsd) || 0,
    driverIncomeUsd: Number(s.driverIncomeUsd) || 0,
    carbonKg: Number(s.carbonKg) || 0,
  };
  base.trips = Array.isArray(raw.trips) ? raw.trips.filter((t) => t && typeof t === "object") : [];
  return base;
}

export function loadUserLedger(userId) {
  if (!userId || typeof localStorage === "undefined") return emptyLedger();
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${userId}`);
    if (!raw) return emptyLedger();
    return normalizeLedger(JSON.parse(raw));
  } catch {
    return emptyLedger();
  }
}

export function persistUserLedger(userId, ledger) {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, JSON.stringify(ledger));
  } catch {
    /* quota */
  }
}

function occupancyFromSeats(seats) {
  const s = Number(seats);
  if (!Number.isFinite(s) || s < 1) return 2;
  return 1 + Math.min(4, Math.floor(s));
}

/**
 * 乘客完成一次拼车预约：计入花费、相对网约车粗估节省、减碳
 */
export function appendPassengerTrip(ledger, payload) {
  const {
    from,
    to,
    fromLat,
    fromLng,
    toLat,
    toLng,
    priceUsd,
    driverName,
    seats,
  } = payload;
  const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const occ = occupancyFromSeats(seats);
  const co2 = co2SavedCarpoolKg(distanceKm, occ);
  const savings = savingsVsRideshareBenchmarkUsd(distanceKm, priceUsd);
  const trip = {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ts: Date.now(),
    role: "passenger",
    from,
    to,
    distanceKm,
    priceUsd,
    savingsUsd: savings,
    co2Kg: co2,
    driverName: driverName || "—",
  };
  const stats = { ...ledger.stats };
  stats.passengerTrips += 1;
  stats.riderSpendUsd += priceUsd;
  stats.riderSavingsUsd += savings;
  stats.carbonKg += co2;
  return { ...ledger, stats, trips: [trip, ...ledger.trips] };
}

/** 解析 "+$3.80" → 3.8 */
export function parseUsdFromEarn(str) {
  if (str == null) return 0;
  const m = String(str).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

/**
 * 司机完成一单：计入收入（已按平台抽成后入账）。
 * 减碳仅在乘客完成预约时累计，避免与司机侧同一趟重复计入。
 */
export function appendDriverTrip(ledger, payload) {
  const { from, to, fromLat, fromLng, toLat, toLng, incomeUsd, riderName } = payload;
  const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const trip = {
    id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ts: Date.now(),
    role: "driver",
    from,
    to,
    distanceKm,
    incomeUsd,
    co2Kg: 0,
    riderName: riderName || "—",
  };
  const stats = { ...ledger.stats };
  stats.driverTrips += 1;
  stats.driverIncomeUsd += incomeUsd;
  return { ...ledger, stats, trips: [trip, ...ledger.trips] };
}

export function totalTripCount(stats) {
  return (stats.passengerTrips || 0) + (stats.driverTrips || 0);
}

/** 本月（按本地时区）乘客行程的节省合计 */
export function monthlyPassengerSavingsUsd(trips, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  return trips.reduce((sum, t) => {
    if (t.role !== "passenger") return sum;
    const d = new Date(t.ts);
    if (d.getFullYear() !== y || d.getMonth() !== m) return sum;
    return sum + (Number(t.savingsUsd) || 0);
  }, 0);
}

/** 本月乘客实付合计（用于相对网约车基准的节省比例） */
export function monthlyPassengerSpendUsd(trips, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  return trips.reduce((sum, t) => {
    if (t.role !== "passenger") return sum;
    const d = new Date(t.ts);
    if (d.getFullYear() !== y || d.getMonth() !== m) return sum;
    return sum + (Number(t.priceUsd) || 0);
  }, 0);
}

/** 相对网约车粗估基准，本月约省百分比：savings / (savings + spend) */
export function monthlyPassengerSavingsPct(trips, now = new Date()) {
  const s = monthlyPassengerSavingsUsd(trips, now);
  const p = monthlyPassengerSpendUsd(trips, now);
  const denom = s + p;
  if (denom <= 0) return null;
  return Math.round((s / denom) * 100);
}

export { formatUsd, formatCarbonKg } from "./utils/fareCalculator.js";
