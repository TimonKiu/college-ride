import { useAppCtx } from "../context/AppContext.jsx";
import { Icons, PlaceSuggestField, TimeHourMinuteBlock } from "../components/shared.jsx";
import {
  formatScheduleMinutes,
  shortSchedulePlaceName,
  getCommonRouteTimeFields,
  scheduleEntryInHourSlot,
  scheduleReturnInHourSlot,
  WEEKDAY_LABELS,
} from "../utils/scheduleUtils.js";

export default function SavedTab() {
  const ctx = useAppCtx();
  const {
    tab, t, colors, styles, themePrimary, themePrimaryRgb, lang, role,
    currentLocationCoords, activeCampus,
    commonRoutes, deleteCommonRoute, applyCommonRoute,
    showCommonRouteCreateForm, setShowCommonRouteCreateForm,
    commonRouteSaveName, setCommonRouteSaveName,
    commonRouteSaving,
    crFrom, setCrFrom, crFromCoords, setCrFromCoords,
    crTo, setCrTo, crToCoords, setCrToCoords,
    crFromUseCL, setCrFromUseCL,
    crTimeEnabled, setCrTimeEnabled,
    crHour, setCrHour,
    crMinute, setCrMinute,
    resetCommonRouteCreateForm,
    commitCreateCommonRoute,
    scheduleEntries, deleteScheduleEntry,
    scheduleHourSlots, scheduleWeekGridBounds, weeklyGridDayLabels,
    scheduleModalOpen, setScheduleModalOpen, openScheduleModal,
    scheduleModalWeekday, setScheduleModalWeekday,
    scheduleModalHour, setScheduleModalHour,
    scheduleModalMinute, setScheduleModalMinute,
    scheduleModalFrom, setScheduleModalFrom,
    scheduleModalFromCoords, setScheduleModalFromCoords,
    scheduleModalTo, setScheduleModalTo,
    scheduleModalToCoords, setScheduleModalToCoords,
    scheduleModalFromUseCL, setScheduleModalFromUseCL,
    scheduleModalReturnEnabled, setScheduleModalReturnEnabled,
    scheduleModalReturnHour, setScheduleModalReturnHour,
    scheduleModalReturnMinute, setScheduleModalReturnMinute,
    scheduleModalCommitting,
    commitScheduleEntry,
    tWeekdays,
  } = ctx;

  return (
    <>
      {tab === "saved" && (
        <>
          <div style={styles.sectionTitle}>{t("section_saved")}</div>
          <div style={styles.sectionHeadline}>{t("headline_saved")}</div>
          <p style={{ fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 14, lineHeight: 1.55 }}>
            {role === "driver" ? t("desc_saved_driver") : t("desc_saved_rider")}
          </p>

          <div style={{ ...styles.card, marginBottom: 14 }}>
            {!showCommonRouteCreateForm ? (
              <button
                type="button"
                onClick={() => {
                  resetCommonRouteCreateForm();
                  setShowCommonRouteCreateForm(true);
                }}
                style={{ ...styles.btnOutline, width: "100%", marginBottom: 0 }}
              >
                创建常用路线
              </button>
            ) : (
              <div>
                <div style={{ ...styles.label, marginBottom: 8 }}>路线名称</div>
                <input
                  type="text"
                  value={commonRouteSaveName}
                  onChange={(e) => setCommonRouteSaveName(e.target.value)}
                  placeholder={t("ph_route_name")}
                  style={{ ...styles.input, marginBottom: 12 }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer", fontSize: 14, color: colors.text }}>
                  <input
                    type="checkbox"
                    className="cr-checkbox"
                    checked={crFromUseCL}
                    onChange={(e) => {
                      setCrFromUseCL(e.target.checked);
                      if (e.target.checked) {
                        setCrFrom("");
                        setCrFromCoords(null);
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      ["--cr-checkbox-border"]: colors.navy,
                      ["--cr-checkbox-fill"]: colors.navy,
                      ["--cr-checkbox-dot"]: colors.white,
                    }}
                  />
                  {t("cb_use_current_loc")}
                </label>
                {!crFromUseCL && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ ...styles.label, marginBottom: 6 }}>{t("label_origin_point")}</div>
                    <PlaceSuggestField
                      inputId="cr-create-from"
                      value={crFrom}
                      onChange={setCrFrom}
                      onCoordsChange={setCrFromCoords}
                      placeholder={t("ph_address")}
                      variant="light"
                      borderColor={colors.border}
                      hoverRgb={themePrimaryRgb}
                      biasLat={currentLocationCoords?.lat ?? activeCampus.lat}
                      biasLng={currentLocationCoords?.lng ?? activeCampus.lng}
                      icon={
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: colors.navy,
                            display: "flex",
                            zIndex: 1,
                            pointerEvents: "none",
                          }}
                        >
                          {Icons.pin}
                        </span>
                      }
                      inputStyle={{ ...styles.input, marginBottom: 0, paddingLeft: 36 }}
                      wrapperStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white }}
                    />
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...styles.label, marginBottom: 6 }}>{t("label_return_point")}</div>
                  <PlaceSuggestField
                    inputId="cr-create-to"
                    value={crTo}
                    onChange={setCrTo}
                    onCoordsChange={setCrToCoords}
                    placeholder={t("ph_destination")}
                    variant="light"
                    borderColor={colors.border}
                    hoverRgb={themePrimaryRgb}
                    biasLat={currentLocationCoords?.lat ?? activeCampus.lat}
                    biasLng={currentLocationCoords?.lng ?? activeCampus.lng}
                    icon={
                      <span
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: colors.navy,
                          display: "flex",
                          zIndex: 1,
                          pointerEvents: "none",
                        }}
                      >
                        {Icons.flag}
                      </span>
                    }
                    inputStyle={{ ...styles.input, marginBottom: 0, paddingLeft: 36 }}
                    wrapperStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: crTimeEnabled ? 10 : 12, cursor: "pointer", fontSize: 14, color: colors.text }}>
                  <input
                    type="checkbox"
                    className="cr-checkbox"
                    checked={crTimeEnabled}
                    onChange={(e) => setCrTimeEnabled(e.target.checked)}
                    style={{
                      cursor: "pointer",
                      ["--cr-checkbox-border"]: colors.navy,
                      ["--cr-checkbox-fill"]: colors.navy,
                      ["--cr-checkbox-dot"]: colors.white,
                    }}
                  />
                  {t("cb_set_time")}
                </label>
                {crTimeEnabled && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, marginBottom: 8 }}>{t("label_depart_time_24h")}</div>
                    <TimeHourMinuteBlock
                      hideLabel
                      variant="light"
                      hour24={crHour}
                      minute={crMinute}
                      onHour24Change={setCrHour}
                      onMinuteChange={setCrMinute}
                    />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommonRouteCreateForm(false);
                      resetCommonRouteCreateForm();
                    }}
                    style={{ ...styles.btnOutline, flex: 1 }}
                  >
                    {t("btn_cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => commitCreateCommonRoute()}
                    disabled={
                      commonRouteSaving ||
                      !crTo.trim() ||
                      !(crFromUseCL || crFrom.trim())
                    }
                    style={{
                      ...styles.btn,
                      flex: 1,
                      opacity:
                        commonRouteSaving || !crTo.trim() || !(crFromUseCL || crFrom.trim()) ? 0.45 : 1,
                    }}
                  >
                    {commonRouteSaving ? t("btn_saving") : t("btn_save")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {commonRoutes.length === 0 ? (
            <div style={{ ...styles.card, padding: "22px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, textAlign: "center" }}>
                {t("empty_saved")}
              </div>
            </div>
          ) : (
            commonRoutes.map((trip) => {
              const shortFrom = trip.fromUseCurrentLocation
                ? t("label_current_location")
                : shortSchedulePlaceName(trip.fromLabel, { fallback: t("label_origin_fallback") });
              const shortTo = shortSchedulePlaceName(trip.toLabel, { fallback: t("label_return_fallback") });
              const tf = getCommonRouteTimeFields(trip);
              const summary =
                `${shortFrom} → ${shortTo}` +
                (tf.timeEnabled ? ` · ${t("label_depart_short")} ${formatScheduleMinutes(tf.outHour * 60 + tf.outMinute)}` : "");
              return (
                <div key={trip.id} style={{ ...styles.card, padding: "8px 12px", marginBottom: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 4,
                      minHeight: 22,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: colors.text,
                        lineHeight: 1.25,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {trip.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => applyCommonRoute(trip)}
                        style={{
                          border: "none",
                          background: colors.navy,
                          color: colors.white,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "5px 10px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          whiteSpace: "nowrap",
                        }}
                      >
                        使用此路线
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCommonRoute(trip.id)}
                        style={{
                          border: "none",
                          background: "#dc2626",
                          color: colors.white,
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "5px 10px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t("btn_delete")}
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: colors.muted,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={summary}
                  >
                    {summary}
                  </div>
                </div>
              );
            })
          )}

          <div style={{ marginTop: 8, marginBottom: 10, minWidth: 0, width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...styles.sectionTitle, marginTop: 0, marginBottom: 4 }}>{t("section_weekly")}</div>
                <div style={{ ...styles.sectionHeadline, margin: 0 }}>{t("headline_weekly")}</div>
              </div>
              <button
                type="button"
                onClick={openScheduleModal}
                aria-label={t("btn_add_schedule")}
                title={t("btn_add_schedule")}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: `1.5px solid ${colors.navy}`,
                  background: colors.white,
                  color: colors.navy,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  marginTop: 2,
                }}
              >
                <span style={{ display: "flex" }}>{Icons.plus}</span>
              </button>
            </div>
            <p style={{ fontSize: 13, color: colors.muted, margin: "0 0 12px", lineHeight: 1.55 }}>
              {t("desc_weekly")}
            </p>
          </div>

          <div
            className="cr-weekly-schedule-table"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              marginBottom: 8,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              overflow: "hidden",
              background: colors.page,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "22px repeat(7, minmax(0, 1fr))",
                gap: 0,
                background: colors.card,
                borderBottom: `1px solid ${colors.border}`,
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <div style={{ minHeight: 22, minWidth: 0 }} aria-hidden />
              {weeklyGridDayLabels.map((label) => (
                <div
                  key={label}
                  style={{
                    textAlign: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: colors.muted,
                    padding: "5px 0",
                    letterSpacing: 0,
                    borderLeft: `1px solid ${colors.border}`,
                    minWidth: 0,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            {scheduleHourSlots.map((slotStart) => (
              <div
                key={slotStart}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px repeat(7, minmax(0, 1fr))",
                  gap: 0,
                  borderTop: slotStart > scheduleWeekGridBounds.rowStartMin ? `1px solid ${colors.border}` : undefined,
                  minHeight: 44,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: colors.muted,
                    padding: "5px 1px 0 0",
                    textAlign: "right",
                    background: colors.page,
                    boxSizing: "border-box",
                    lineHeight: 1.15,
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  {formatScheduleMinutes(slotStart)}
                </div>
                {WEEKDAY_LABELS.map((_, wd) => {
                  const cellItems = scheduleEntries.filter(
                    (e) =>
                      e.weekday === wd &&
                      (scheduleEntryInHourSlot(e, slotStart) || scheduleReturnInHourSlot(e, slotStart))
                  );
                  return (
                    <div
                      key={`${slotStart}-${wd}`}
                      style={{
                        borderLeft: `1px solid ${colors.border}`,
                        padding: 2,
                        background: colors.white,
                        minHeight: 40,
                        minWidth: 0,
                        maxWidth: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        alignItems: "stretch",
                        boxSizing: "border-box",
                        overflow: "hidden",
                      }}
                    >
                      {cellItems.map((entry) => {
                        const shortFrom = entry.fromUseCurrentLocation
                          ? t("label_current_location")
                          : shortSchedulePlaceName(entry.fromLabel, { fallback: t("label_origin_fallback") });
                        const shortTo = shortSchedulePlaceName(entry.toLabel, { fallback: t("label_dest_fallback") });
                        const routeShort = `${shortFrom} → ${shortTo}`;
                        const showDep = scheduleEntryInHourSlot(entry, slotStart);
                        const showRet = scheduleReturnInHourSlot(entry, slotStart);
                        return (
                          <div
                            key={`${entry.id}-${slotStart}`}
                            style={{
                              background: colors.card,
                              borderRadius: 6,
                              padding: "5px 4px 4px",
                              border: `1px solid ${colors.border}`,
                              fontSize: 9,
                              lineHeight: 1.25,
                              minWidth: 0,
                              maxWidth: "100%",
                              overflow: "hidden",
                            }}
                          >
                            {showDep && (
                              <>
                                <div style={{ fontWeight: 700, color: colors.navy, fontSize: 9, marginBottom: 2 }}>
                                  {formatScheduleMinutes(entry.minutes)}
                                </div>
                                <div
                                  style={{
                                    color: colors.text,
                                    marginBottom: showRet ? 4 : 4,
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {routeShort}
                                </div>
                              </>
                            )}
                            {showRet && !showDep && (
                              <div
                                style={{
                                  color: colors.text,
                                  marginBottom: 4,
                                  fontSize: 9,
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {routeShort}
                              </div>
                            )}
                            {showRet && (
                              <div style={{ fontSize: 9, fontWeight: 600, color: colors.muted, marginBottom: 4 }}>
                                {t("label_return_short")} {formatScheduleMinutes(entry.returnMinutes)}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => applyCommonRoute(entry)}
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  padding: "5px 4px",
                                  borderRadius: 5,
                                  border: "none",
                                  background: colors.navy,
                                  color: colors.white,
                                  fontSize: 9,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "'Inter', system-ui, sans-serif",
                                }}
                              >
                                {t("btn_use")}
                              </button>
                              <button
                                type="button"
                                aria-label="删除"
                                onClick={() => deleteScheduleEntry(entry.id)}
                                style={{
                                  padding: "4px 5px",
                                  borderRadius: 5,
                                  border: `1px solid ${colors.border}`,
                                  background: colors.white,
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  lineHeight: 0,
                                  flexShrink: 0,
                                }}
                              >
                                <span style={{ display: "flex" }}>{Icons.trash}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {scheduleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <button
            type="button"
            aria-label="关闭"
            onClick={() => setScheduleModalOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              border: "none",
              background: "rgba(0,0,0,0.5)",
              cursor: "pointer",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cr-schedule-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 400,
              maxHeight: "min(92vh, 880px)",
              overflowY: "auto",
              background: themePrimary,
              color: "#ffffff",
              borderRadius: 16,
              padding: "20px 18px 18px",
              boxShadow: "0 24px 56px rgba(0,0,0,0.35)",
              zIndex: 1,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div id="cr-schedule-modal-title" style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: "#ffffff" }}>
              {t("modal_schedule_title")}
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", marginBottom: 16, lineHeight: 1.5 }}>
              {t("modal_schedule_desc")}
            </p>

            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>{t("label_weekday")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {tWeekdays().map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setScheduleModalWeekday(i)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${scheduleModalWeekday === i ? "#ffffff" : "rgba(255,255,255,0.45)"}`,
                    background: scheduleModalWeekday === i ? "#ffffff" : "transparent",
                    color: scheduleModalWeekday === i ? themePrimary : "rgba(255,255,255,0.95)",
                    fontWeight: scheduleModalWeekday === i ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>{t("label_depart_time_24h")}</div>
            <div style={{ marginBottom: 14 }}>
              <TimeHourMinuteBlock
                hideLabel
                variant="dark"
                hour24={scheduleModalHour}
                minute={scheduleModalMinute}
                onHour24Change={setScheduleModalHour}
                onMinuteChange={setScheduleModalMinute}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                cursor: "pointer",
                fontSize: 14,
                color: "rgba(255,255,255,0.95)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                className="cr-checkbox"
                checked={scheduleModalFromUseCL}
                onChange={(e) => {
                  setScheduleModalFromUseCL(e.target.checked);
                  if (e.target.checked) {
                    setScheduleModalFrom("");
                    setScheduleModalFromCoords(null);
                  }
                }}
                style={{
                  cursor: "pointer",
                  ["--cr-checkbox-border"]: "#ffffff",
                  ["--cr-checkbox-fill"]: "#ffffff",
                  ["--cr-checkbox-dot"]: themePrimary,
                }}
              />
              {t("cb_use_current_loc")}
            </label>

            {!scheduleModalFromUseCL && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>{t("label_origin_modal")}</div>
                <PlaceSuggestField
                  inputId="cr-schedule-modal-from"
                  value={scheduleModalFrom}
                  onChange={setScheduleModalFrom}
                  onCoordsChange={setScheduleModalFromCoords}
                  placeholder={t("ph_address_place")}
                  variant="dark"
                  borderColor="rgba(255,255,255,0.25)"
                  hoverRgb="255, 255, 255"
                  biasLat={currentLocationCoords?.lat ?? activeCampus.lat}
                  biasLng={currentLocationCoords?.lng ?? activeCampus.lng}
                  icon={
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(255,255,255,0.9)",
                        display: "flex",
                        zIndex: 1,
                        pointerEvents: "none",
                      }}
                    >
                      {Icons.pin}
                    </span>
                  }
                  inputStyle={{ ...styles.input, marginBottom: 0, paddingLeft: 36, paddingTop: 12, paddingBottom: 12, fontSize: 15 }}
                  wrapperStyle={{
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.28)",
                    background: "rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 6 }}>{t("label_destination_modal")}</div>
              <PlaceSuggestField
                inputId="cr-schedule-modal-to"
                value={scheduleModalTo}
                onChange={setScheduleModalTo}
                onCoordsChange={setScheduleModalToCoords}
                placeholder="英文/中文地址或地点名（楼、餐厅等）"
                variant="dark"
                borderColor="rgba(255,255,255,0.25)"
                hoverRgb="255, 255, 255"
                biasLat={currentLocationCoords?.lat ?? activeCampus.lat}
                biasLng={currentLocationCoords?.lng ?? activeCampus.lng}
                icon={
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "rgba(255,255,255,0.9)",
                      display: "flex",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  >
                    {Icons.flag}
                  </span>
                }
                inputStyle={{ ...styles.input, marginBottom: 0, paddingLeft: 36, paddingTop: 12, paddingBottom: 12, fontSize: 15 }}
                wrapperStyle={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: "rgba(0,0,0,0.15)",
                }}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                cursor: "pointer",
                fontSize: 14,
                color: "rgba(255,255,255,0.95)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                className="cr-checkbox"
                checked={scheduleModalReturnEnabled}
                onChange={(e) => setScheduleModalReturnEnabled(e.target.checked)}
                style={{
                  cursor: "pointer",
                  ["--cr-checkbox-border"]: "#ffffff",
                  ["--cr-checkbox-fill"]: "#ffffff",
                  ["--cr-checkbox-dot"]: themePrimary,
                }}
              />
              {t("cb_return")}
            </label>

            <div
              style={{
                maxHeight: scheduleModalReturnEnabled ? 320 : 0,
                opacity: scheduleModalReturnEnabled ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 0.2s ease, opacity 0.2s ease",
                marginBottom: scheduleModalReturnEnabled ? 14 : 0,
                pointerEvents: scheduleModalReturnEnabled ? "auto" : "none",
              }}
              aria-hidden={!scheduleModalReturnEnabled}
            >
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>{t("label_return_time_24h")}</div>
                <TimeHourMinuteBlock
                  hideLabel
                  variant="dark"
                  hour24={scheduleModalReturnHour}
                  minute={scheduleModalReturnMinute}
                  onHour24Change={setScheduleModalReturnHour}
                  onMinuteChange={setScheduleModalReturnMinute}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.55)",
                  background: "transparent",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {t("btn_cancel")}
              </button>
              <button
                type="button"
                onClick={() => commitScheduleEntry()}
                disabled={
                  scheduleModalCommitting ||
                  !scheduleModalTo.trim() ||
                  !(scheduleModalFromUseCL || scheduleModalFrom.trim())
                }
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#ffffff",
                  color: themePrimary,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor:
                    scheduleModalCommitting ||
                    !scheduleModalTo.trim() ||
                    !(scheduleModalFromUseCL || scheduleModalFrom.trim())
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  opacity:
                    scheduleModalCommitting ||
                    !scheduleModalTo.trim() ||
                    !(scheduleModalFromUseCL || scheduleModalFrom.trim())
                      ? 0.45
                      : 1,
                }}
              >
                {scheduleModalCommitting ? t("btn_saving") : t("btn_save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
