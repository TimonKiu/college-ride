import { supabase, isSupabaseConfigured } from "../supabase/client.js";

const TABLE = "published_rides";

export function publishedRideRowToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    driver: row.driver_name || "Driver",
    school: row.school || "",
    from: row.from_label,
    to: row.to_label,
    fromLat: row.from_lat != null ? Number(row.from_lat) : null,
    fromLng: row.from_lng != null ? Number(row.from_lng) : null,
    toLat: row.to_lat != null ? Number(row.to_lat) : null,
    toLng: row.to_lng != null ? Number(row.to_lng) : null,
    time: row.depart_time || "—",
    seats: row.seats ?? 2,
    detour: row.detour || "+10 min",
    price: row.price != null ? Number(row.price) : 8.5,
    rating: row.rating != null ? Number(row.rating) : 5,
  };
}

export async function fetchPublishedRides() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchPublishedRides", error.message);
    return { data: [], error };
  }
  return { data: (data || []).map(publishedRideRowToUi).filter(Boolean), error: null };
}

/**
 * @param {object} p
 * @param {string} p.driverName
 * @param {string} p.school
 * @param {string} p.from
 * @param {string} p.to
 * @param {number} p.fromLat
 * @param {number} p.fromLng
 * @param {number} p.toLat
 * @param {number} p.toLng
 * @param {string} p.departTime
 * @param {number} p.seats
 * @param {number} [p.price]
 * @param {string} [p.detour]
 */
export async function insertPublishedRide(p) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error("SUPABASE_NOT_CONFIGURED") };
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { data: null, error: userErr || new Error("NOT_SIGNED_IN") };
  }
  const uid = userData.user.id;
  const row = {
    driver_id: uid,
    driver_name: p.driverName,
    school: p.school || "",
    from_label: p.from,
    to_label: p.to,
    from_lat: p.fromLat,
    from_lng: p.fromLng,
    to_lat: p.toLat,
    to_lng: p.toLng,
    depart_time: p.departTime,
    seats: p.seats,
    price: p.price ?? 8.5,
    detour: p.detour ?? "+10 min",
    rating: 5,
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select("*").single();
  if (error) return { data: null, error };
  return { data: publishedRideRowToUi(data), error: null };
}
