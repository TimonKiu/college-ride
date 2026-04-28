import { useAppCtx } from "../context/AppContext.jsx";
import { Icons, Avatar, StarRating, Tag, TripRouteMap, FONT_LINK } from "../components/shared.jsx";

export default function RideDetailScreen() {
  const ctx = useAppCtx();
  const {
    selectedRide, confirmed, rideDetailClosing,
    t, colors, styles, themePrimary,
    currentLocationCoords, activeCampus,
    beginCloseRideDetail, commitPassengerBooking, setConfirmed,
  } = ctx;

  if (!(selectedRide && !confirmed)) return null;

  return (
    <div
      className={rideDetailClosing ? "cr-stack-layer cr-stack-layer-exit" : "cr-stack-layer"}
      style={{
        ...styles.app,
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        margin: "0 auto",
        zIndex: 12000,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: colors.page,
      }}
    >
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ ...styles.header, padding: "16px 16px 14px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={beginCloseRideDetail}
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
            aria-label="返回"
          >
            {Icons.chevronLeft}
          </button>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{t("label_trip_details")}</span>
        </div>
      </div>
      <div style={styles.content}>
        <div style={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <Avatar name={selectedRide.driver} accent={themePrimary} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: colors.text }}>{selectedRide.driver}</div>
              <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                {selectedRide.school} · <StarRating rating={selectedRide.rating} accent={themePrimary} />
              </div>
            </div>
            <Tag text={t("tag_verified")} accent={themePrimary} />
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
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{selectedRide.from}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("label_dest_detail")}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{selectedRide.to}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{t("label_route_map")}</div>
          <TripRouteMap
            fromLat={selectedRide.fromLat ?? activeCampus.lat}
            fromLng={selectedRide.fromLng ?? activeCampus.lng}
            toLat={selectedRide.toLat ?? activeCampus.lat}
            toLng={selectedRide.toLng ?? activeCampus.lng}
            lineColor={themePrimary}
            userLocation={currentLocationCoords}
            loadingText={t("label_loading_route")}
          />
          <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>{t("map_disclaimer")}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { label: t("label_depart_time"), value: selectedRide.time, icon: Icons.clock },
            { label: t("label_seats_left"), value: `${selectedRide.seats}`, icon: Icons.users },
            { label: t("label_detour_time"), value: selectedRide.detour, icon: Icons.mapPath },
          ].map((item) => (
            <div key={item.label} style={{ ...styles.card, textAlign: "center", marginBottom: 0, padding: "14px 8px" }}>
              <div style={{ display: "flex", justifyContent: "center", color: colors.navy, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{item.value}</div>
              <div style={{ fontSize: 10, color: colors.muted, marginTop: 4, fontWeight: 500 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...styles.card, background: colors.tint, border: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4, fontWeight: 500 }}>{t("label_amount_due")}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: colors.navy, letterSpacing: "-0.03em" }}>${selectedRide.price.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>{t("label_platform_fee")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>{t("tag_ref_price")}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.muted, textDecoration: "line-through" }}>$8.50</div>
              <div style={{ marginTop: 8 }}>
                <Tag text={t("tag_save_pct", { pct: "47" })} accent={themePrimary} />
              </div>
            </div>
          </div>
        </div>

        <button
          style={{ ...styles.btn, marginTop: 8 }}
          onClick={() => {
            commitPassengerBooking(selectedRide);
            setConfirmed(true);
          }}
        >
          {t("btn_confirm_ride")}
        </button>
        <button
          style={{ ...styles.btnOutline, marginTop: 12 }}
          onClick={beginCloseRideDetail}
        >
          {t("btn_cancel")}
        </button>
      </div>
    </div>
  );
}
