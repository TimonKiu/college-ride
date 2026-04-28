import { useAppCtx } from "../context/AppContext.jsx";
import { Icons, Avatar, Tag, TripRouteMap, FONT_LINK } from "../components/shared.jsx";

export default function RequestDetailScreen() {
  const ctx = useAppCtx();
  const {
    selectedRequest,
    requestDetailClosing,
    t, colors, styles, themePrimary,
    currentLocationCoords,
    beginCloseRequestDetail, commitDriverBooking,
  } = ctx;

  if (!selectedRequest) return null;

  const req = selectedRequest;

  return (
    <div style={styles.app}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ ...styles.header, padding: "16px 16px 14px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={beginCloseRequestDetail}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              width: 40,
              height: 40,
              color: colors.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label={t("btn_back")}
          >
            {Icons.chevronLeft}
          </button>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{t("label_request_details")}</span>
        </div>
      </div>
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <Avatar name={req.rider} accent={themePrimary} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: colors.text }}>{req.rider}</div>
              <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{req.school}</div>
            </div>
            <Tag text={t("tag_pending")} accent={themePrimary} />
          </div>
          <div style={{ height: 1, background: colors.border, margin: "0 0 18px" }} />
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6 }}>
              <div style={styles.routeDot(true)} />
              <div style={{ width: 2, flex: 1, minHeight: 20, background: colors.border, margin: "4px 0" }} />
              <div style={styles.routeDot(false)} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("label_origin_detail")}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{req.from}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("label_dest_detail")}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{req.to}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t("label_route_map")}</div>
          <TripRouteMap
            fromLat={req.fromLat}
            fromLng={req.fromLng}
            toLat={req.toLat}
            toLng={req.toLng}
            lineColor={themePrimary}
            userLocation={currentLocationCoords}
            loadingText={t("label_loading_route")}
          />
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>{t("map_disclaimer")}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { label: t("label_time_pref"), value: req.time, icon: Icons.clock },
            { label: t("label_detour_time"), value: req.detour, icon: Icons.mapPath },
            { label: t("label_est_earnings"), value: req.earn, icon: Icons.car },
          ].map((item) => (
            <div key={item.label} style={{ ...styles.card, textAlign: "center", marginBottom: 0, padding: "14px 8px" }}>
              <div style={{ display: "flex", justifyContent: "center", color: colors.navy, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{item.value}</div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 4, fontWeight: 500 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...styles.card, background: colors.tint, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4, fontWeight: 500 }}>{t("label_earn_this_trip")}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: colors.navy, letterSpacing: "-0.03em" }}>{req.earn}</div>
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{t("label_earn_note")}</div>
        </div>

        <button
          type="button"
          style={{ ...styles.btn, marginTop: 8 }}
          onClick={() => {
            commitDriverBooking(req);
            beginCloseRequestDetail();
          }}
        >
          {t("btn_accept_request")}
        </button>
        <button type="button" style={{ ...styles.btnOutline, marginTop: 12 }} onClick={beginCloseRequestDetail}>
          {t("btn_back")}
        </button>
      </div>
    </div>
  );
}
