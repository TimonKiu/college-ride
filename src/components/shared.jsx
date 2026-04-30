/**
 * shared.jsx — all small helper components extracted from CollegeRide.jsx
 * Exported: Icon, Icons, Avatar, StarRating, Tag, MapPickerPanel,
 *           PlaceSuggestField, WheelScrollColumn, TimeHourMinuteBlock, TripRouteMap
 * Also exports constants: RIDER_PRIMARY, RIDER_RGB, DRIVER_PRIMARY, DRIVER_RGB, PRIMARY,
 *   FONT_LINK, WEEKDAYS_CN, formatCnDateLabel, sameCalendarDay, buildDateOptions,
 *   MINUTE_OPTIONS, HOUR_GLOBAL_OPTIONS, HOUR_REBOUND_JUMP, formatScheduleChipLabel,
 *   globalHourIndexToHour24, hour24ToGlobalHourIndex, WHEEL_LIGHT_RGB, WHEEL_LABEL_ROW_MIN_H
 */
import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { COLLEGE_VECTOR_MAP_STYLE, applyCollegeRoadHierarchy } from "../collegeRoadMapStyle.js";

export const FONT_LINK = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

export const RIDER_PRIMARY = "#2563EB";
export const RIDER_RGB = "37, 99, 235";
export const DRIVER_PRIMARY = "#0a0a0a";
export const DRIVER_RGB = "10, 10, 10";
export const PRIMARY = RIDER_PRIMARY;

// ── Utility functions used by shared components ──────────────────────────────

export const WEEKDAYS_CN = ["日", "一", "二", "三", "四", "五", "六"];

export function formatCnDateLabel(d) {
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS_CN[d.getDay()]}`;
}

export function sameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function buildDateOptions(daysAhead = 60) {
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const out = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
export const HOUR_GLOBAL_SLOT_COUNT = 2400;
export const HOUR_GLOBAL_OPTIONS = Array.from({ length: HOUR_GLOBAL_SLOT_COUNT }, (_, i) => i);
export const HOUR_REBOUND_JUMP = 1200;

function defaultWheelEquals(a, b) {
  return a === b;
}

export function formatScheduleChipLabel(date, h24, min) {
  return `${formatCnDateLabel(date)} ${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function globalHourIndexToHour24(gi) {
  return ((gi % 24) + 24) % 24;
}

export function hour24ToGlobalHourIndex(h24) {
  const h = ((h24 % 24) + 24) % 24;
  const mid = Math.floor(HOUR_GLOBAL_SLOT_COUNT / 2);
  let gi = mid - (mid % 24) + h;
  if (gi >= HOUR_GLOBAL_SLOT_COUNT) gi -= 24;
  if (gi < 0) gi += 24;
  return gi;
}

export const WHEEL_LIGHT_RGB = "37, 99, 235";
export const WHEEL_LABEL_ROW_MIN_H = 28;

// ── photon helpers (needed by PlaceSuggestField) ─────────────────────────────

function mergePhotonFeatureLists(featuresArrays) {
  const seen = new Set();
  const out = [];
  for (const arr of featuresArrays) {
    if (!Array.isArray(arr)) continue;
    for (const f of arr) {
      const c = f?.geometry?.coordinates;
      const p = f?.properties || {};
      const name = p.name || p.street || "";
      const key =
        c?.length >= 2
          ? `${Math.round(c[0] * 1e5) / 1e5}:${Math.round(c[1] * 1e5) / 1e5}:${String(name)}`
          : `n:${JSON.stringify(p)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

async function photonSearch(q, { lat, lon, signal } = {}) {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const limit = 15;
  const qenc = encodeURIComponent(trimmed);
  const bias =
    lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon) ? `&lat=${lat}&lon=${lon}` : "";
  const langs = ["en", "zh"];
  const urls = [];
  for (const lang of langs) {
    urls.push(`https://photon.komoot.io/api/?q=${qenc}&limit=${limit}&lang=${lang}${bias}`);
  }
  if (bias) {
    for (const lang of langs) {
      urls.push(`https://photon.komoot.io/api/?q=${qenc}&limit=${limit}&lang=${lang}`);
    }
  }
  const results = await Promise.all(
    urls.map((url) =>
      fetch(url, { signal })
        .then((r) => (r.ok ? r.json() : { features: [] }))
        .catch(() => ({ features: [] }))
    )
  );
  return mergePhotonFeatureLists(results.map((d) => d.features || [])).slice(0, 15);
}

function formatPhotonFeature(f) {
  const p = f.properties || {};
  const parts = [];
  const hn = p.housenumber || p.house_number;
  const st = p.street;
  if (p.name) parts.push(p.name);
  if (hn && st) parts.push(`${hn} ${st}`);
  else if (st) parts.push(st);
  else if (hn) parts.push(String(hn));
  const city = p.city || p.town || p.village || p.district || p.locality;
  if (city) parts.push(city);
  const region = p.state || p.region;
  if (region) parts.push(region);
  if (p.postcode) parts.push(p.postcode);
  if (p.country) parts.push(p.country);
  if (parts.length) return [...new Set(parts)].join(", ");
  const c = f.geometry?.coordinates;
  if (c?.length >= 2) return `${c[1].toFixed(4)}, ${c[0].toFixed(4)}`;
  return "";
}

// ── nearestPlaceName (needed by MapPickerPanel) ───────────────────────────────

const DC_AREA_POINTS_LOCAL = {
  "Foggy Bottom": [38.9009, -77.0507],
  "Capitol Hill": [38.8899, -77.0091],
  Georgetown: [38.9097, -77.0734],
  "Dupont Circle": [38.9097, -77.0434],
  Tenleytown: [38.9475, -77.0802],
  "Downtown DC": [38.9072, -77.0369],
  Shaw: [38.9106, -77.022],
  "Navy Yard": [38.8742, -77.0072],
};
const BAL_AREA_POINTS_LOCAL = {
  "Homewood Gate": [39.329, -76.621],
  "Charles Village": [39.325, -76.615],
  Hampden: [39.336, -76.632],
  "JHU East Baltimore": [39.299, -76.593],
  "Peabody Institute": [39.297, -76.616],
  "SAIS (DC)": [38.9089, -77.0434],
};
const PICKER_AREA_POINTS_LOCAL = { ...DC_AREA_POINTS_LOCAL, ...BAL_AREA_POINTS_LOCAL };

function nearestPlaceName(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const [name, coords] of Object.entries(PICKER_AREA_POINTS_LOCAL)) {
    const [plat, plng] = coords;
    const d = (lat - plat) ** 2 + (lng - plng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// ── approxKm ─────────────────────────────────────────────────────────────────

function approxKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── UserLocationMarker ────────────────────────────────────────────────────────

export function UserLocationMarker({ lat, lng }) {
  if (lat == null || lng == null) return null;
  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom">
      <div
        className="cr-user-marker-wrap"
        style={{
          width: 28,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 2px 5px rgba(37,99,235,0.4))",
        }}
      >
        <svg width="28" height="36" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M12 2C7.58 2 4 5.58 4 10c0 6.5 8 14 8 14s8-7.5 8-14c0-4.42-3.58-8-8-8z"
            fill="#2563EB"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="10" r="3" fill="#ffffff" />
        </svg>
      </div>
    </Marker>
  );
}

// ── Icon & Icons ──────────────────────────────────────────────────────────────

export function Icon({ children, size = 20, title, stroke = 1.75 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const Icons = {
  car: (
    <Icon title="CollegeRide">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.2-1.4-.3c-.2-.1-.5-.2-.7-.3-.3-.2-.7-.4-1.1-.4h-3.2c-.4 0-.8.2-1.1.4-.2.1-.5.2-.7.3-.1.1-.9.3-1.4.3-2 0-3.7.6-4.5 1.8C2.6 12.4 2 13.5 2 14.7V16c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M9 17h6" />
    </Icon>
  ),
  search: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </Icon>
  ),
  plus: (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  list: (
    <Icon>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  ),
  user: (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </Icon>
  ),
  pin: (
    <Icon>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2" fill="currentColor" stroke="none" />
    </Icon>
  ),
  flag: (
    <Icon>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </Icon>
  ),
  clock: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  ),
  route: (
    <Icon>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <path d="M6 8v8" />
      <path d="M10 6h8M10 18h8" />
    </Icon>
  ),
  users: (
    <Icon>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  mapPath: (
    <Icon>
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
      <path d="M9 3v15M15 6v15" />
    </Icon>
  ),
  chevronLeft: (
    <Icon>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  ),
  chevronRight: (
    <Icon>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  ),
  globe: (
    <Icon stroke={1.65}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
    </Icon>
  ),
  chevronDown: (
    <Icon>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  navigate: (
    <Icon stroke={1.5}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5V2M12 22v-3M5 12H2M22 12h-3" />
    </Icon>
  ),
  star: (
    <Icon stroke={1.5}>
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 14 2 9.4h7.6L12 2z" />
    </Icon>
  ),
  trash: (
    <Icon title="删除" size={14} stroke={1.65}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  ),
  chat: (
    <Icon title="消息" size={14} stroke={1.65}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  ),
};

// ── Avatar ────────────────────────────────────────────────────────────────────

export const Avatar = ({ name, accent = PRIMARY }) => {
  const c = {
    background: accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    flexShrink: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
    border: "2px solid #fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        ...c,
      }}
    >
      {name.charAt(0)}
    </div>
  );
};

// ── StarRating ────────────────────────────────────────────────────────────────

export const StarRating = ({ rating, accent = PRIMARY }) => (
  <span
    style={{
      color: "#475569",
      fontSize: 12,
      fontWeight: 500,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }}
  >
    <span style={{ display: "inline-flex", color: accent }}>{Icons.star}</span>
    {rating}
  </span>
);

// ── Tag ───────────────────────────────────────────────────────────────────────

export const Tag = ({ text, accent = PRIMARY }) => {
  const rgb = accent === DRIVER_PRIMARY ? DRIVER_RGB : RIDER_RGB;
  return (
    <span
      style={{
        background: `rgba(${rgb}, 0.06)`,
        color: accent,
        fontSize: 11,
        fontWeight: 600,
        padding: "5px 10px",
        borderRadius: 6,
        letterSpacing: "0.02em",
        border: `1px solid rgba(${rgb}, 0.12)`,
      }}
    >
      {text}
    </span>
  );
};

// ── MapPickerPanel ────────────────────────────────────────────────────────────

export function MapPickerPanel({ onPick, onClose, lineColor, center, userLocation }) {
  const c = center ?? [38.9072, -77.0369];
  return (
    <div
      style={{
        position: "relative",
        height: 200,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #dce3ed",
        marginBottom: 12,
      }}
    >
      <Map
        key={`${c[0].toFixed(5)},${c[1].toFixed(5)}`}
        mapLib={maplibregl}
        initialViewState={{ longitude: c[1], latitude: c[0], zoom: 12 }}
        mapStyle={COLLEGE_VECTOR_MAP_STYLE}
        style={{ height: "100%", width: "100%" }}
        scrollZoom
        onLoad={(e) => applyCollegeRoadHierarchy(e.target)}
        onClick={(ev) => {
          const { lat, lng } = ev.lngLat;
          onPick({ name: nearestPlaceName(lat, lng), lat, lng });
        }}
      >
        <UserLocationMarker lat={userLocation?.lat} lng={userLocation?.lng} />
      </Map>
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1000,
          padding: "6px 12px",
          borderRadius: 8,
          border: `1px solid ${lineColor}`,
          background: "rgba(255,255,255,0.95)",
          fontSize: 12,
          fontWeight: 600,
          color: lineColor,
          cursor: "pointer",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        关闭
      </button>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          right: 8,
          zIndex: 1000,
          fontSize: 11,
          color: "#475569",
          background: "rgba(255,255,255,0.92)",
          padding: "6px 10px",
          borderRadius: 6,
          fontWeight: 500,
        }}
      >
        点击地图选择出发位置
      </div>
    </div>
  );
}

// ── PlaceSuggestField ─────────────────────────────────────────────────────────

export function PlaceSuggestField({
  value,
  onChange,
  onCoordsChange,
  placeholder,
  icon,
  borderColor,
  inputStyle,
  wrapperStyle,
  hoverRgb = RIDER_RGB,
  variant = "light",
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  inputId,
  biasLat,
  biasLng,
}) {
  const dark = variant === "dark";
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [fixedListPos, setFixedListPos] = useState(null);

  const q = value.trim();
  const showDropdown = open && q.length >= 2;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    const lat =
      typeof biasLat === "number" && Number.isFinite(biasLat) ? biasLat : undefined;
    const lon =
      typeof biasLng === "number" && Number.isFinite(biasLng) ? biasLng : undefined;

    timerRef.current = setTimeout(async () => {
      try {
        const features = await photonSearch(q, { lat, lon, signal: ac.signal });
        if (!ac.signal.aborted) setItems(features);
      } catch (e) {
        if (e.name !== "AbortError" && !ac.signal.aborted) setItems([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(timerRef.current);
      ac.abort();
    };
  }, [q, biasLat, biasLng]);

  useEffect(() => {
    if (!open) return;
    const down = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  useLayoutEffect(() => {
    if (!dark || !showDropdown) {
      setFixedListPos(null);
      return;
    }
    const update = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const gap = 4;
      const margin = 8;
      const maxH = Math.min(300, Math.max(80, window.innerHeight - r.bottom - gap - margin));
      setFixedListPos({ left: r.left, top: r.bottom + gap, width: r.width, maxH });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [dark, showDropdown, value, items.length]);

  const handlePick = (feat) => {
    const label = formatPhotonFeature(feat);
    const coords = feat.geometry?.coordinates;
    onChange(label);
    if (coords?.length >= 2) onCoordsChange?.({ lat: coords[1], lng: coords[0] });
    else onCoordsChange?.(null);
    setOpen(false);
    setItems([]);
  };

  const handleInputChange = (e) => {
    onCoordsChange?.(null);
    onChange(e.target.value);
    setOpen(true);
  };

  const listBg = dark ? "rgba(22,22,28,0.98)" : "#fff";
  const listBorder = dark ? "rgba(255,255,255,0.18)" : borderColor;
  const rowText = dark ? "#f1f5f9" : "#0a0a0a";
  const mutedText = dark ? "rgba(148,163,184,0.95)" : "#64748b";

  const lightWrapperDefaults =
    !dark
      ? {
          display: "flex",
          alignItems: "center",
          width: "100%",
          boxSizing: "border-box",
          borderRadius: 10,
          border: `1px solid ${borderColor ?? "#dce3ed"}`,
          background: "#ffffff",
          transition: "border-color 0.15s ease",
        }
      : {};
  const lightInputDefaults =
    !dark && !inputStyle
      ? {
          flex: 1,
          minWidth: 0,
          width: "100%",
          padding: "12px 14px",
          fontSize: 15,
          fontFamily: "'Inter', system-ui, sans-serif",
          outline: "none",
          background: "#ffffff",
          boxSizing: "border-box",
          borderRadius: 10,
          appearance: "none",
          WebkitAppearance: "none",
        }
      : {};

  const suggestionList = (
    <>
      {loading && (
        <li style={{ padding: "10px 12px", fontSize: 12, color: mutedText, fontWeight: 500 }}>搜索中…</li>
      )}
      {!loading &&
        items.map((feat, i) => {
          const label = formatPhotonFeature(feat);
          const key = `${feat.properties?.osm_id ?? ""}-${feat.geometry?.coordinates?.join(",") ?? i}-${i}`;
          return (
            <li
              key={key}
              role="option"
              onMouseDown={(e) => {
                e.preventDefault();
                handlePick(feat);
              }}
              style={{
                padding: "9px 12px",
                fontSize: 13,
                color: rowText,
                cursor: "pointer",
                lineHeight: 1.35,
                fontWeight: 500,
                borderBottom: i < items.length - 1 ? (dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f1f5f9") : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `rgba(${hoverRgb}, ${dark ? 0.18 : 0.08})`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {label}
            </li>
          );
        })}
      {!loading && items.length === 0 && (
        <li style={{ padding: "10px 12px", fontSize: 12, color: mutedText, lineHeight: 1.45 }}>
          暂无结果。可换英文关键词、加城市/州（如 Baltimore MD），或稍小的区域名再试。
        </li>
      )}
    </>
  );

  return (
    <div
      ref={wrapRef}
      className={`cr-input-wrap${dark ? " cr-plan-input-dark-wrap" : " cr-input-wrap-light"}`}
      style={{ position: "relative", ...lightWrapperDefaults, ...wrapperStyle }}
    >
      {icon}
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={handleInputChange}
        onFocus={(e) => {
          onFocusProp?.(e);
          setOpen(true);
        }}
        onBlur={(e) => {
          onBlurProp?.(e);
        }}
        placeholder={placeholder}
        className={dark ? "cr-plan-input-dark" : undefined}
        style={{
          ...lightInputDefaults,
          ...inputStyle,
          border: "none",
          color: dark ? "#ffffff" : "#0a0a0a",
          background: dark ? "transparent" : undefined,
          ...(!dark
            ? {
                borderRadius: inputStyle?.borderRadius ?? 10,
                appearance: "none",
                WebkitAppearance: "none",
              }
            : {}),
        }}
      />
      {showDropdown && !dark && (
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            marginBottom: 0,
            padding: "4px 0",
            maxHeight: 300,
            overflowY: "auto",
            borderRadius: 10,
            border: `1px solid ${listBorder}`,
            background: listBg,
            boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
            zIndex: 80,
            listStyle: "none",
          }}
        >
          {suggestionList}
        </ul>
      )}
      {showDropdown &&
        dark &&
        fixedListPos &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: "fixed",
              left: fixedListPos.left,
              top: fixedListPos.top,
              width: fixedListPos.width,
              maxHeight: fixedListPos.maxH,
              margin: 0,
              padding: "4px 0",
              overflowY: "auto",
              borderRadius: 10,
              border: `1px solid ${listBorder}`,
              background: listBg,
              boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
              zIndex: 200000,
              listStyle: "none",
            }}
          >
            {suggestionList}
          </ul>,
          document.body
        )}
    </div>
  );
}

// ── WheelScrollColumn ─────────────────────────────────────────────────────────

export function WheelScrollColumn({
  label,
  options,
  value,
  onChange,
  format,
  equals,
  embedded,
  variant = "dark",
  rebound,
  accentRgb = WHEEL_LIGHT_RGB,
}) {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_H = 40;
  const VISIBLE = 216;
  const PAD = (VISIBLE - ITEM_H) / 2;
  const isEqual = equals ?? defaultWheelEquals;
  const isLight = variant === "light";

  const indexOfValue = useCallback(() => options.findIndex((o) => isEqual(o, value)), [options, value, isEqual]);

  const syncScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = indexOfValue();
    if (idx >= 0) {
      const st = PAD + idx * ITEM_H;
      el.scrollTop = st;
      setScrollTop(st);
    }
  }, [indexOfValue, PAD]);

  useEffect(() => {
    syncScroll();
  }, [value, options, syncScroll]);

  const handleScroll = (e) => {
    const el = e.target;
    const st = el.scrollTop;
    setScrollTop(st);
    const idx = Math.round((st - PAD) / ITEM_H);
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    if (rebound) {
      const { triggerLow, triggerHigh, jumpSlots } = rebound;
      if (clamped < triggerLow) {
        requestAnimationFrame(() => {
          if (!scrollRef.current) return;
          scrollRef.current.scrollTop = st + jumpSlots * ITEM_H;
        });
        return;
      }
      if (clamped > options.length - 1 - triggerHigh) {
        requestAnimationFrame(() => {
          if (!scrollRef.current) return;
          scrollRef.current.scrollTop = st - jumpSlots * ITEM_H;
        });
        return;
      }
    }
    const next = options[clamped];
    if (next !== undefined && !isEqual(next, value)) onChange(next);
  };

  const viewCenterY = scrollTop + VISIBLE / 2;

  const inner = (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: VISIBLE,
        borderRadius: embedded ? 10 : 12,
        background: embedded
          ? "transparent"
          : isLight
            ? "rgba(37,99,235,0.06)"
            : "rgba(0,0,0,0.22)",
        border: embedded ? "none" : isLight ? "1px solid rgba(37,99,235,0.2)" : "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: embedded ? 2 : 4,
          right: embedded ? 2 : 4,
          top: "50%",
          transform: "translateY(-50%)",
          height: ITEM_H,
          borderRadius: 8,
          border: isLight ? "2px solid rgba(37,99,235,0.55)" : "2px solid rgba(255,255,255,0.55)",
          boxShadow: isLight
            ? "0 0 0 1px rgba(37,99,235,0.12), inset 0 0 8px rgba(37,99,235,0.06)"
            : "0 0 0 1px rgba(0,0,0,0.25), inset 0 0 12px rgba(255,255,255,0.08)",
          zIndex: 2,
        }}
      />
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 1,
          background: isLight
            ? "linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, transparent 28%, transparent 72%, rgba(255,255,255,0.92) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          height: VISIBLE,
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          position: "relative",
          zIndex: 0,
          maskImage: "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
        }}
      >
        <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {options.map((opt, i) => {
            const rowCenterY = PAD + i * ITEM_H + ITEM_H / 2;
            const distRows = Math.abs(rowCenterY - viewCenterY) / ITEM_H;
            const opacity = 1 - Math.min(0.78, distRows * 0.26);
            const isCenter = distRows < 0.51;
            const textColor = isLight ? `rgba(${accentRgb},${opacity})` : `rgba(255,255,255,${opacity})`;
            return (
              <div
                key={opt instanceof Date ? opt.getTime() : `${i}-${String(opt)}`}
                style={{
                  height: ITEM_H,
                  scrollSnapAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isCenter ? 18 : Math.max(12, 16 - distRows * 1.2),
                  fontWeight: isCenter ? 700 : 500,
                  color: textColor,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: "color 0.08s ease, font-size 0.08s ease, opacity 0.08s ease",
                }}
              >
                {format(opt)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch" }}>{inner}</div>;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: 0 }}>
      {label ? (
        <div
          style={{
            fontSize: 11,
            marginBottom: 8,
            fontWeight: 600,
            minHeight: WHEEL_LABEL_ROW_MIN_H,
            display: "flex",
            alignItems: "center",
            color: isLight ? "rgba(37,99,235,0.75)" : undefined,
            opacity: isLight ? 1 : 0.75,
          }}
        >
          {label}
        </div>
      ) : null}
      {inner}
    </div>
  );
}

// ── TimeHourMinuteBlock ───────────────────────────────────────────────────────

export function TimeHourMinuteBlock({ hour24, minute, onHour24Change, onMinuteChange, variant = "dark", hideLabel = false, accentRgb = WHEEL_LIGHT_RGB, label = "时间" }) {
  const isLight = variant === "light";
  const [hourGi, setHourGi] = useState(() => hour24ToGlobalHourIndex(hour24));

  useEffect(() => {
    setHourGi(hour24ToGlobalHourIndex(hour24));
  }, [hour24]);

  const hourRebound = useMemo(
    () => ({
      triggerLow: 60,
      triggerHigh: 60,
      jumpSlots: HOUR_REBOUND_JUMP,
    }),
    []
  );

  const borderStyle = isLight ? "2px solid rgba(37,99,235,0.35)" : "2px solid rgba(255,255,255,0.5)";
  const bgStyle = isLight ? "rgba(37,99,235,0.04)" : "rgba(0,0,0,0.22)";

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {!hideLabel && (
        <div
          style={{
            fontSize: 11,
            marginBottom: 8,
            fontWeight: 600,
            minHeight: WHEEL_LABEL_ROW_MIN_H,
            display: "flex",
            alignItems: "center",
            color: isLight ? "rgba(37,99,235,0.75)" : undefined,
            opacity: isLight ? 1 : 0.75,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          height: 220,
          border: borderStyle,
          borderRadius: 12,
          padding: "0 8px",
          background: bgStyle,
          boxSizing: "border-box",
        }}
      >
        <WheelScrollColumn
          embedded
          variant={variant}
          rebound={hourRebound}
          options={HOUR_GLOBAL_OPTIONS}
          value={hourGi}
          onChange={(gi) => {
            setHourGi(gi);
            onHour24Change(globalHourIndexToHour24(gi));
          }}
          format={(gi) => String(globalHourIndexToHour24(gi)).padStart(2, "0")}
          equals={(a, b) => a === b}
        />
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: isLight ? "rgba(37,99,235,0.9)" : "rgba(255,255,255,0.92)",
            paddingBottom: 2,
            flexShrink: 0,
            userSelect: "none",
            alignSelf: "center",
          }}
        >
          :
        </span>
        <WheelScrollColumn
          embedded
          variant={variant}
          options={MINUTE_OPTIONS}
          value={minute}
          onChange={onMinuteChange}
          format={(m) => String(m).padStart(2, "0")}
        />
      </div>
    </div>
  );
}

// ── TripRouteMap ──────────────────────────────────────────────────────────────

export function TripRouteMap({ fromLat, fromLng, toLat, toLng, lineColor = PRIMARY, userLocation, loadingText = "加载路线中…" }) {
  const mapRef = useRef(null);
  const [path, setPath] = useState(() => [
    [fromLat, fromLng],
    [toLat, toLng],
  ]);
  const [loading, setLoading] = useState(true);
  const userNearFrom =
    userLocation != null &&
    approxKm(userLocation.lat, userLocation.lng, fromLat, fromLng) * 1000 < 50;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPath([
      [fromLat, fromLng],
      [toLat, toLng],
    ]);
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (coords?.length) {
          setPath(coords.map(([lng, lat]) => [lat, lng]));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromLat, fromLng, toLat, toLng]);

  const center = [(fromLat + toLat) / 2, (fromLng + toLng) / 2];

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || path.length < 2) return;
    const b = new maplibregl.LngLatBounds();
    path.forEach(([lat, lng]) => b.extend([lng, lat]));
    const run = () => map.fitBounds(b, { padding: [28, 28], maxZoom: 15 });
    if (map.loaded()) run();
    else map.once("load", run);
  }, [path]);

  const routeGeoJson = useMemo(
    () => ({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: path.map(([lat, lng]) => [lng, lat]),
      },
    }),
    [path]
  );

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #dce3ed" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            zIndex: 500,
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#cbd5e1",
            fontWeight: 500,
          }}
        >
          {loadingText}
        </div>
      )}
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        key={`${fromLat},${fromLng}-${toLat},${toLng}`}
        initialViewState={{ longitude: center[1], latitude: center[0], zoom: 12 }}
        mapStyle={COLLEGE_VECTOR_MAP_STYLE}
        style={{ height: 200, width: "100%" }}
        scrollZoom={false}
        onLoad={(e) => applyCollegeRoadHierarchy(e.target)}
      >
        <Source id="cr-trip-route" type="geojson" data={routeGeoJson}>
          <Layer
            id="cr-trip-route-line"
            type="line"
            paint={{ "line-color": lineColor, "line-width": 3, "line-opacity": 0.9 }}
          />
        </Source>
        {!userNearFrom && (
          <Marker longitude={fromLng} latitude={fromLat} anchor="center">
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#fff",
                border: `2px solid ${lineColor}`,
                boxSizing: "border-box",
              }}
            />
          </Marker>
        )}
        <Marker longitude={toLng} latitude={toLat} anchor="center">
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#fff",
              border: `2px solid ${lineColor}`,
              boxSizing: "border-box",
            }}
          />
        </Marker>
        {userLocation && <UserLocationMarker lat={userLocation.lat} lng={userLocation.lng} />}
      </Map>
    </div>
  );
}
