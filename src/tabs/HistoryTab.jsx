import { useAppCtx } from "../context/AppContext.jsx";
import { Icons, Tag } from "../components/shared.jsx";
import { formatUsd } from "../userLedger.js";
import {
  formatHistoryTripDate,
  inferPlatformStatusKey,
  PLATFORM_STATUS_I18N,
  HISTORY_LEDGER_PREVIEW_MAX,
} from "../utils/historyUtils.js";
import { shortPlaceName } from "../utils/scheduleUtils.js";

export default function HistoryTab() {
  const ctx = useAppCtx();
  const {
    tab, t, colors, styles, themePrimary, lang,
    ledger,
    myPlatformHistoryItems,
    monthlySavingsDisplay, monthlySavingsPctValue,
    historyPlatformDelete, setHistoryPlatformDelete,
    historyPlatformDeleting,
    confirmDeleteHistoryPlatform,
    setHistoryCompletedFullOpen,
  } = ctx;

  const renderHistoryLedgerTripCard = (trip) => {
    const isPassenger = trip.role === "passenger";
    const typeLabel = isPassenger ? t("tag_passenger") : t("tag_driver");
    const sub =
      isPassenger && trip.driverName
        ? t("label_driver_was", { name: trip.driverName })
        : !isPassenger
          ? t("label_you_drove")
          : "";
    const costStr = isPassenger ? formatUsd(trip.priceUsd) : `+${formatUsd(trip.incomeUsd)}`;
    return (
      <div key={trip.id} style={{ ...styles.card, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>{formatHistoryTripDate(trip.ts, lang)}</div>
          <Tag text={typeLabel} accent={themePrimary} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.02em" }}>
          {shortPlaceName(trip.from)} — {shortPlaceName(trip.to)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: colors.muted }}>{sub}</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: isPassenger ? colors.text : colors.navy,
            }}
          >
            {costStr}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {historyPlatformDelete ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10055,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <button
            type="button"
            aria-label={lang === "zh" ? "关闭" : "Close"}
            disabled={historyPlatformDeleting}
            onClick={() => !historyPlatformDeleting && setHistoryPlatformDelete(null)}
            style={{
              position: "absolute",
              inset: 0,
              border: "none",
              background: "rgba(0,0,0,0.5)",
              cursor: historyPlatformDeleting ? "default" : "pointer",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cr-history-delete-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 400,
              background: colors.card,
              color: colors.text,
              borderRadius: 16,
              padding: "20px 18px 18px",
              boxShadow: "0 24px 56px rgba(0,0,0,0.35)",
              zIndex: 1,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div id="cr-history-delete-title" style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, letterSpacing: "-0.02em" }}>
              {t("history_delete_title")}
            </div>
            <p style={{ fontSize: 14, color: colors.muted, marginBottom: 18, lineHeight: 1.55 }}>
              {t("history_delete_desc", { route: historyPlatformDelete.routeLabel })}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                disabled={historyPlatformDeleting}
                onClick={() => setHistoryPlatformDelete(null)}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  color: colors.text,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: historyPlatformDeleting ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  opacity: historyPlatformDeleting ? 0.6 : 1,
                }}
              >
                {t("btn_cancel")}
              </button>
              <button
                type="button"
                disabled={historyPlatformDeleting}
                onClick={() => void confirmDeleteHistoryPlatform()}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: historyPlatformDeleting ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  opacity: historyPlatformDeleting ? 0.7 : 1,
                }}
              >
                {historyPlatformDeleting ? t("btn_saving") : t("btn_delete_confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "history" && (
        <>
          <div style={styles.sectionTitle}>{t("section_history")}</div>
          <div style={styles.sectionHeadline}>{t("headline_history")}</div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.muted,
              marginBottom: 8,
              marginTop: 4,
              letterSpacing: "0.02em",
            }}
          >
            {t("history_section_my_trips")}
          </div>
          {myPlatformHistoryItems.length === 0 ? (
            <div style={{ ...styles.card, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.55, textAlign: "center" }}>{t("history_empty_my_trips")}</div>
            </div>
          ) : (
            myPlatformHistoryItems.map((row) => {
              let sk, routeLine, rowId, detailNode;
              if (row.kind === "driver_publish") {
                sk = inferPlatformStatusKey("driver_publish", row.ride.time);
                routeLine = `${shortPlaceName(row.ride.from)} — ${shortPlaceName(row.ride.to)}`;
                rowId = row.ride.id;
                detailNode = (
                  <>
                    <div>{t("label_seat_price", { n: row.ride.seats, price: Number(row.ride.price).toFixed(2) })}</div>
                    <div style={{ marginTop: 4 }}>{t("label_depart_short")} · {row.ride.time}</div>
                  </>
                );
              } else if (row.kind === "passenger_request") {
                sk = inferPlatformStatusKey("passenger_request", row.req.time);
                routeLine = `${shortPlaceName(row.req.from)} — ${shortPlaceName(row.req.to)}`;
                rowId = row.req.id;
                detailNode = (
                  <>
                    <div>{t("label_time")} · {row.req.time}</div>
                    <div style={{ marginTop: 4 }}>{row.req.detour}</div>
                  </>
                );
              } else {
                // booking_passenger or booking_driver
                const b = row.booking;
                sk = inferPlatformStatusKey(row.kind, b.time);
                routeLine = `${shortPlaceName(b.from)} — ${shortPlaceName(b.to)}`;
                rowId = b.id;
                const counterpart = row.kind === "booking_passenger"
                  ? (lang === "zh" ? `司机：${b.driverName}` : `Driver: ${b.driverName}`)
                  : (lang === "zh" ? `乘客：${b.passengerName}` : `Rider: ${b.passengerName}`);
                detailNode = (
                  <>
                    <div>{counterpart}</div>
                    {b.time ? <div style={{ marginTop: 4 }}>{t("label_depart_short")} · {b.time}</div> : null}
                    {b.price != null ? (
                      <div style={{ marginTop: 4 }}>
                        {row.kind === "booking_passenger"
                          ? `$${Number(b.price).toFixed(2)}`
                          : `+$${Number(b.price).toFixed(2)}`}
                      </div>
                    ) : null}
                  </>
                );
              }
              const statusStr = t(PLATFORM_STATUS_I18N[sk]);
              return (
                <div key={row.key} style={{ ...styles.card, marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, color: colors.muted, fontWeight: 600, minWidth: 0 }}>{formatHistoryTripDate(row.createdAt, lang)}</div>
                    <button
                      type="button"
                      aria-label={t("history_delete_aria")}
                      onClick={() => setHistoryPlatformDelete({ kind: row.kind, id: rowId, routeLabel: routeLine })}
                      style={{
                        flexShrink: 0,
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        background: colors.white,
                        color: "#dc2626",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 0,
                      }}
                    >
                      <span style={{ display: "flex" }}>{Icons.trash}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.02em" }}>{routeLine}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: colors.muted, lineHeight: 1.45 }}>
                      {detailNode}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: colors.muted,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        alignSelf: "flex-end",
                      }}
                    >
                      {statusStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: colors.muted,
              marginBottom: 8,
              marginTop: 4,
              letterSpacing: "0.02em",
            }}
          >
            {t("history_section_completed")}
          </div>
          {ledger.trips.length === 0 ? (
            <div style={{ ...styles.card, padding: "22px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, textAlign: "center" }}>{t("history_empty_completed")}</div>
            </div>
          ) : (
            <>
              {ledger.trips.slice(0, HISTORY_LEDGER_PREVIEW_MAX).map(renderHistoryLedgerTripCard)}
              {ledger.trips.length > HISTORY_LEDGER_PREVIEW_MAX ? (
                <button
                  type="button"
                  onClick={() => setHistoryCompletedFullOpen(true)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    marginBottom: 12,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: colors.white,
                    color: themePrimary,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {t("history_view_all")}
                </button>
              ) : null}
            </>
          )}
          <div
            style={{
              ...styles.card,
              background: colors.navy,
              textAlign: "center",
              border: "none",
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 6, fontWeight: 600, letterSpacing: "0.06em" }}>{t("history_monthly_label")}</div>
            <div style={{ color: colors.white, fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>{formatUsd(monthlySavingsDisplay)}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 6 }}>
              {monthlySavingsPctValue != null ? t("history_monthly_vs", { pct: monthlySavingsPctValue }) : t("history_monthly_vs_pending")}
            </div>
          </div>
        </>
      )}
    </>
  );
}
