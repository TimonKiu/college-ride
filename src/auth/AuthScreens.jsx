import { useState, useMemo } from "react";
import { AUTH_STRINGS } from "./authStrings.js";
import { useAuth } from "./AuthContext.jsx";
import { isInstitutionalEduEmail } from "./eduEmail.js";
import { getSchoolFromEmail } from "./schoolFromEmail.js";
import TermsOfServicePage from "./TermsOfServicePage.jsx";

const RIDER_PRIMARY = "#2563EB";
const FONT = "'Inter', system-ui, sans-serif";

function getLang() {
  if (typeof localStorage === "undefined") return "zh";
  return localStorage.getItem("cr-lang") || "zh";
}

export default function AuthScreens() {
  const { signIn, signUp, authMode } = useAuth();
  const [lang] = useState(() => getLang());
  const s = AUTH_STRINGS[lang] ?? AUTH_STRINGS.zh;
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmHint, setConfirmHint] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [termsView, setTermsView] = useState(false);

  const titleStyle = useMemo(
    () => ({
      fontFamily: FONT,
      minHeight: "100vh",
      background: "#f4f6f9",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "max(24px, env(safe-area-inset-top)) 20px 32px",
      boxSizing: "border-box",
    }),
    []
  );

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setConfirmHint(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(s.err_email);
      return;
    }
    if (!isInstitutionalEduEmail(email.trim())) {
      setError(s.err_not_edu);
      return;
    }
    if (password.length < 8) {
      setError(s.err_password_short);
      return;
    }
    setPending(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      if (err?.message === "NOT_EDU") {
        setError(s.err_not_edu);
      } else if (err?.message === "INVALID" || err?.message?.includes("Invalid login")) {
        setError(s.err_invalid_creds);
      } else {
        setError(err?.message || s.err_generic);
      }
    } finally {
      setPending(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setConfirmHint(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(s.err_email);
      return;
    }
    if (!isInstitutionalEduEmail(email.trim())) {
      setError(s.err_not_edu);
      return;
    }
    if (password.length < 8) {
      setError(s.err_password_short);
      return;
    }
    if (password !== password2) {
      setError(s.err_password_match);
      return;
    }
    if (!tosAccepted) {
      setError(s.err_tos_required);
      return;
    }
    setPending(true);
    try {
      const res = await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      if (res.needsEmailConfirm) {
        setConfirmHint(true);
      }
    } catch (err) {
      if (err?.message === "NOT_EDU") {
        setError(s.err_not_edu);
      } else if (err?.message === "EMAIL_USED") {
        setError(s.err_email_used);
      } else if (err?.message?.includes("User already registered")) {
        setError(s.err_email_used);
      } else {
        setError(err?.message || s.err_generic);
      }
    } finally {
      setPending(false);
    }
  }

  if (termsView) {
    return <TermsOfServicePage lang={lang} onBack={() => setTermsView(false)} />;
  }

  return (
    <div style={titleStyle}>
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(15,23,42,0.12)",
          background: "#fff",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #2563EB 100%)",
            color: "#fff",
            padding: "28px 24px 22px",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>{s.title}</h1>
          <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.55, opacity: 0.92, fontWeight: 400 }}>
            {s.subtitle}
          </p>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
          {["login", "register"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setConfirmHint(false);
                setTosAccepted(false);
              }}
              style={{
                flex: 1,
                padding: "14px 12px",
                border: "none",
                background: mode === m ? "rgba(37,99,235,0.08)" : "#fff",
                color: mode === m ? RIDER_PRIMARY : "#64748b",
                fontWeight: mode === m ? 700 : 600,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: FONT,
                borderBottom: mode === m ? `3px solid ${RIDER_PRIMARY}` : "3px solid transparent",
                marginBottom: -1,
              }}
            >
              {m === "login" ? s.tab_login : s.tab_register}
            </button>
          ))}
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          style={{ padding: "22px 22px 26px" }}
        >
          {authMode === "local" && (
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                lineHeight: 1.5,
                marginBottom: 16,
                padding: "10px 12px",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            >
              {s.banner_local}
            </div>
          )}

          {confirmHint && (
            <div
              style={{
                fontSize: 13,
                color: RIDER_PRIMARY,
                marginBottom: 14,
                fontWeight: 600,
              }}
            >
              {lang === "zh" ? "请查收邮箱中的确认链接（若已配置 Supabase 邮箱验证）。" : "Check your email to confirm your account (if email confirmation is enabled)."}
            </div>
          )}

          <label style={labelStyle}>{s.email}</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={s.ph_email}
            style={inputStyle}
            required
          />

          <label style={labelStyle}>{s.password}</label>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
            minLength={8}
          />

          {mode === "register" && (
            <>
              <label style={labelStyle}>{s.password_confirm}</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                style={inputStyle}
                required
                minLength={8}
              />
              <label style={labelStyle}>{s.display_name}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={s.ph_display}
                style={inputStyle}
              />
              <label style={labelStyle}>{s.school_auto}</label>
              {isInstitutionalEduEmail(email.trim()) ? (
                <div
                  style={{
                    ...inputStyle,
                    marginBottom: 14,
                    background: "#f8fafc",
                    borderColor: "#e2e8f0",
                    color: "#0f172a",
                    fontWeight: 600,
                  }}
                >
                  {getSchoolFromEmail(email.trim())}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 14 }}>
                  {s.school_preview_need_edu}
                </div>
              )}
            </>
          )}

          {error ? (
            <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{error}</div>
          ) : null}

          {mode === "register" ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 14,
                marginTop: 2,
              }}
            >
              <input
                id="cr-tos-consent"
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => {
                  setTosAccepted(e.target.checked);
                  setError("");
                }}
                style={{
                  marginTop: 3,
                  width: 18,
                  height: 18,
                  flexShrink: 0,
                  cursor: "pointer",
                  accentColor: RIDER_PRIMARY,
                }}
              />
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                <label htmlFor="cr-tos-consent" style={{ cursor: "pointer" }}>
                  {s.tos_prefix}
                </label>
                <button
                  type="button"
                  onClick={() => setTermsView(true)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    color: RIDER_PRIMARY,
                    fontWeight: 700,
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                    cursor: "pointer",
                    fontSize: "inherit",
                    fontFamily: FONT,
                  }}
                >
                  {s.tos_link}
                </button>
                <label htmlFor="cr-tos-consent" style={{ cursor: "pointer" }}>
                  {s.tos_suffix}
                </label>
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending || (mode === "register" && !tosAccepted)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background: RIDER_PRIMARY,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: pending || (mode === "register" && !tosAccepted) ? "not-allowed" : "pointer",
              opacity: pending || (mode === "register" && !tosAccepted) ? 0.55 : 1,
              fontFamily: FONT,
            }}
          >
            {pending
              ? mode === "login"
                ? s.btn_logging_in
                : s.btn_registering
              : mode === "login"
                ? s.btn_login
                : s.btn_register}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
  letterSpacing: "0.02em",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  marginBottom: 14,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  fontFamily: FONT,
  boxSizing: "border-box",
  outline: "none",
};
