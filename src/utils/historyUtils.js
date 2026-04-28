export function formatHistoryTripDate(ts, lang) {
  const trip = new Date(ts);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startTrip = new Date(trip.getFullYear(), trip.getMonth(), trip.getDate());
  const diffDays = Math.round((startToday - startTrip) / 86400000);
  if (diffDays === 0) return lang === "zh" ? "今天" : "Today";
  if (diffDays === 1) return lang === "zh" ? "昨天" : "Yesterday";
  if (lang === "zh") return `${trip.getMonth() + 1}月${trip.getDate()}日`;
  const opts = { month: "short", day: "numeric" };
  if (trip.getFullYear() !== today.getFullYear()) opts.year = "numeric";
  return trip.toLocaleDateString("en-US", opts);
}

export function inferPlatformStatusKey(kind, timePref) {
  const tp = (timePref || "").trim();
  if (kind === "booking_passenger") return "booked";
  if (kind === "booking_driver") return "accepted";
  if (/明天|后天|周[一二三四五六日天]|星期|tomorrow|the day after|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b|\bsaturday\b|\bsunday\b/i.test(tp)) {
    return "scheduled";
  }
  if (kind === "passenger_request") return "matching";
  return "in_progress";
}

export const PLATFORM_STATUS_I18N = {
  scheduled: "history_status_scheduled",
  in_progress: "history_status_in_progress",
  matching: "history_status_matching",
  booked: "history_status_booked",
  accepted: "history_status_accepted",
};

export const HISTORY_LEDGER_PREVIEW_MAX = 2;
