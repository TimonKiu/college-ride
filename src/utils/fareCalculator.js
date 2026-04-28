export const KG_CO2_PER_KM_CAR = 0.21;
export const RIDESHARE_BENCHMARK_USD_PER_KM = 0.85;

// ── Fare calculation constants ──────────────────────────────────────────────
// Formula: base + (distance_km × rate_per_km) + (duration_min × rate_per_min)
// These approximate Uber/Lyft pricing in the DC/Baltimore area.
const BASE_FARE_USD        = 2.00;  // flat base
const RATE_PER_KM_USD      = 0.56;  // ≈ $0.90/mile
const RATE_PER_MIN_USD     = 0.20;  // per minute of drive time
const PLATFORM_FEE_RATE    = 0.18;  // 18% platform cut

/**
 * Calculate fare from Google route data.
 * @param {number} distanceKm   Road distance in km
 * @param {number} durationMin  Drive time in minutes (with traffic)
 * @returns {{ passengerPays: number, driverEarns: number, platformFee: number }}
 */
export function calculateFare(distanceKm, durationMin) {
  const raw = BASE_FARE_USD
    + distanceKm * RATE_PER_KM_USD
    + durationMin * RATE_PER_MIN_USD;
  const passengerPays = Math.round(raw * 100) / 100;
  const platformFee   = Math.round(passengerPays * PLATFORM_FEE_RATE * 100) / 100;
  const driverEarns   = Math.round((passengerPays - platformFee) * 100) / 100;
  return { passengerPays, driverEarns, platformFee };
}

/**
 * Fallback fare using straight-line haversine (no Google API available).
 * Uses a 1.35 road-distance multiplier.
 */
export function calculateFareFallback(fromLat, fromLng, toLat, toLng) {
  const straightKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const distanceKm = straightKm * 1.35;
  const durationMin = distanceKm / 0.5; // rough 30 km/h average in city
  return calculateFare(distanceKm, durationMin);
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function co2SavedCarpoolKg(distanceKm, occupancy) {
  const n = Math.floor(Math.max(1, occupancy));
  if (n < 2 || !Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return distanceKm * KG_CO2_PER_KM_CAR * (n - 1);
}

export function savingsVsRideshareBenchmarkUsd(distanceKm, paidUsd) {
  const bench = distanceKm * RIDESHARE_BENCHMARK_USD_PER_KM;
  return Math.max(0, bench - paidUsd);
}

export function formatUsd(n) {
  const x = Number(n) || 0;
  return `$${x.toFixed(2)}`;
}

export function formatCarbonKg(n) {
  const x = Number(n) || 0;
  if (x < 0.01) return "0 kg";
  return `${x < 10 ? x.toFixed(2) : x.toFixed(1)} kg`;
}
