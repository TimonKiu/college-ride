import { supabase, isSupabaseConfigured } from "../supabase/client.js";
import { isInstitutionalEduEmail } from "./eduEmail.js";
import { getSchoolFromEmail } from "./schoolFromEmail.js";

const DEFAULT_SCHOOL = "Johns Hopkins University";

const LS_USERS = "cr-local-auth-users-v1";
const LS_SESSION = "cr-local-auth-session-v1";

export const authMode = isSupabaseConfigured ? "supabase" : "local";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadLocalUsers() {
  try {
    const raw = localStorage.getItem(LS_USERS);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  } catch {
    /* quota */
  }
}

function schoolFromUserEmail(email, storedFallback) {
  if (email && isInstitutionalEduEmail(email)) return getSchoolFromEmail(email);
  return storedFallback || DEFAULT_SCHOOL;
}

function mapLocalSession(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email,
    displayName: raw.displayName || raw.email?.split("@")[0] || "User",
    school: schoolFromUserEmail(raw.email, raw.school),
  };
}

export function getLocalSessionUser() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return mapLocalSession(s);
  } catch {
    return null;
  }
}

function setLocalSession(user) {
  if (!user) {
    localStorage.removeItem(LS_SESSION);
    return;
  }
  localStorage.setItem(
    LS_SESSION,
    JSON.stringify({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      school: user.school,
    })
  );
}

function mapSupabaseUser(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email,
    displayName: meta.display_name || meta.displayName || u.email?.split("@")[0] || "User",
    school: schoolFromUserEmail(u.email, meta.school),
  };
}

export async function signUp({ email, password, displayName }) {
  const em = email.trim().toLowerCase();
  if (!isInstitutionalEduEmail(em)) {
    throw new Error("NOT_EDU");
  }
  const schoolName = getSchoolFromEmail(em);
  if (authMode === "supabase") {
    const { data, error } = await supabase.auth.signUp({
      email: em,
      password,
      options: {
        data: {
          display_name: displayName?.trim() || em.split("@")[0],
          school: schoolName,
        },
      },
    });
    if (error) throw new Error(error.message);
    const u = mapSupabaseUser(data.user);
    return { user: u, needsEmailConfirm: !data.session };
  }

  const users = loadLocalUsers();
  if (users[em]) {
    throw new Error("EMAIL_USED");
  }
  const passHash = await sha256Hex(password);
  const id = crypto.randomUUID();
  users[em] = {
    id,
    passHash,
    displayName: displayName?.trim() || em.split("@")[0],
    school: schoolName,
  };
  saveLocalUsers(users);
  const user = { id, email: em, displayName: users[em].displayName, school: users[em].school };
  setLocalSession(user);
  return { user, needsEmailConfirm: false };
}

export async function signIn({ email, password }) {
  const em = email.trim().toLowerCase();
  if (!isInstitutionalEduEmail(em)) {
    throw new Error("NOT_EDU");
  }
  if (authMode === "supabase") {
    const { data, error } = await supabase.auth.signInWithPassword({ email: em, password });
    if (error) throw new Error(error.message);
    return { user: mapSupabaseUser(data.user) };
  }

  const users = loadLocalUsers();
  const row = users[em];
  if (!row) throw new Error("INVALID");
  const passHash = await sha256Hex(password);
  if (row.passHash !== passHash) throw new Error("INVALID");
  const user = { id: row.id, email: em, displayName: row.displayName, school: row.school };
  setLocalSession(user);
  return { user };
}

export async function signOut() {
  if (authMode === "supabase") {
    await supabase.auth.signOut();
  } else {
    setLocalSession(null);
  }
}

export async function getSessionUser() {
  if (authMode === "supabase") {
    const { data } = await supabase.auth.getUser();
    return mapSupabaseUser(data.user);
  }
  return getLocalSessionUser();
}

export function onAuthChange(callback) {
  if (authMode === "supabase") {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(mapSupabaseUser(session?.user ?? null));
    });
    return () => sub.subscription.unsubscribe();
  }
  const onStorage = (e) => {
    if (e.key === LS_SESSION) callback(getLocalSessionUser());
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export { DEFAULT_SCHOOL };
