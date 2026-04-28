import { supabase, isSupabaseConfigured } from "../supabase/client.js";

const TABLE = "bookings";

export function bookingRowToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    passengerId: row.passenger_id,
    driverId: row.driver_id,
    rideId: row.ride_id,
    requestId: row.request_id,
    passengerName: row.passenger_name,
    driverName: row.driver_name,
    from: row.from_label,
    to: row.to_label,
    fromLat: row.from_lat != null ? Number(row.from_lat) : null,
    fromLng: row.from_lng != null ? Number(row.from_lng) : null,
    toLat: row.to_lat != null ? Number(row.to_lat) : null,
    toLng: row.to_lng != null ? Number(row.to_lng) : null,
    time: row.depart_time,
    price: row.price != null ? Number(row.price) : null,
    status: row.status || "active",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export async function fetchMyBookings() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { data: [], error: userErr };
  }
  const uid = userData.user.id;
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .or(`passenger_id.eq.${uid},driver_id.eq.${uid}`)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchMyBookings", error.message);
    return { data: [], error };
  }
  return { data: (data || []).map(bookingRowToUi).filter(Boolean), error: null };
}

export async function insertBooking(p) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error("SUPABASE_NOT_CONFIGURED") };
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { data: null, error: userErr || new Error("NOT_SIGNED_IN") };
  }
  const row = {
    passenger_id: p.passengerId ?? null,
    driver_id: p.driverId ?? null,
    ride_id: p.rideId ?? null,
    request_id: p.requestId ?? null,
    passenger_name: p.passengerName,
    driver_name: p.driverName,
    from_label: p.from,
    to_label: p.to,
    from_lat: p.fromLat ?? null,
    from_lng: p.fromLng ?? null,
    to_lat: p.toLat ?? null,
    to_lng: p.toLng ?? null,
    depart_time: p.time,
    price: p.price ?? null,
    status: "active",
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select("*").single();
  if (error) return { data: null, error };
  return { data: bookingRowToUi(data), error: null };
}

export async function deleteBooking(id) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error("SUPABASE_NOT_CONFIGURED") };
  }
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  return { error: error ?? null };
}
