import { supabase, isSupabaseConfigured } from "../supabase/client.js";

const TABLE = "messages";

export function messageRowToUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    body: row.body,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export async function fetchMessages(bookingId) {
  if (!isSupabaseConfigured || !supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) { console.warn("fetchMessages", error.message); return { data: [], error }; }
  return { data: (data || []).map(messageRowToUi).filter(Boolean), error: null };
}

export async function sendMessage({ bookingId, senderName, body }) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error("SUPABASE_NOT_CONFIGURED") };
  }
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { data: null, error: userErr || new Error("NOT_SIGNED_IN") };
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ booking_id: bookingId, sender_id: userData.user.id, sender_name: senderName, body })
    .select("*")
    .single();
  if (error) return { data: null, error };
  return { data: messageRowToUi(data), error: null };
}

/**
 * Subscribe to new messages for a booking.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(bookingId, onNewMessage) {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const channel = supabase
    .channel(`messages:${bookingId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE, filter: `booking_id=eq.${bookingId}` },
      (payload) => {
        const msg = messageRowToUi(payload.new);
        if (msg) onNewMessage(msg);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
