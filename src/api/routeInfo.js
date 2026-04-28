/**
 * Fetch driving distance + duration via our /api/distance serverless proxy.
 *
 * @param {object} p
 * @param {number} p.fromLat
 * @param {number} p.fromLng
 * @param {number} p.toLat
 * @param {number} p.toLng
 * @param {number|null} p.departureUnix  Unix timestamp (seconds), or null → "now"
 * @returns {Promise<{distanceKm: number, durationMin: number} | null>}
 */
export async function fetchRouteInfo({ fromLat, fromLng, toLat, toLng, departureUnix }) {
  try {
    const params = new URLSearchParams({
      origin: `${fromLat},${fromLng}`,
      destination: `${toLat},${toLng}`,
      departureTime: departureUnix ?? "now",
    });
    const res = await fetch(`/api/distance?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return {
      distanceKm: data.distanceMeters / 1000,
      durationMin: data.durationInTrafficSeconds / 60,
    };
  } catch {
    return null;
  }
}
