import { useAppCtx } from "../context/AppContext.jsx";
import { Icons, Tag } from "../components/shared.jsx";
import { formatUsd, formatCarbonKg } from "../userLedger.js";

export default function ProfileTab() {
  const ctx = useAppCtx();
  const {
    tab, t, colors, styles, themePrimary, themePrimaryRgb, lang,
    profileAvatarInitial, profileDisplayName, schoolDisplay,
    user, signOut,
    tripCountAll, ledger,
    setProfileSettingsView,
  } = ctx;

  if (tab !== "profile") return null;

  return (
    <>
      <div style={styles.sectionTitle}>{t("section_account")}</div>
      <div style={styles.sectionHeadline}>{t("headline_profile")}</div>
      <div style={{ ...styles.card, textAlign: "center", padding: "32px 20px 28px" }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: colors.navy,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.white,
            fontWeight: 700,
            fontSize: 30,
            margin: "0 auto 14px",
            border: `4px solid ${colors.white}`,
            boxShadow: `0 4px 16px rgba(${themePrimaryRgb}, 0.25)`,
          }}
        >
          {profileAvatarInitial}
        </div>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{profileDisplayName}</div>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>{user?.email ?? ""}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <Tag text={t("tag_verified_student")} accent={themePrimary} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          {
            label: t("stat_total_trips"),
            value: lang === "en" ? `${tripCountAll} trip${tripCountAll === 1 ? "" : "s"}` : `${tripCountAll} 次`,
          },
          { label: t("stat_savings"), value: formatUsd(ledger.stats.riderSavingsUsd) },
          { label: t("stat_driver_income"), value: formatUsd(ledger.stats.driverIncomeUsd) },
          { label: t("stat_carbon"), value: formatCarbonKg(ledger.stats.carbonKg) },
        ].map((item) => (
          <div key={item.label} style={{ ...styles.card, textAlign: "center", padding: "16px 12px" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>{item.value}</div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: 500 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{t("label_school")}</div>
        <div style={{ fontSize: 17, color: colors.text, fontWeight: 600, letterSpacing: "-0.02em" }}>{schoolDisplay}</div>
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        style={{
          width: "100%",
          padding: "14px 16px",
          marginBottom: 12,
          borderRadius: 12,
          border: `1.5px solid ${colors.border}`,
          background: colors.white,
          color: "#b91c1c",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {t("btn_logout")}
      </button>

      <div style={styles.sectionTitle}>{t("section_settings")}</div>
      <div style={{ ...styles.card, padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setProfileSettingsView("language")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            border: "none",
            background: colors.card,
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
            textAlign: "left",
          }}
        >
          <span style={{ display: "flex", color: colors.text, flexShrink: 0 }}>{Icons.globe}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: colors.text }}>{t("label_language")}</div>
            <div style={{ fontSize: 13, color: colors.muted, marginTop: 3 }}>{lang === "zh" ? t("lang_zh") : t("lang_en")}</div>
          </div>
          <span style={{ display: "flex", color: colors.muted, flexShrink: 0, opacity: 0.85 }}>{Icons.chevronRight}</span>
        </button>
      </div>
    </>
  );
}
