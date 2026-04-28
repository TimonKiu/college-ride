import { useAppCtx } from "../context/AppContext.jsx";
import {
  Avatar,
  Tag,
  StarRating,
  Icons,
  PlaceSuggestField,
  WheelScrollColumn,
  TimeHourMinuteBlock,
  DRIVER_PRIMARY,
  formatCnDateLabel,
  sameCalendarDay,
  formatScheduleChipLabel,
} from "../components/shared.jsx";
import { shortSchedulePlaceName } from "../utils/scheduleUtils.js";

export default function FindPage() {
  const ctx = useAppCtx();
  const {
    tab, t, colors, styles, themePrimary, themePrimaryRgb, lang, role,
    user, schoolDisplay,
    currentLocationCoords, activeCampus,
    riderStep, setRiderStep,
    riderFrom, setRiderFrom, handleRiderFromChange,
    riderFromCoords, setRiderFromCoords,
    riderTo, setRiderTo, handleRiderToChange,
    riderToCoords, setRiderToCoords,
    fromUseCurrentLocation, setFromUseCurrentLocation,
    riderFindTimeMode, setRiderFindTimeMode,
    riderFindDate, setRiderFindDate,
    riderFindHour, setRiderFindHour,
    riderFindMinute, setRiderFindMinute,
    riderFindWheelKey, setRiderFindWheelKey,
    riderPostNotes, setRiderPostNotes,
    riderPosting, riderPostError, setRiderPostError,
    riderPostActive, setRiderPostActive,
    commitRiderPost,
    snapOriginToCurrentLocation,
    commonRoutes,
    matchedRides,
    setSelectedRide, setSelectedRequest,
    driverFindPath, setDriverFindPath,
    driverPendingSavedRoute,
    driverAutoPublishTokenRef,
    publishSubmitting,
    publishFormError, setPublishFormError,
    commitPublishDriverRide,
    driverDisplayedRequests,
    setDriverPublishModalOpen,
    dateOptionsForWheel,
  } = ctx;

  return (
    <div className="cr-page-enter">
      {tab === "find" && role === "rider" && (
        <>
          {/* ── Step 1: Origin ── */}
          {riderStep === "origin" && (
            <div className="cr-step-enter" style={{ ...styles.card, marginTop: 2, padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: colors.text, letterSpacing: "-0.02em" }}>
                  {t("step_origin_title")}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted }}>1 / 3</div>
              </div>

              {/* Use current location */}
              <button
                type="button"
                onClick={() => { snapOriginToCurrentLocation(); setRiderStep("destination"); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1.5px solid ${themePrimary}`,
                  background: colors.tint,
                  cursor: "pointer",
                  marginBottom: 14,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ color: themePrimary, display: "flex", flexShrink: 0 }}>{Icons.navigate}</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: colors.navy }}>
                  {t("label_current_location")}
                </span>
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
                <span style={{ fontSize: 12, color: colors.muted, fontWeight: 500 }}>{t("label_or_search")}</span>
                <div style={{ flex: 1, height: 1, background: colors.border }} />
              </div>

              {/* Address search field */}
              <PlaceSuggestField
                inputId="cr-step1-origin"
                value={riderFrom}
                onChange={handleRiderFromChange}
                onCoordsChange={(coords) => {
                  setRiderFromCoords(coords);
                  if (coords) { setFromUseCurrentLocation(false); setRiderStep("destination"); }
                }}
                placeholder={t("ph_address")}
                variant="light"
                borderColor={colors.border}
                hoverRgb={themePrimaryRgb}
                biasLat={currentLocationCoords?.lat ?? activeCampus.lat}
                biasLng={currentLocationCoords?.lng ?? activeCampus.lng}
              />

              {/* Saved quick picks */}
              {commonRoutes.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ ...styles.label, marginBottom: 10 }}>{t("label_saved_origins")}</div>
                  {commonRoutes.slice(0, 4).map((route) => {
                    const label = route.fromUseCurrentLocation
                      ? t("label_current_location")
                      : shortSchedulePlaceName(route.fromLabel, { fallback: t("label_origin_fallback") });
                    return (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => {
                          if (route.fromUseCurrentLocation) {
                            snapOriginToCurrentLocation();
                          } else {
                            setFromUseCurrentLocation(false);
                            setRiderFrom(route.fromLabel || "");
                            setRiderFromCoords(
                              route.fromLat != null && route.fromLng != null
                                ? { lat: route.fromLat, lng: route.fromLng }
                                : null
                            );
                          }
                          setRiderStep("destination");
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `1px solid ${colors.border}`,
                          background: colors.white,
                          cursor: "pointer",
                          marginBottom: 8,
                          fontFamily: "'Inter', system-ui, sans-serif",
                          textAlign: "left",
                          boxSizing: "border-box",
                        }}
                      >
                        <span style={{ display: "flex", color: colors.muted, flexShrink: 0 }}>{Icons.pin}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: colors.text }}>{route.name}</div>
                          <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>{label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Continue button (enabled only if a value is selected) */}
              <button
                type="button"
                disabled={!fromUseCurrentLocation && !riderFromCoords}
                onClick={() => setRiderStep("destination")}
                style={{
                  ...styles.btn,
                  marginTop: 16,
                  opacity: (!fromUseCurrentLocation && !riderFromCoords) ? 0.35 : 1,
                }}
              >
                {t("btn_continue")}
              </button>
            </div>
          )}

          {/* ── Step 2: Destination ── */}
          {riderStep === "destination" && (
            <div className="cr-step-enter" style={{ ...styles.card, marginTop: 2, padding: "20px" }}>
              {/* Back + origin summary */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <button
                  type="button"
                  aria-label={t("btn_back")}
                  onClick={() => setRiderStep("origin")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.white,
                    cursor: "pointer",
                    flexShrink: 0,
                    color: colors.text,
                  }}
                >
                  <span style={{ display: "flex" }}>{Icons.chevronLeft}</span>
                </button>
                <div style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: colors.tint,
                  border: `1px solid rgba(${themePrimaryRgb}, 0.2)`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.navy,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {fromUseCurrentLocation ? t("label_current_location") : riderFrom || t("label_origin_fallback")}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, flexShrink: 0 }}>2 / 3</div>
              </div>

              <div style={{ fontSize: 17, fontWeight: 700, color: colors.text, marginBottom: 18, letterSpacing: "-0.02em" }}>
                {t("step_dest_title")}
              </div>

              {/* Destination search field */}
              <PlaceSuggestField
                inputId="cr-step2-dest"
                value={riderTo}
                onChange={handleRiderToChange}
                onCoordsChange={(coords) => {
                  setRiderToCoords(coords);
                  if (coords) setRiderStep("time");
                }}
                placeholder={t("ph_destination")}
                variant="light"
                borderColor={colors.border}
                hoverRgb={themePrimaryRgb}
                biasLat={currentLocationCoords?.lat ?? activeCampus.lat}
                biasLng={currentLocationCoords?.lng ?? activeCampus.lng}
              />

              {/* Saved destinations quick picks */}
              {commonRoutes.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ ...styles.label, marginBottom: 10 }}>{t("label_saved_dests")}</div>
                  {commonRoutes.slice(0, 4).map((route) => {
                    const label = shortSchedulePlaceName(route.toLabel, { fallback: t("label_dest_fallback") });
                    return (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => {
                          setRiderTo(route.toLabel || "");
                          setRiderToCoords(
                            route.toLat != null && route.toLng != null
                              ? { lat: route.toLat, lng: route.toLng }
                              : null
                          );
                          if (route.toLat != null && route.toLng != null) setRiderStep("time");
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `1px solid ${colors.border}`,
                          background: colors.white,
                          cursor: "pointer",
                          marginBottom: 8,
                          fontFamily: "'Inter', system-ui, sans-serif",
                          textAlign: "left",
                          boxSizing: "border-box",
                        }}
                      >
                        <span style={{ display: "flex", color: colors.muted, flexShrink: 0 }}>{Icons.flag}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: colors.text }}>{route.name}</div>
                          <div style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>{label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Continue button */}
              <button
                type="button"
                disabled={!riderToCoords}
                onClick={() => setRiderStep("time")}
                style={{
                  ...styles.btn,
                  marginTop: 16,
                  opacity: !riderToCoords ? 0.35 : 1,
                }}
              >
                {t("btn_continue")}
              </button>
            </div>
          )}

          {/* ── Step 3: Time ── */}
          {riderStep === "time" && (
            <div className="cr-step-enter" style={{ ...styles.card, marginTop: 2, padding: "20px" }}>
              {/* Back + origin → dest summary */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <button
                  type="button"
                  aria-label={t("btn_back")}
                  onClick={() => setRiderStep("destination")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.white,
                    cursor: "pointer",
                    flexShrink: 0,
                    color: colors.text,
                  }}
                >
                  <span style={{ display: "flex" }}>{Icons.chevronLeft}</span>
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: colors.navy, overflow: "hidden", minWidth: 0 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fromUseCurrentLocation ? t("label_current_location") : riderFrom}
                  </span>
                  <span style={{ color: colors.muted, flexShrink: 0 }}>→</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {riderTo}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, flexShrink: 0 }}>3 / 3</div>
              </div>

              <div style={{ fontSize: 17, fontWeight: 700, color: colors.text, marginBottom: 18, letterSpacing: "-0.02em" }}>
                {t("step_time_title")}
              </div>

              {/* Quick time options */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[
                  { key: "now", label: t("time_now") },
                  { key: "in30", label: t("time_in30") },
                  { key: "in60", label: t("time_in60") },
                  { key: "custom", label: t("time_custom") },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setRiderFindTimeMode(key);
                      if (key !== "custom") {
                        const now = new Date();
                        const offset = key === "in30" ? 30 : key === "in60" ? 60 : 0;
                        const target = new Date(now.getTime() + offset * 60000);
                        setRiderFindDate(new Date(target.getFullYear(), target.getMonth(), target.getDate()));
                        setRiderFindHour(target.getHours());
                        setRiderFindMinute(target.getMinutes());
                        setRiderFindWheelKey((k) => k + 1);
                      }
                    }}
                    style={{
                      padding: "12px 8px",
                      borderRadius: 10,
                      border: `1.5px solid ${riderFindTimeMode === key ? themePrimary : colors.border}`,
                      background: riderFindTimeMode === key ? colors.tint : colors.white,
                      color: riderFindTimeMode === key ? colors.navy : colors.text,
                      fontWeight: riderFindTimeMode === key ? 700 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom time wheels */}
              {riderFindTimeMode === "custom" && (
                <div style={{ marginBottom: 16, display: "flex", gap: 10 }}>
                  <WheelScrollColumn
                    key={`rfdate-${riderFindWheelKey}`}
                    label={t("label_date")}
                    options={dateOptionsForWheel}
                    value={riderFindDate}
                    onChange={setRiderFindDate}
                    format={formatCnDateLabel}
                    equals={sameCalendarDay}
                    variant="light"
                  />
                  <TimeHourMinuteBlock
                    key={`rftime-${riderFindWheelKey}`}
                    variant="light"
                    label={t("label_time")}
                    hour24={riderFindHour}
                    minute={riderFindMinute}
                    onHour24Change={setRiderFindHour}
                    onMinuteChange={setRiderFindMinute}
                  />
                </div>
              )}

              {/* Search button */}
              <button
                type="button"
                onClick={() => setRiderStep("results")}
                style={styles.btn}
              >
                {t("btn_search_rides")}
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {riderStep === "results" && (
            <>
              {/* Summary bar with edit button */}
              <div style={{
                ...styles.card,
                marginTop: 2,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: colors.text, overflow: "hidden" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "42%" }}>
                      {fromUseCurrentLocation ? t("label_current_location") : riderFrom}
                    </span>
                    <span style={{ color: colors.muted, flexShrink: 0 }}>→</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "42%" }}>
                      {riderTo}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 3, fontWeight: 500 }}>
                    {riderFindTimeMode === "now"
                      ? t("time_now")
                      : riderFindTimeMode === "in30"
                        ? t("time_in30")
                        : riderFindTimeMode === "in60"
                          ? t("time_in60")
                          : formatScheduleChipLabel(riderFindDate, riderFindHour, riderFindMinute)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setRiderStep("origin"); setRiderPostActive(false); }}
                  style={{
                    ...styles.btnOutline,
                    width: "auto",
                    padding: "6px 14px",
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {t("btn_edit")}
                </button>
              </div>

              {/* "Your request is live" banner */}
              {riderPostActive && (
                <div style={{
                  ...styles.card,
                  marginTop: 0,
                  padding: "12px 16px",
                  background: colors.tint,
                  border: `1.5px solid rgba(${themePrimaryRgb}, 0.3)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: colors.navy }}>
                    {t("post_request_live")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRiderPostActive(false)}
                    style={{
                      fontSize: 12,
                      color: colors.muted,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Inter', system-ui, sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {t("post_request_cancel")}
                  </button>
                </div>
              )}

              {/* Ride cards */}
              <div style={styles.sectionTitle}>{t("section_nearby")}</div>
              <div style={styles.sectionHeadline}>{t("headline_matches", { count: matchedRides.length })}</div>
              <p style={{ fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
                {t("desc_nearby", { campus: activeCampus.short })}
              </p>
              {matchedRides.length === 0 ? (
                <div style={{ ...styles.card, padding: "22px 18px", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, textAlign: "center" }}>{t("empty_find_rides")}</div>
                </div>
              ) : null}
              {matchedRides.map((ride) => (
                <div
                  key={ride.id}
                  className="cr-ride-card"
                  style={styles.rideCard}
                  onClick={() => {
                    setSelectedRequest(null);
                    setSelectedRide(ride);
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={ride.driver} accent={themePrimary} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: colors.text }}>{ride.driver}</div>
                        <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                          {ride.school} · <StarRating rating={ride.rating} />
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: colors.navy, letterSpacing: "-0.03em" }}>${ride.price.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>{t("label_per_person")}</div>
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    alignItems: "stretch",
                    marginBottom: 12,
                    padding: "12px 14px",
                    background: colors.page,
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 12, paddingTop: 4 }}>
                      <div style={styles.routeDot(true)} />
                      <div style={{ width: 2, flex: 1, minHeight: 16, background: colors.border, margin: "4px 0" }} />
                      <div style={styles.routeDot(false)} />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                      <div>
                        <span style={{ fontSize: 11, color: colors.muted, fontWeight: 600 }}>{t("label_from")} </span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{ride.from}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: colors.muted, fontWeight: 600 }}>{t("label_to")} </span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{ride.to}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <Tag text={ride.time} accent={themePrimary} />
                    <Tag text={t("label_seats_n", { n: ride.seats })} accent={themePrimary} />
                    <Tag text={t("label_detour", { d: ride.detour })} accent={themePrimary} />
                  </div>
                </div>
              ))}

              {/* "Post my request" entry — bottom of list */}
              {!riderPostActive && (
                <button
                  type="button"
                  onClick={() => { setRiderPostNotes(""); setRiderPostError(""); setRiderStep("post"); }}
                  style={{
                    ...styles.btnOutline,
                    marginTop: 4,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  <span style={{ display: "flex", flexShrink: 0 }}>{Icons.plus}</span>
                  {t("post_no_ride_btn")}
                </button>
              )}
            </>
          )}

          {/* ── Step 5B: Post rider request ── */}
          {riderStep === "post" && (
            <div className="cr-step-enter" style={{ ...styles.card, marginTop: 2, padding: "20px" }}>
              {/* Back */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <button
                  type="button"
                  aria-label={t("btn_back")}
                  onClick={() => setRiderStep("results")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 36, height: 36, borderRadius: 10,
                    border: `1px solid ${colors.border}`, background: colors.white,
                    cursor: "pointer", flexShrink: 0, color: colors.text,
                  }}
                >
                  <span style={{ display: "flex" }}>{Icons.chevronLeft}</span>
                </button>
                <div style={{ fontSize: 17, fontWeight: 700, color: colors.text, letterSpacing: "-0.02em" }}>
                  {t("post_request_title")}
                </div>
              </div>

              <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.6, marginBottom: 18 }}>
                {t("post_request_desc")}
              </p>

              {/* Route summary (read-only) */}
              <div style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: colors.page,
                marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
                    <div style={styles.routeDot(true)} />
                    <div style={{ width: 2, flex: 1, minHeight: 14, background: colors.border, margin: "4px 0" }} />
                    <div style={styles.routeDot(false)} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                      {fromUseCurrentLocation ? t("label_current_location") : shortSchedulePlaceName(riderFrom, { fallback: riderFrom })}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{shortSchedulePlaceName(riderTo, { fallback: riderTo })}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.border}` }}>
                  <Tag
                    text={riderFindTimeMode === "now" ? t("time_now") : riderFindTimeMode === "in30" ? t("time_in30") : riderFindTimeMode === "in60" ? t("time_in60") : formatScheduleChipLabel(riderFindDate, riderFindHour, riderFindMinute)}
                    accent={themePrimary}
                  />
                </div>
              </div>

              {/* Preview card (what drivers see) */}
              <div style={{ ...styles.card, padding: "14px 16px", marginBottom: 16, border: `1.5px dashed ${colors.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Avatar name={user?.displayName || user?.email || "?"} accent={themePrimary} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>
                      {user?.displayName?.trim() || user?.email?.split("@")[0] || (lang === "zh" ? "乘客" : "Rider")}
                    </div>
                    <div style={{ fontSize: 12, color: colors.muted }}>{schoolDisplay}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: colors.text, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>
                    {fromUseCurrentLocation ? t("label_current_location") : shortSchedulePlaceName(riderFrom, { fallback: riderFrom })}
                  </span>
                  {" → "}
                  <span style={{ fontWeight: 600 }}>{shortSchedulePlaceName(riderTo, { fallback: riderTo })}</span>
                </div>
                <Tag
                  text={riderFindTimeMode === "now" ? t("time_now") : riderFindTimeMode === "in30" ? t("time_in30") : riderFindTimeMode === "in60" ? t("time_in60") : formatScheduleChipLabel(riderFindDate, riderFindHour, riderFindMinute)}
                  accent={themePrimary}
                />
                {riderPostNotes.trim() && (
                  <div style={{ marginTop: 8, fontSize: 12, color: colors.muted, fontStyle: "italic" }}>
                    {riderPostNotes.trim()}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ ...styles.label, marginBottom: 8 }}>{t("label_notes_rider")}</div>
              <textarea
                value={riderPostNotes}
                onChange={(e) => setRiderPostNotes(e.target.value)}
                placeholder={t("ph_notes_rider")}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  fontSize: 14,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: colors.text,
                  background: colors.white,
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 16,
                }}
              />

              {riderPostError && (
                <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{riderPostError}</div>
              )}

              {/* Confirm post button */}
              <button
                type="button"
                disabled={riderPosting}
                onClick={commitRiderPost}
                style={{ ...styles.btn, opacity: riderPosting ? 0.6 : 1 }}
              >
                {riderPosting ? (lang === "zh" ? "发布中…" : "Posting…") : t("btn_post_request")}
              </button>
            </div>
          )}
        </>
      )}

      {tab === "find" && role === "driver" && (
        <>
          {/* ── Two-path entry ── */}
          {driverFindPath === null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, lineHeight: 1.25, marginBottom: 4 }}>
                {lang === "zh" ? "你想做什么？" : "What would you like to do?"}
              </div>
              {/* Browse requests card */}
              <button
                type="button"
                onClick={() => setDriverFindPath("browse")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "20px 18px",
                  borderRadius: 14,
                  border: `1.5px solid ${colors.border}`,
                  background: colors.card,
                  color: colors.text,
                  cursor: "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  textAlign: "left",
                  boxSizing: "border-box",
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: colors.page,
                  border: `1px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: colors.text,
                }}>
                  {Icons.search}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{t("driver_path_browse")}</div>
                  <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.45 }}>{t("driver_path_browse_desc")}</div>
                </div>
                <span style={{ display: "flex", color: colors.muted, flexShrink: 0 }}>{Icons.chevronRight}</span>
              </button>
              {/* Post trip card */}
              <button
                type="button"
                onClick={() => {
                  setPublishFormError("");
                  setDriverPublishModalOpen(true);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "20px 18px",
                  borderRadius: 14,
                  border: `1.5px solid ${DRIVER_PRIMARY}`,
                  background: DRIVER_PRIMARY,
                  color: "#ffffff",
                  cursor: "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  textAlign: "left",
                  boxSizing: "border-box",
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#ffffff",
                }}>
                  {Icons.plus}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{t("driver_path_post")}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.45 }}>{t("driver_path_post_desc")}</div>
                </div>
                <span style={{ display: "flex", color: "rgba(255,255,255,0.72)", flexShrink: 0 }}>{Icons.chevronRight}</span>
              </button>
            </div>
          )}

          {/* ── Browse passengers ── back button */}
          {driverFindPath === "browse" && (
            <button
              type="button"
              onClick={() => setDriverFindPath(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 0",
                marginBottom: 14,
                border: "none",
                background: "none",
                color: colors.text,
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <span style={{ display: "flex" }}>{Icons.chevronLeft}</span>
              {t("btn_back")}
            </button>
          )}

          {/* ── Browse passengers ── list */}
          {driverFindPath === "browse" && (
            <>
              <div style={{ ...styles.sectionTitle, marginTop: 4 }}>{t("section_find_passengers")}</div>
              <div style={styles.sectionHeadline}>{t("headline_driver_browse_passengers")}</div>

              {driverPendingSavedRoute ? (
                <div
                  style={{
                    ...styles.card,
                    padding: "14px 16px",
                    marginBottom: 14,
                    background: colors.tint,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.55, marginBottom: driverDisplayedRequests.length > 0 ? 12 : 0 }}>
                    {t("driver_saved_route_hint")}
                  </div>
                  {driverDisplayedRequests.length > 0 ? (
                    <button
                      type="button"
                      disabled={publishSubmitting}
                      onClick={() => {
                        driverAutoPublishTokenRef.current = null;
                        void commitPublishDriverRide({ closeModal: false });
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: `1px solid ${DRIVER_PRIMARY}`,
                        background: colors.white,
                        color: DRIVER_PRIMARY,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: publishSubmitting ? "not-allowed" : "pointer",
                        opacity: publishSubmitting ? 0.65 : 1,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {publishSubmitting ? (lang === "zh" ? "发布中…" : "Publishing…") : t("driver_skip_publish")}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {driverDisplayedRequests.length === 0 ? (
                <div style={{ ...styles.card, padding: "22px 18px", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, textAlign: "center" }}>{t("empty_find_requests")}</div>
                </div>
              ) : null}

              {driverDisplayedRequests.map((req) => (
                <div
                  key={req.id}
                  className="cr-ride-card"
                  style={{ ...styles.rideCard, cursor: "pointer" }}
                  onClick={() => {
                    setSelectedRide(null);
                    setSelectedRequest(req);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={req.rider} accent={themePrimary} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{req.rider}</div>
                        <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{req.school}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: colors.navy }}>{req.earn}</div>
                      <div style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>{t("label_est_earnings")}</div>
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px", background: colors.page, borderRadius: 10, marginBottom: 12, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13, fontWeight: 600 }}>
                      <span>{req.from}</span>
                      <span style={{ color: colors.muted, fontWeight: 400 }}>—</span>
                      <span>{req.to}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <Tag text={req.time} accent={themePrimary} />
                    <Tag text={t("label_detour", { d: req.detour })} accent={themePrimary} />
                    {typeof req._km === "number" && <Tag text={t("label_dist_from_you", { km: req._km.toFixed(1) })} accent={themePrimary} />}
                  </div>
                  <button
                    type="button"
                    style={{ ...styles.btn, marginBottom: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRide(null);
                      setSelectedRequest(req);
                    }}
                  >
                    {t("btn_view_details")}
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
