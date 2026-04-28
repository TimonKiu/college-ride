import { useAppCtx } from "../context/AppContext.jsx";
import { Icons, FONT_LINK } from "../components/shared.jsx";

export default function ConfirmedBookingScreen() {
  const ctx = useAppCtx();
  const { confirmed, selectedRide, styles, colors, t, setConfirmed, setSelectedRide, setTab } = ctx;

  if (!(confirmed && selectedRide)) return null;

  return (
    <div style={{ ...styles.app, background: colors.navy }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`
        @keyframes cr-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cr-success-panel { animation: cr-in 0.45s ease-out; }
      `}</style>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          textAlign: "center",
          background: colors.navy,
        }}
      >
        <div
          className="cr-success-panel"
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.white,
            marginBottom: 24,
          }}
        >
          <span style={{ display: "flex" }}>{Icons.car}</span>
        </div>
        <h2 style={{ color: colors.white, fontSize: 24, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>{t("booking_confirmed_title")}</h2>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.65, marginBottom: 28, maxWidth: 300 }}>
          {t("booking_confirmed_desc", { driver: selectedRide.driver })} <strong style={{ color: colors.white }}>{selectedRide.time}</strong> {t("booking_confirmed_pickup")}
          <br />
          <span style={{ color: "rgba(255,255,255,0.9)" }}>
            {selectedRide.from} — {selectedRide.to}
          </span>
        </p>
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "24px 28px",
            marginBottom: 28,
            width: "100%",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 6, fontWeight: 500 }}>{t("label_est_cost")}</div>
          <div style={{ color: colors.white, fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" }}>${selectedRide.price.toFixed(2)}</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 6 }}>{t("label_vs_rideshare")}</div>
        </div>
        <button
          style={styles.btn}
          onClick={() => {
            setConfirmed(false);
            setSelectedRide(null);
            setTab("find");
          }}
        >
          {t("btn_back_home")}
        </button>
      </div>
    </div>
  );
}
