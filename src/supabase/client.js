import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnon && String(supabaseUrl).trim() && String(supabaseAnon).trim()
);

/** 单例：登录与业务表共用，会话一致 */
export const supabase = isSupabaseConfigured
  ? createClient(String(supabaseUrl).trim(), String(supabaseAnon).trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
