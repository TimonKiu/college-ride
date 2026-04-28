/**
 * Vercel serverless function — proxies Google Distance Matrix API.
 * The GOOGLE_MAPS_KEY env var is server-side only (no VITE_ prefix).
 *
 * Query params:
 *   origin        "lat,lng"
 *   destination   "lat,lng"
 *   departureTime  Unix timestamp (seconds). Omit or pass "now" for current time.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { origin, destination, departureTime } = req.query;
  if (!origin || !destination) {
    return res.status(400).json({ error: "Missing origin or destination" });
  }

  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    return res.status(500).json({ error: "GOOGLE_MAPS_KEY not configured" });
  }

  const dep =
    !departureTime || departureTime === "now"
      ? Math.floor(Date.now() / 1000)
      : Number(departureTime);

  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "driving",
    departure_time: dep,
    key,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: data.status, detail: data.error_message });
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      return res.status(400).json({ error: element?.status ?? "NO_ROUTE" });
    }

    return res.status(200).json({
      distanceMeters: element.distance.value,
      durationSeconds: element.duration.value,
      // duration_in_traffic is available when departure_time is set
      durationInTrafficSeconds:
        element.duration_in_traffic?.value ?? element.duration.value,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
