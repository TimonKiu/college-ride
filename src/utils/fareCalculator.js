export const KG_CO2_PER_KM_CAR = 0.21;
export const RIDESHARE_BENCHMARK_USD_PER_KM = 0.85;

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
