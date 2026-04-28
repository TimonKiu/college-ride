import { supabase, isSupabaseConfigured } from "../supabase/client.js";

const TABLE = "passenger_requests";

export function passengerRequestRowToUi(row) {
  if (!row) return null;
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  return {
    id: row.id,
    riderId: row.rider_id,
    rider: row.rider_name || "Rider",
    school: row.school || "",
    from: row.from_label,
    to: row.to_label,
    fromLat: row.from_lat != null ? Number(row.from_lat) : null,
    fromLng: row.from_lng != null ? Number(row.from_lng) : null,
    toLat: row.to_lat != null ? Number(row.to_lat) : null,
    toLng: row.to_lng != null ? Number(row.to_lng) : null,
    time: row.time_pref || "—",
    detour: row.detour || "+15 min",
    earn: row.earn_display || "+$10.00",
    createdAt,
  };
}

export async function fetchPassengerRequests() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchPassengerRequests", error.message);
    return { data: [], error };
  }
  return { data: (data || []).map(passengerRequestRowToUi).filter(Boolean), error: null };
}

/** 当前用户发出的乘车请求（记录页） */
export async function fetchMyPassengerRequests() {
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
    .eq("rider_id", uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchMyPassengerRequests", error.message);
    return { data: [], error };
  }
  return { data: (data || []).map(passengerRequestRowToUi).filter(Boolean), error: null };
}

/**
 * @param {object} p
 * @param {string} p.riderName
 * @param {string} p.school
 * @param {string} p.from
 * @param {string} p.to
 * @param {number} p.fromLat
 * @param {number} p.fromLng
 * @param {number} p.toLat
 * @param {number} p.toLng
 * @param {string} p.timePref
 * @param {string} [p.notes]
 * @param {string} [p.earnDisplay]
 */
export async function insertPassengerRequest(p) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error("SUPABASE_NOT_CONFIGURED") };
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { data: null, error: userErr || new Error("NOT_SIGNED_IN") };
  }
  const uid = userData.user.id;
  const row = {
    rider_id: uid,
    rider_name: p.riderName,
    school: p.school || "",
    from_label: p.from,
    to_label: p.to,
    from_lat: p.fromLat,
    from_lng: p.fromLng,
    to_lat: p.toLat,
    to_lng: p.toLng,
    time_pref: p.timePref,
    notes: p.notes || "",
    detour: "+15 min",
    earn_display: p.earnDisplay ?? "+$8.00",
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select("*").single();
  if (error) return { data: null, error };
  return { data: passengerRequestRowToUi(data), error: null };
}

/** 删除当前用户发出的乘车请求（RLS：仅本人） */
export async function deletePassengerRequest(id) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error("SUPABASE_NOT_CONFIGURED") };
  }
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  return { error: error ?? null };
}
