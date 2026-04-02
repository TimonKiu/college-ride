import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { COLLEGE_VECTOR_MAP_STYLE, applyCollegeRoadHierarchy } from "./collegeRoadMapStyle.js";

function UserLocationMarker({ lat, lng }) {
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
          filter: "drop-shadow(0 2px 5px rgba(0,51,153,0.4))",
        }}
      >
        <svg width="28" height="36" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d="M12 2C7.58 2 4 5.58 4 10c0 6.5 8 14 8 14s8-7.5 8-14c0-4.42-3.58-8-8-8z"
            fill="#003399"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="10" r="3" fill="#ffffff" />
        </svg>
      </div>
    </Marker>
  );
}

/** 登录确定；未接登录前默认 JHU */
const USER_SCHOOL = "Johns Hopkins University";

const JHU_LOCATIONS = [
  { id: "apl", label: "APL · Applied Physics Laboratory", short: "APL", lat: 39.1719, lng: -76.8686 },
  { id: "bloomberg-dc", label: "Bloomberg Center · Washington DC", short: "Bloomberg Center", lat: 38.89248, lng: -77.0198 },
  { id: "carey-harbor-east", label: "Carey Business School · Harbor East (Baltimore)", short: "Carey Harbor East", lat: 39.28254, lng: -76.60155 },
  { id: "east-baltimore", label: "East Baltimore Campus · School of Medicine", short: "East Baltimore", lat: 39.2992, lng: -76.5929 },
  { id: "gilman-homewood", label: "Gilman Hall · Homewood", short: "Gilman Hall", lat: 39.32913, lng: -76.6215 },
  { id: "msel", label: "MSE Library · Homewood", short: "MSE Library", lat: 39.3278, lng: -76.6215 },
  { id: "peabody", label: "Peabody Institute · Mount Vernon", short: "Peabody", lat: 39.2972, lng: -76.6158 },
  { id: "sais-nitze", label: "SAIS · Nitze Building (Massachusetts Ave)", short: "SAIS Nitze", lat: 38.9079, lng: -77.0381 },
];

const GEO_AUTO_PICK_MAX_M = 1200;

const COMMON_ROUTES_STORAGE_KEY = "cr-common-routes-v1";
const LEGACY_FIXED_TRIPS_KEY = "cr-fixed-trips-v1";
const COMMON_SCHEDULE_STORAGE_KEY = "cr-common-schedule-v1";

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function loadCommonRoutesFromStorage() {
  if (typeof localStorage === "undefined") return [];
  try {
    const tryParse = (raw) => {
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    };
    let raw = localStorage.getItem(COMMON_ROUTES_STORAGE_KEY);
    let arr = tryParse(raw);
    if (!arr || arr.length === 0) {
      const legacy = localStorage.getItem(LEGACY_FIXED_TRIPS_KEY);
      arr = tryParse(legacy);
      if (arr?.length) localStorage.setItem(COMMON_ROUTES_STORAGE_KEY, JSON.stringify(arr));
    }
    if (!arr) return [];
    return arr.filter(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.name === "string" &&
        typeof t.toLabel === "string" &&
        typeof t.toLat === "number" &&
        typeof t.toLng === "number"
    );
  } catch {
    return [];
  }
}

function persistCommonRoutes(trips) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(COMMON_ROUTES_STORAGE_KEY, JSON.stringify(trips));
  } catch {
    /* quota or private mode */
  }
}

function loadScheduleEntriesFromStorage() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMON_SCHEDULE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => {
      if (
        !e ||
        typeof e.id !== "string" ||
        typeof e.weekday !== "number" ||
        e.weekday < 0 ||
        e.weekday > 6 ||
        typeof e.minutes !== "number" ||
        typeof e.toLabel !== "string" ||
        typeof e.toLat !== "number" ||
        typeof e.toLng !== "number"
      ) {
        return false;
      }
      if (e.returnMinutes != null && typeof e.returnMinutes !== "number") return false;
      return true;
    });
  } catch {
    return [];
  }
}

function persistScheduleEntries(entries) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(COMMON_SCHEDULE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function formatScheduleMinutes(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const DC_AREA_POINTS = {
  "Foggy Bottom": [38.9009, -77.0507],
  "Capitol Hill": [38.8899, -77.0091],
  Georgetown: [38.9097, -77.0734],
  "Dupont Circle": [38.9097, -77.0434],
  Tenleytown: [38.9475, -77.0802],
  "Downtown DC": [38.9072, -77.0369],
  Shaw: [38.9106, -77.022],
  "Navy Yard": [38.8742, -77.0072],
};

const BAL_AREA_POINTS = {
  "Homewood Gate": [39.329, -76.621],
  "Charles Village": [39.325, -76.615],
  Hampden: [39.336, -76.632],
  "JHU East Baltimore": [39.299, -76.593],
  "Peabody Institute": [39.297, -76.616],
  "SAIS (DC)": [38.9089, -77.0434],
};

const PICKER_AREA_POINTS = { ...DC_AREA_POINTS, ...BAL_AREA_POINTS };

function nearestPlaceName(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const [name, coords] of Object.entries(PICKER_AREA_POINTS)) {
    const [plat, plng] = coords;
    const d = (lat - plat) ** 2 + (lng - plng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function approxKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestBuilding(lat, lng) {
  let nearest = null;
  let nearestKm = Infinity;
  for (const loc of JHU_LOCATIONS) {
    const km = approxKm(lat, lng, loc.lat, loc.lng);
    if (km < nearestKm) {
      nearestKm = km;
      nearest = loc;
    }
  }
  return { nearest, nearestKm };
}

const MOCK_RIDES = [
  {
    id: 1,
    driver: "Alex K.",
    school: "JHU",
    from: "Homewood Gate",
    to: "Charles Village",
    time: "8:30 AM",
    seats: 2,
    price: 4.5,
    detour: "5 min",
    rating: 4.9,
    ...(() => {
      const [fromLat, fromLng] = BAL_AREA_POINTS["Homewood Gate"];
      const [toLat, toLng] = BAL_AREA_POINTS["Charles Village"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 2,
    driver: "Maya S.",
    school: "JHU",
    from: "Homewood Gate",
    to: "Hampden",
    time: "9:00 AM",
    seats: 3,
    price: 3.0,
    detour: "3 min",
    rating: 4.8,
    ...(() => {
      const [fromLat, fromLng] = BAL_AREA_POINTS["Homewood Gate"];
      const [toLat, toLng] = BAL_AREA_POINTS.Hampden;
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 3,
    driver: "Jordan T.",
    school: "JHU",
    from: "Peabody Institute",
    to: "JHU East Baltimore",
    time: "9:15 AM",
    seats: 1,
    price: 5.5,
    detour: "8 min",
    rating: 4.7,
    ...(() => {
      const [fromLat, fromLng] = BAL_AREA_POINTS["Peabody Institute"];
      const [toLat, toLng] = BAL_AREA_POINTS["JHU East Baltimore"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 4,
    driver: "Priya M.",
    school: "JHU",
    from: "Dupont Circle",
    to: "SAIS (DC)",
    time: "10:00 AM",
    seats: 2,
    price: 4.0,
    detour: "6 min",
    rating: 5.0,
    ...(() => {
      const [fromLat, fromLng] = DC_AREA_POINTS["Dupont Circle"];
      const [toLat, toLng] = BAL_AREA_POINTS["SAIS (DC)"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
];

const MOCK_REQUESTS = [
  {
    id: 1,
    rider: "Sam L.",
    school: "JHU",
    from: "Homewood Gate",
    to: "Charles Village",
    time: "9:00 AM",
    earn: "+$3.80",
    detour: "4 min",
    ...(() => {
      const [fromLat, fromLng] = BAL_AREA_POINTS["Homewood Gate"];
      const [toLat, toLng] = BAL_AREA_POINTS["Charles Village"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 2,
    rider: "Lena W.",
    school: "JHU",
    from: "Homewood Gate",
    to: "Hampden",
    time: "8:45 AM",
    earn: "+$5.20",
    detour: "7 min",
    ...(() => {
      const [fromLat, fromLng] = BAL_AREA_POINTS["Homewood Gate"];
      const [toLat, toLng] = BAL_AREA_POINTS.Hampden;
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
];

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

function Icon({ children, size = 20, title, stroke = 1.75 }) {
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

const Icons = {
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
  chevronDown: (
    <Icon>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  /** 出发地「定位到当前位置」小按钮（十字准星） */
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
};

const RIDER_PRIMARY = "#003399";
const RIDER_RGB = "0, 51, 153";
/** 司机模式主题 */
const DRIVER_PRIMARY = "#0a0a0a";
const DRIVER_RGB = "10, 10, 10";
const PRIMARY = RIDER_PRIMARY;

const Avatar = ({ name, accent = PRIMARY }) => {
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

const StarRating = ({ rating, accent = PRIMARY }) => (
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

const Tag = ({ text, accent = PRIMARY }) => {
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

function MapPickerPanel({ onPick, onClose, lineColor, center, userLocation }) {
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
          onPick(nearestPlaceName(lat, lng));
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

/** Photon（OSM）地点展示为一行可读地址 */
function formatPhotonFeature(f) {
  const p = f.properties || {};
  const parts = [];
  if (p.name) parts.push(p.name);
  if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`);
  else if (p.street) parts.push(p.street);
  const city = p.city || p.town || p.village || p.district;
  if (city) parts.push(city);
  if (p.state) parts.push(p.state);
  if (p.country) parts.push(p.country);
  if (parts.length) return [...new Set(parts)].join(", ");
  const c = f.geometry?.coordinates;
  if (c?.length >= 2) return `${c[1].toFixed(4)}, ${c[0].toFixed(4)}`;
  return "";
}

/**
 * 类似地图 App 的地址搜索：输入即请求 Photon 建议（无需 API Key）。
 * 若需与 Google 完全一致，可后续换为 Places API + 后端代理。
 */
function PlaceSuggestField({
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
}) {
  const dark = variant === "dark";
  const wrapRef = useRef(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const q = value.trim();
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

    timerRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=zh`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) {
          if (!ac.signal.aborted) setItems([]);
          return;
        }
        const data = await res.json();
        if (!ac.signal.aborted) setItems(Array.isArray(data.features) ? data.features : []);
      } catch (e) {
        if (e.name !== "AbortError" && !ac.signal.aborted) setItems([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 380);

    return () => {
      clearTimeout(timerRef.current);
      ac.abort();
    };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const down = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

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

  const q = value.trim();
  const showDropdown = open && q.length >= 2;
  const listBg = dark ? "rgba(22,22,28,0.98)" : "#fff";
  const listBorder = dark ? "rgba(255,255,255,0.18)" : borderColor;
  const rowText = dark ? "#f1f5f9" : "#0a0a0a";
  const mutedText = dark ? "rgba(148,163,184,0.95)" : "#64748b";

  return (
    <div
      ref={wrapRef}
      className={`cr-input-wrap${dark ? " cr-plan-input-dark-wrap" : ""}`}
      style={{ position: "relative", ...wrapperStyle }}
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
          ...inputStyle,
          border: "none",
          color: dark ? "#ffffff" : "#0a0a0a",
          background: dark ? "transparent" : undefined,
        }}
      />
      {showDropdown && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            marginBottom: 0,
            padding: "4px 0",
            maxHeight: 220,
            overflowY: "auto",
            borderRadius: 10,
            border: `1px solid ${listBorder}`,
            background: listBg,
            boxShadow: dark ? "0 12px 32px rgba(0,0,0,0.45)" : "0 10px 28px rgba(0,0,0,0.12)",
            zIndex: 80,
            listStyle: "none",
          }}
        >
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
              未找到匹配地点，可继续手动输入
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

const WEEKDAYS_CN = ["日", "一", "二", "三", "四", "五", "六"];

function formatCnDateLabel(d) {
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS_CN[d.getDay()]}`;
}

function sameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildDateOptions(daysAhead = 60) {
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

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
/** 无限小时：重复 0–23 */
const HOUR_GLOBAL_SLOT_COUNT = 2400;
const HOUR_GLOBAL_OPTIONS = Array.from({ length: HOUR_GLOBAL_SLOT_COUNT }, (_, i) => i);
const HOUR_REBOUND_JUMP = 1200;

function defaultWheelEquals(a, b) {
  return a === b;
}

function formatScheduleChipLabel(date, h24, min) {
  return `${formatCnDateLabel(date)} ${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function globalHourIndexToHour24(gi) {
  return ((gi % 24) + 24) % 24;
}

/** 当前小时(0–23) → 居中附近的无限槽位 */
function hour24ToGlobalHourIndex(h24) {
  const h = ((h24 % 24) + 24) % 24;
  const mid = Math.floor(HOUR_GLOBAL_SLOT_COUNT / 2);
  let gi = mid - (mid % 24) + h;
  if (gi >= HOUR_GLOBAL_SLOT_COUNT) gi -= 24;
  if (gi < 0) gi += 24;
  return gi;
}

/** 浅色轮盘：白底区域用主题蓝字（#003399） */
const WHEEL_LIGHT_RGB = "0, 51, 153";
const WHEEL_LABEL_ROW_MIN_H = 28;

function WheelScrollColumn({
  label,
  options,
  value,
  onChange,
  format,
  equals,
  embedded,
  variant = "dark",
  rebound,
  itemHeight = 40,
  viewportHeight = 216,
}) {
  const scrollRef = useRef(null);
  /** 与视口滚动同步，用于按「中间框」位置计算各行与中心线的距离（非系统时间） */
  const [scrollTop, setScrollTop] = useState(0);
  const ITEM_H = itemHeight;
  const VISIBLE = viewportHeight;
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
  }, [indexOfValue, PAD, ITEM_H]);

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

  /** 视口中心在内容坐标中的位置；各行中心与它的距离 → 淡化程度 */
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
            ? "rgba(0,51,153,0.06)"
            : "rgba(0,0,0,0.22)",
        border: embedded ? "none" : isLight ? "1px solid rgba(0,51,153,0.2)" : "1px solid rgba(255,255,255,0.12)",
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
          border: isLight ? "2px solid rgba(0,51,153,0.55)" : "2px solid rgba(255,255,255,0.55)",
          boxShadow: isLight
            ? "0 0 0 1px rgba(0,51,153,0.12), inset 0 0 8px rgba(0,51,153,0.06)"
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
            const textColor = isLight ? `rgba(${WHEEL_LIGHT_RGB},${opacity})` : `rgba(255,255,255,${opacity})`;
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
            color: isLight ? "rgba(0,51,153,0.75)" : undefined,
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

/** 时间：24 小时 + : + 分钟；与日期列同高、选中框对齐 */
function TimeHourMinuteBlock({
  hour24,
  minute,
  onHour24Change,
  onMinuteChange,
  variant = "dark",
  heading = "时间",
  compact = false,
}) {
  const isLight = variant === "light";
  const [hourGi, setHourGi] = useState(() => hour24ToGlobalHourIndex(hour24));
  const itemH = compact ? 32 : 40;
  const viewH = compact ? 144 : 216;

  const hourRebound = useMemo(
    () => ({
      triggerLow: 60,
      triggerHigh: 60,
      jumpSlots: HOUR_REBOUND_JUMP,
    }),
    []
  );

  const borderStyle = isLight ? "2px solid rgba(0,51,153,0.35)" : "2px solid rgba(255,255,255,0.5)";
  const bgStyle = isLight ? "rgba(0,51,153,0.04)" : "rgba(0,0,0,0.22)";

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {heading ? (
        <div
          style={{
            fontSize: 11,
            marginBottom: 8,
            fontWeight: 600,
            minHeight: WHEEL_LABEL_ROW_MIN_H,
            display: "flex",
            alignItems: "center",
            color: isLight ? "rgba(0,51,153,0.75)" : "rgba(255,255,255,0.78)",
            opacity: isLight ? 1 : 1,
          }}
        >
          {heading}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          height: viewH,
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
          itemHeight={itemH}
          viewportHeight={viewH}
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
            fontSize: compact ? 18 : 22,
            fontWeight: 700,
            color: isLight ? "rgba(0,51,153,0.9)" : "rgba(255,255,255,0.92)",
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
          itemHeight={itemH}
          viewportHeight={viewH}
          options={MINUTE_OPTIONS}
          value={minute}
          onChange={onMinuteChange}
          format={(m) => String(m).padStart(2, "0")}
        />
      </div>
    </div>
  );
}

function TripRouteMap({ fromLat, fromLng, toLat, toLng, lineColor = PRIMARY, userLocation }) {
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
          加载路线中…
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

export default function CollegeRide() {
  const [tab, setTab] = useState("find");
  const [selectedRide, setSelectedRide] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [jhuLocationId, setJhuLocationId] = useState("gilman-homewood");
  const userLockedCampus = useRef(false);
  /** 规划行程：「定位 + 最近教学楼」组合（下拉按距离排序） */
  const planTripOriginNearestRef = useRef(null);
  const [planTripCampusOpen, setPlanTripCampusOpen] = useState(false);
  /** 出发地是否由「教学楼列表 / 最近教学楼」设定（与手动地址区分） */
  const [originPickedFromBuilding, setOriginPickedFromBuilding] = useState(false);
  const [role, setRole] = useState("rider");
  /** 仅用于主内容区切换动画方向；首次进入为 null 不播放 */
  const [roleSlideTarget, setRoleSlideTarget] = useState(null);
  const themePrimary = role === "driver" ? DRIVER_PRIMARY : RIDER_PRIMARY;
  const themePrimaryRgb = role === "driver" ? DRIVER_RGB : RIDER_RGB;
  const [postSeats, setPostSeats] = useState(2);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [riderFrom, setRiderFrom] = useState("");
  const [riderTo, setRiderTo] = useState("");
  /** 从 Photon 选中时写入，供后续算路与匹配使用 */
  const [riderFromCoords, setRiderFromCoords] = useState(null);
  const [riderToCoords, setRiderToCoords] = useState(null);
  /** 出发地是否为设备定位「当前位置」 */
  const [fromUseCurrentLocation, setFromUseCurrentLocation] = useState(true);
  const [currentLocationCoords, setCurrentLocationCoords] = useState(null);
  /** Uber 式全屏规划层 */
  const [planTripOpen, setPlanTripOpen] = useState(false);
  const [planTripFocus, setPlanTripFocus] = useState("to");
  const [routePreviewReady, setRoutePreviewReady] = useState(false);
  const [publishFrom, setPublishFrom] = useState("");
  const [publishTo, setPublishTo] = useState("");
  const [mapPicker, setMapPicker] = useState(null);
  /** 规划层内「立即接载」：下拉菜单与预约时间 */
  const [pickupTimeMenuOpen, setPickupTimeMenuOpen] = useState(false);
  const pickupMenuCloseTimerRef = useRef(null);
  const PICKUP_MENU_ANIM_MS = 200;
  const [pickupTimeMenuExpanded, setPickupTimeMenuExpanded] = useState(false);
  /** 下拉内单选高亮：立即接载 | 规划行程 */
  const [pickupMenuHighlight, setPickupMenuHighlight] = useState("immediate");
  const [pickupTimeMode, setPickupTimeMode] = useState("immediate");
  const [scheduledPickupDate, setScheduledPickupDate] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const [scheduledHour, setScheduledHour] = useState(() => new Date().getHours());
  const [scheduledMinute, setScheduledMinute] = useState(() => new Date().getMinutes());
  /** 仅用于重置预约时间轮（无限小时槽位与父状态对齐） */
  const [pickupWheelResetKey, setPickupWheelResetKey] = useState(0);
  /** 规划层：返程（与出发时间独立） */
  const [planTripReturnEnabled, setPlanTripReturnEnabled] = useState(false);
  const [returnScheduledDate, setReturnScheduledDate] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const [returnHour, setReturnHour] = useState(18);
  const [returnMinute, setReturnMinute] = useState(0);
  const [returnWheelKey, setReturnWheelKey] = useState(0);
  const planPickupTimeBtnRef = useRef(null);
  const [pickupPopoverPos, setPickupPopoverPos] = useState({ x: 0, y: 0 });
  /** 乘客常用路线：本地持久化 */
  const [commonRoutes, setCommonRoutes] = useState(() => loadCommonRoutesFromStorage());
  const [commonRouteSaveName, setCommonRouteSaveName] = useState("");
  const [showCommonRouteSaveForm, setShowCommonRouteSaveForm] = useState(false);
  const [scheduleEntries, setScheduleEntries] = useState(() => loadScheduleEntriesFromStorage());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalWeekday, setScheduleModalWeekday] = useState(0);
  const [scheduleModalHour, setScheduleModalHour] = useState(8);
  const [scheduleModalMinute, setScheduleModalMinute] = useState(0);
  const [scheduleModalWheelKey, setScheduleModalWheelKey] = useState(0);
  const [scheduleModalReturnEnabled, setScheduleModalReturnEnabled] = useState(false);
  const [scheduleModalReturnHour, setScheduleModalReturnHour] = useState(18);
  const [scheduleModalReturnMinute, setScheduleModalReturnMinute] = useState(0);
  const [scheduleModalReturnWheelKey, setScheduleModalReturnWheelKey] = useState(0);
  const [scheduleModalFromUseCL, setScheduleModalFromUseCL] = useState(true);
  const [scheduleModalFrom, setScheduleModalFrom] = useState("");
  const [scheduleModalTo, setScheduleModalTo] = useState("");
  const [scheduleModalFromCoords, setScheduleModalFromCoords] = useState(null);
  const [scheduleModalToCoords, setScheduleModalToCoords] = useState(null);

  const dateOptionsForWheel = useMemo(() => buildDateOptions(60), []);

  const resetScheduleToNow = useCallback(() => {
    const n = new Date();
    setScheduledPickupDate(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
    setScheduledHour(n.getHours());
    setScheduledMinute(n.getMinutes());
    setPickupWheelResetKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (role === "rider" && tab === "post") setTab("find");
  }, [role, tab]);

  useEffect(() => {
    if (role === "driver" && tab === "saved") setTab("find");
  }, [role, tab]);

  useEffect(() => {
    persistCommonRoutes(commonRoutes);
  }, [commonRoutes]);

  useEffect(() => {
    persistScheduleEntries(scheduleEntries);
  }, [scheduleEntries]);

  useEffect(() => {
    if (planTripOpen) setRoutePreviewReady(false);
  }, [planTripOpen]);

  useEffect(() => {
    if (!planTripOpen) setMapPicker(null);
  }, [planTripOpen]);

  useEffect(() => {
    if (!planTripOpen) {
      setPickupTimeMenuOpen(false);
      setPickupTimeMenuExpanded(false);
      setPickupTimeMode("immediate");
      setPlanTripCampusOpen(false);
      setOriginPickedFromBuilding(false);
      setPlanTripReturnEnabled(false);
    }
  }, [planTripOpen]);

  useEffect(() => {
    if (pickupTimeMenuOpen) {
      setPickupMenuHighlight(pickupTimeMode === "scheduled" ? "scheduled" : "immediate");
    }
  }, [pickupTimeMenuOpen, pickupTimeMode]);

  useLayoutEffect(() => {
    if (!pickupTimeMenuOpen) return;
    const update = () => {
      const el = planPickupTimeBtnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPickupPopoverPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    };
    update();
    const t = window.setTimeout(update, 0);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [pickupTimeMenuOpen]);

  const closePickupMenuAnimated = useCallback(() => {
    if (pickupMenuCloseTimerRef.current) clearTimeout(pickupMenuCloseTimerRef.current);
    pickupMenuCloseTimerRef.current = setTimeout(() => {
      setPickupTimeMenuOpen(false);
      pickupMenuCloseTimerRef.current = null;
    }, PICKUP_MENU_ANIM_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (pickupMenuCloseTimerRef.current) clearTimeout(pickupMenuCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!planTripCampusOpen) return;
    const onDown = (e) => {
      if (planTripOriginNearestRef.current && !planTripOriginNearestRef.current.contains(e.target)) {
        setPlanTripCampusOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [planTripCampusOpen]);

  const pickOriginBuilding = useCallback((loc) => {
    userLockedCampus.current = true;
    setJhuLocationId(loc.id);
    setFromUseCurrentLocation(false);
    setRiderFrom(loc.label);
    setRiderFromCoords({ lat: loc.lat, lng: loc.lng });
    setOriginPickedFromBuilding(true);
    setPlanTripCampusOpen(false);
  }, []);

  const snapOriginToNearestBuilding = useCallback(() => {
    userLockedCampus.current = true;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { nearest } = getNearestBuilding(pos.coords.latitude, pos.coords.longitude);
        if (!nearest) return;
        setCurrentLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setJhuLocationId(nearest.id);
        setFromUseCurrentLocation(false);
        setRiderFrom(nearest.label);
        setRiderFromCoords({ lat: nearest.lat, lng: nearest.lng });
        setOriginPickedFromBuilding(true);
        setPlanTripCampusOpen(false);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 18000 }
    );
  }, []);

  const refreshLocationFromGeo = () => {
    userLockedCampus.current = false;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { nearest, nearestKm } = getNearestBuilding(pos.coords.latitude, pos.coords.longitude);
        if (!nearest) return;
        if (nearestKm * 1000 <= GEO_AUTO_PICK_MAX_M) {
          setJhuLocationId(nearest.id);
          setPlanTripCampusOpen(false);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 18000 }
    );
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (userLockedCampus.current) return;
        const { nearest, nearestKm } = getNearestBuilding(pos.coords.latitude, pos.coords.longitude);
        if (!nearest) return;
        if (nearestKm * 1000 <= GEO_AUTO_PICK_MAX_M) {
          setJhuLocationId(nearest.id);
          setPlanTripCampusOpen(false);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 18000, maximumAge: 120000 }
    );
  }, []);

  const activeCampus = useMemo(() => JHU_LOCATIONS.find((l) => l.id === jhuLocationId) ?? JHU_LOCATIONS[0], [jhuLocationId]);

  /** 相对当前参考位置（设备定位或默认校区）的教学楼，近 → 远 */
  const originCampusesByDistance = useMemo(() => {
    const ref = currentLocationCoords ?? { lat: activeCampus.lat, lng: activeCampus.lng };
    return [...JHU_LOCATIONS]
      .map((loc) => ({
        loc,
        km: approxKm(ref.lat, ref.lng, loc.lat, loc.lng),
      }))
      .sort((a, b) => a.km - b.km);
  }, [currentLocationCoords, activeCampus.lat, activeCampus.lng]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCurrentLocationCoords({ lat: activeCampus.lat, lng: activeCampus.lng });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCurrentLocationCoords({ lat: activeCampus.lat, lng: activeCampus.lng }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 }
    );
  }, [activeCampus.lat, activeCampus.lng]);

  const effectiveFromLatLng = useMemo(() => {
    if (fromUseCurrentLocation) {
      return currentLocationCoords ?? { lat: activeCampus.lat, lng: activeCampus.lng };
    }
    return riderFromCoords;
  }, [fromUseCurrentLocation, currentLocationCoords, riderFromCoords, activeCampus.lat, activeCampus.lng]);

  const planModalMapCenter = useMemo(
    () => effectiveFromLatLng ?? { lat: activeCampus.lat, lng: activeCampus.lng },
    [effectiveFromLatLng, activeCampus.lat, activeCampus.lng]
  );

  const canConfirmPlanRoute = useMemo(
    () => Boolean(riderToCoords && effectiveFromLatLng && (fromUseCurrentLocation ? true : riderFromCoords)),
    [riderToCoords, effectiveFromLatLng, fromUseCurrentLocation, riderFromCoords]
  );

  /** 出发时间按钮展示；含可选返程 */
  const planTripTimeChipLabel = useMemo(() => {
    if (pickupTimeMode === "immediate") return "立即接载";
    let s = formatScheduleChipLabel(scheduledPickupDate, scheduledHour, scheduledMinute);
    if (planTripReturnEnabled) {
      s += ` · 返程 ${formatScheduleChipLabel(returnScheduledDate, returnHour, returnMinute)}`;
    }
    return s;
  }, [
    pickupTimeMode,
    scheduledPickupDate,
    scheduledHour,
    scheduledMinute,
    planTripReturnEnabled,
    returnScheduledDate,
    returnHour,
    returnMinute,
  ]);

  const snapOriginToCurrentLocation = useCallback(() => {
    setOriginPickedFromBuilding(false);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCurrentLocationCoords({ lat: activeCampus.lat, lng: activeCampus.lng });
      setFromUseCurrentLocation(true);
      setRiderFrom("");
      setRiderFromCoords(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFromUseCurrentLocation(true);
        setRiderFrom("");
        setRiderFromCoords(null);
      },
      () => {
        setCurrentLocationCoords({ lat: activeCampus.lat, lng: activeCampus.lng });
        setFromUseCurrentLocation(true);
        setRiderFrom("");
        setRiderFromCoords(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, [activeCampus.lat, activeCampus.lng]);

  const handleRiderFromChange = (v) => {
    setRiderFrom(v);
    setOriginPickedFromBuilding(false);
    if (!v.trim()) setRiderFromCoords(null);
  };

  const handleRiderToChange = (v) => {
    setRiderTo(v);
    if (!v.trim()) setRiderToCoords(null);
  };

  const swapPlanTripEndpoints = useCallback(() => {
    const fromCoordsResolved = fromUseCurrentLocation
      ? currentLocationCoords ?? { lat: activeCampus.lat, lng: activeCampus.lng }
      : riderFromCoords;
    const fromLabel = fromUseCurrentLocation ? "" : riderFrom;
    const fromWasCL = fromUseCurrentLocation;

    const toLabel = riderTo;
    const toCoords = riderToCoords;

    if (toCoords) {
      setFromUseCurrentLocation(false);
      setRiderFrom(toLabel);
      setRiderFromCoords(toCoords);
    } else {
      setFromUseCurrentLocation(false);
      setRiderFrom(toLabel);
      setRiderFromCoords(null);
    }
    setOriginPickedFromBuilding(false);

    if (fromWasCL && fromCoordsResolved) {
      setRiderTo("");
      setRiderToCoords(fromCoordsResolved);
    } else if (!fromWasCL && fromCoordsResolved) {
      setRiderTo(fromLabel);
      setRiderToCoords(fromCoordsResolved);
    } else if (!fromWasCL && fromLabel.trim()) {
      setRiderTo(fromLabel);
      setRiderToCoords(null);
    } else {
      setRiderTo("");
      setRiderToCoords(null);
    }
  }, [
    fromUseCurrentLocation,
    currentLocationCoords,
    riderFromCoords,
    riderFrom,
    riderTo,
    riderToCoords,
    activeCampus.lat,
    activeCampus.lng,
  ]);

  const applyCommonRoute = useCallback(
    (trip) => {
      if (!trip || typeof trip.toLat !== "number" || typeof trip.toLng !== "number") return;
      if (trip.fromUseCurrentLocation) {
        userLockedCampus.current = false;
        setFromUseCurrentLocation(true);
        setRiderFrom("");
        setRiderFromCoords(null);
        setOriginPickedFromBuilding(false);
      } else {
        if (trip.originJhuId) {
          userLockedCampus.current = true;
          setJhuLocationId(trip.originJhuId);
        } else {
          userLockedCampus.current = false;
        }
        setFromUseCurrentLocation(false);
        setRiderFrom(trip.fromLabel || "");
        if (trip.fromLat != null && trip.fromLng != null) {
          setRiderFromCoords({ lat: trip.fromLat, lng: trip.fromLng });
        } else {
          setRiderFromCoords(null);
        }
        setOriginPickedFromBuilding(!!trip.originPickedFromBuilding);
      }
      setRiderTo(trip.toLabel);
      setRiderToCoords({ lat: trip.toLat, lng: trip.toLng });
      setRoutePreviewReady(false);
      setPlanTripFocus("to");
      setTab("find");
      setPlanTripOpen(true);
    },
    [setTab]
  );

  const commitSaveCurrentAsCommonRoute = useCallback(() => {
    if (!canConfirmPlanRoute || !effectiveFromLatLng || !riderToCoords) return;
    const name = commonRouteSaveName.trim() || "常用路线";
    const entry = {
      id: `route-${Date.now()}`,
      name,
      fromLabel: fromUseCurrentLocation ? "" : riderFrom,
      toLabel: riderTo,
      fromUseCurrentLocation: !!fromUseCurrentLocation,
      fromLat: fromUseCurrentLocation ? null : riderFromCoords?.lat ?? null,
      fromLng: fromUseCurrentLocation ? null : riderFromCoords?.lng ?? null,
      toLat: riderToCoords.lat,
      toLng: riderToCoords.lng,
      originJhuId: jhuLocationId,
      originPickedFromBuilding: !!originPickedFromBuilding,
    };
    setCommonRoutes((prev) => [entry, ...prev]);
    setShowCommonRouteSaveForm(false);
    setCommonRouteSaveName("");
  }, [
    canConfirmPlanRoute,
    effectiveFromLatLng,
    riderToCoords,
    commonRouteSaveName,
    fromUseCurrentLocation,
    riderFrom,
    riderTo,
    riderFromCoords,
    jhuLocationId,
    originPickedFromBuilding,
  ]);

  const deleteCommonRoute = useCallback((id) => {
    setCommonRoutes((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openScheduleModal = useCallback(() => {
    setScheduleModalWeekday(0);
    setScheduleModalHour(8);
    setScheduleModalMinute(0);
    setScheduleModalWheelKey((k) => k + 1);
    setScheduleModalReturnEnabled(false);
    setScheduleModalReturnHour(18);
    setScheduleModalReturnMinute(0);
    setScheduleModalReturnWheelKey((k) => k + 1);
    setScheduleModalFromUseCL(true);
    setScheduleModalFrom("");
    setScheduleModalTo("");
    setScheduleModalFromCoords(null);
    setScheduleModalToCoords(null);
    setScheduleModalOpen(true);
  }, []);

  const commitScheduleEntry = useCallback(() => {
    if (!scheduleModalToCoords) return;
    if (!scheduleModalFromUseCL) {
      if (!scheduleModalFrom.trim() || !scheduleModalFromCoords) return;
    }
    const minutes = Math.min(24 * 60 - 1, Math.max(0, scheduleModalHour * 60 + scheduleModalMinute));
    const returnMinutes = scheduleModalReturnEnabled
      ? Math.min(24 * 60 - 1, Math.max(0, scheduleModalReturnHour * 60 + scheduleModalReturnMinute))
      : null;
    const entry = {
      id: `sch-${Date.now()}`,
      weekday: scheduleModalWeekday,
      minutes,
      returnMinutes,
      fromLabel: scheduleModalFromUseCL ? "" : scheduleModalFrom,
      toLabel: scheduleModalTo.trim() || "目的地",
      fromUseCurrentLocation: !!scheduleModalFromUseCL,
      fromLat: scheduleModalFromUseCL ? null : scheduleModalFromCoords?.lat ?? null,
      fromLng: scheduleModalFromUseCL ? null : scheduleModalFromCoords?.lng ?? null,
      toLat: scheduleModalToCoords.lat,
      toLng: scheduleModalToCoords.lng,
      originJhuId: null,
      originPickedFromBuilding: false,
    };
    setScheduleEntries((prev) => [entry, ...prev]);
    setScheduleModalOpen(false);
  }, [
    scheduleModalHour,
    scheduleModalMinute,
    scheduleModalWeekday,
    scheduleModalReturnEnabled,
    scheduleModalReturnHour,
    scheduleModalReturnMinute,
    scheduleModalFromUseCL,
    scheduleModalFrom,
    scheduleModalTo,
    scheduleModalFromCoords,
    scheduleModalToCoords,
  ]);

  const deleteScheduleEntry = useCallback((id) => {
    setScheduleEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const onOriginInputFocus = () => {
    setOriginPickedFromBuilding(false);
    if (fromUseCurrentLocation) {
      setFromUseCurrentLocation(false);
      setRiderFrom("");
      setRiderFromCoords(null);
    }
  };

  const onOriginInputBlur = () => {
    if (!riderFrom.trim()) {
      setFromUseCurrentLocation(true);
      setRiderFrom("");
      setRiderFromCoords(null);
    }
  };

  const matchedRides = useMemo(() => {
    const MAX_KM = 40;
    const scored = MOCK_RIDES.map((r) => ({
      ...r,
      _km: approxKm(activeCampus.lat, activeCampus.lng, r.fromLat, r.fromLng),
    }));
    scored.sort((a, b) => a._km - b._km);
    const filtered = scored.filter((r) => r._km <= MAX_KM);
    return filtered.length ? filtered : scored;
  }, [activeCampus]);

  const matchedRequests = useMemo(() => {
    const MAX_KM = 40;
    const scored = MOCK_REQUESTS.map((r) => ({
      ...r,
      _km: approxKm(activeCampus.lat, activeCampus.lng, r.fromLat, r.fromLng),
    }));
    scored.sort((a, b) => a._km - b._km);
    const filtered = scored.filter((r) => r._km <= MAX_KM);
    return filtered.length ? filtered : scored;
  }, [activeCampus]);

  const mapPickerCenter = [activeCampus.lat, activeCampus.lng];

  const colors = {
    navy: themePrimary,
    navyMid: role === "driver" ? "#2a2a2a" : "#002266",
    white: "#ffffff",
    page: "#f4f6f9",
    card: "#ffffff",
    text: "#0a0a0a",
    muted: "#64748b",
    border: "#dce3ed",
    navBg: "rgba(255,255,255,0.96)",
    tint: `rgba(${themePrimaryRgb}, 0.06)`,
  };

  const styles = {
    app: {
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: colors.page,
      minHeight: "100vh",
      maxWidth: 430,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "visible",
      color: colors.text,
      boxShadow: `0 0 0 1px rgba(${themePrimaryRgb}, 0.06)`,
    },
    header: {
      position: "relative",
      padding: "22px 20px 20px",
      color: colors.white,
      overflow: "visible",
      background: colors.navy,
      transition: "background-color 0.35s ease",
    },
    logo: {
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: "-0.03em",
      color: colors.white,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    logoMark: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "rgba(255,255,255,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: colors.white,
    },
    content: {
      flex: 1,
      overflowY: "auto",
      padding: "18px 16px 96px",
      background: colors.page,
    },
    card: {
      background: colors.card,
      borderRadius: 12,
      padding: "18px",
      marginBottom: 12,
      border: `1px solid ${colors.border}`,
    },
    rideCard: {
      background: colors.card,
      borderRadius: 12,
      padding: "18px",
      marginBottom: 12,
      border: `1px solid ${colors.border}`,
      cursor: "pointer",
    },
    btn: {
      background: colors.navy,
      color: colors.white,
      border: "none",
      borderRadius: 10,
      padding: "14px 22px",
      fontWeight: 600,
      fontSize: 15,
      fontFamily: "'Inter', system-ui, sans-serif",
      cursor: "pointer",
      width: "100%",
    },
    btnOutline: {
      background: colors.white,
      color: colors.navy,
      border: `1.5px solid ${colors.navy}`,
      borderRadius: 10,
      padding: "12px 22px",
      fontWeight: 600,
      fontSize: 14,
      fontFamily: "'Inter', system-ui, sans-serif",
      cursor: "pointer",
      width: "100%",
    },
    navBar: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 430,
      background: colors.navBg,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderTop: `1px solid ${colors.border}`,
      display: "flex",
      justifyContent: "space-around",
      padding: "8px 8px max(14px, env(safe-area-inset-bottom))",
      zIndex: 100,
    },
    navItem: (active) => ({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      cursor: "pointer",
      color: active ? colors.navy : colors.muted,
      fontSize: 10,
      fontWeight: active ? 600 : 500,
      padding: "6px 12px",
      borderRadius: 8,
      background: active ? colors.tint : "transparent",
    }),
    sectionTitle: {
      fontSize: 11,
      fontWeight: 600,
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin: "20px 0 8px",
    },
    sectionHeadline: {
      fontSize: 18,
      fontWeight: 700,
      color: colors.text,
      margin: "0 0 14px",
      letterSpacing: "-0.02em",
    },
    routeDot: (start) => ({
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: start ? colors.navy : colors.navyMid,
      flexShrink: 0,
      border: `2px solid ${colors.white}`,
      boxShadow: `0 0 0 1px ${colors.border}`,
    }),
    input: {
      width: "100%",
      padding: "12px 12px 12px 40px",
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      fontSize: 14,
      fontFamily: "'Inter', system-ui, sans-serif",
      background: colors.white,
      color: colors.text,
      outline: "none",
      boxSizing: "border-box",
      marginBottom: 10,
    },
    label: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: colors.muted,
      marginBottom: 6,
    },
  };

  const NavItem = ({ icon, label, id }) => (
    <div style={styles.navItem(tab === id)} onClick={() => setTab(id)} role="button" tabIndex={0}>
      <span style={{ display: "flex", color: "inherit", height: 22, alignItems: "center" }}>{icon}</span>
      <span>{label}</span>
    </div>
  );

  if (confirmed && selectedRide) {
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
          <h2 style={{ color: colors.white, fontSize: 24, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>预约已确认</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.65, marginBottom: 28, maxWidth: 300 }}>
            {selectedRide.driver} 将于 <strong style={{ color: colors.white }}>{selectedRide.time}</strong> 接你
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
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 6, fontWeight: 500 }}>预计费用</div>
            <div style={{ color: colors.white, fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" }}>${selectedRide.price.toFixed(2)}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 6 }}>相较网约车预估更低</div>
          </div>
          <button
            style={styles.btn}
            onClick={() => {
              setConfirmed(false);
              setSelectedRide(null);
              setTab("find");
            }}
          >
            返回主页
          </button>
        </div>
      </div>
    );
  }

  if (selectedRide && !confirmed) {
    return (
      <div style={styles.app}>
        <link href={FONT_LINK} rel="stylesheet" />
        <div style={{ ...styles.header, padding: "16px 16px 14px" }}>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                setSelectedRide(null);
                setSelectedRequest(null);
              }}
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
            <span style={{ fontWeight: 600, fontSize: 17 }}>行程详情</span>
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
              <Tag text="已验证" accent={themePrimary} />
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>出发地</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{selectedRide.from}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>目的地</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{selectedRide.to}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>路线地图</div>
            <TripRouteMap
              fromLat={selectedRide.fromLat}
              fromLng={selectedRide.fromLng}
              toLat={selectedRide.toLat}
              toLng={selectedRide.toLng}
              lineColor={themePrimary}
              userLocation={currentLocationCoords}
            />
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>路线基于 OpenStreetMap / OSRM 道路网络规划，仅供参考。</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "出发时间", value: selectedRide.time, icon: Icons.clock },
              { label: "剩余座位", value: `${selectedRide.seats} 个`, icon: Icons.users },
              { label: "绕路时间", value: selectedRide.detour, icon: Icons.mapPath },
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
                <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4, fontWeight: 500 }}>应付金额</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: colors.navy, letterSpacing: "-0.03em" }}>${selectedRide.price.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>含平台服务费 10%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>参考价（网约车）</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: colors.muted, textDecoration: "line-through" }}>$8.50</div>
                <div style={{ marginTop: 8 }}>
                  <Tag text="省 47%" accent={themePrimary} />
                </div>
              </div>
            </div>
          </div>

          <button style={{ ...styles.btn, marginTop: 8 }} onClick={() => setConfirmed(true)}>
            确认拼车
          </button>
          <button
            style={{ ...styles.btnOutline, marginTop: 12 }}
            onClick={() => {
              setSelectedRide(null);
              setSelectedRequest(null);
            }}
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  if (selectedRequest) {
    const req = selectedRequest;
    return (
      <div style={styles.app}>
        <link href={FONT_LINK} rel="stylesheet" />
        <div style={{ ...styles.header, padding: "16px 16px 14px" }}>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
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
            <span style={{ fontWeight: 600, fontSize: 17 }}>乘车请求详情</span>
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
              <Tag text="待接单" accent={themePrimary} />
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>出发地</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{req.from}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>目的地</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{req.to}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>路线地图</div>
            <TripRouteMap
              fromLat={req.fromLat}
              fromLng={req.fromLng}
              toLat={req.toLat}
              toLng={req.toLng}
              lineColor={themePrimary}
              userLocation={currentLocationCoords}
            />
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 1.45 }}>路线基于 OpenStreetMap / OSRM 道路网络规划，仅供参考。</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "希望出发", value: req.time, icon: Icons.clock },
              { label: "绕路时间", value: req.detour, icon: Icons.mapPath },
              { label: "预计收益", value: req.earn, icon: Icons.car },
            ].map((item) => (
              <div key={item.label} style={{ ...styles.card, textAlign: "center", marginBottom: 0, padding: "14px 8px" }}>
                <div style={{ display: "flex", justifyContent: "center", color: colors.navy, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{item.value}</div>
                <div style={{ fontSize: 10, color: colors.muted, marginTop: 4, fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.card, background: colors.tint, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4, fontWeight: 500 }}>本单预计收益</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: colors.navy, letterSpacing: "-0.03em" }}>{req.earn}</div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>接单后以实际绕路为准</div>
          </div>

          <button type="button" style={{ ...styles.btn, marginTop: 8 }} onClick={() => setSelectedRequest(null)}>
            接受订单
          </button>
          <button type="button" style={{ ...styles.btnOutline, marginTop: 12 }} onClick={() => setSelectedRequest(null)}>
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <link href={FONT_LINK} rel="stylesheet" />
      <style>{`
        @keyframes crSlideInFromRight {
          from { transform: translateX(100%); opacity: 0.92; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes crSlideInFromLeft {
          from { transform: translateX(-100%); opacity: 0.92; }
          to { transform: translateX(0); opacity: 1; }
        }
        .cr-ride-card { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .cr-ride-card:hover { box-shadow: 0 8px 24px rgba(${themePrimaryRgb}, 0.1); border-color: #c5d0e0; }
        .cr-input-wrap:focus-within { border-color: ${themePrimary}; box-shadow: 0 0 0 3px rgba(${themePrimaryRgb}, 0.15); }
        .cr-plan-input-dark::placeholder { color: rgba(255,255,255,0.45); }
      `}</style>

      <div style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={styles.logo}>
              <div style={styles.logoMark}>{Icons.car}</div>
              <span>
                College<span style={{ fontWeight: 800 }}>Ride</span>
              </span>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, maxWidth: 280, fontWeight: 400 }}>
              更便宜，更安全，和同校同学一起上学。
            </p>
          </div>
          <div
            role="group"
            aria-label="身份：乘客或司机"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "stretch",
              width: 156,
              marginTop: 4,
              flexShrink: 0,
              padding: 4,
              borderRadius: 999,
              background: role === "driver" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.22)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "inset 0 2px 5px rgba(0,0,0,0.35)",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 4,
                bottom: 4,
                left: role === "rider" ? 4 : "50%",
                right: role === "rider" ? "50%" : 4,
                borderRadius: 999,
                background: "rgba(255,255,255,0.22)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition:
                  "left 0.28s cubic-bezier(0.22, 1, 0.36, 1), right 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
            <button
              type="button"
              aria-pressed={role === "rider"}
              onClick={() => {
                setRoleSlideTarget("rider");
                setRole("rider");
              }}
              style={{
                position: "relative",
                zIndex: 1,
                flex: 1,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
                padding: "8px 6px",
                borderRadius: 999,
                fontSize: role === "rider" ? 14 : 11,
                fontWeight: role === "rider" ? 700 : 500,
                color: role === "rider" ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.45)",
                letterSpacing: role === "rider" ? "-0.02em" : "0",
                transition: "font-size 0.22s ease, font-weight 0.22s ease, color 0.22s ease",
              }}
            >
              乘客
            </button>
            <button
              type="button"
              aria-pressed={role === "driver"}
              onClick={() => {
                setRoleSlideTarget("driver");
                setRole("driver");
              }}
              style={{
                position: "relative",
                zIndex: 1,
                flex: 1,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
                padding: "8px 6px",
                borderRadius: 999,
                fontSize: role === "driver" ? 14 : 11,
                fontWeight: role === "driver" ? 700 : 500,
                color: role === "driver" ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.45)",
                letterSpacing: role === "driver" ? "-0.02em" : "0",
                transition: "font-size 0.22s ease, font-weight 0.22s ease, color 0.22s ease",
              }}
            >
              司机
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <div
          key={role}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 16px 96px",
            background: colors.page,
            animation:
              roleSlideTarget === "rider"
                ? "crSlideInFromRight 0.38s cubic-bezier(0.22, 1, 0.36, 1) both"
                : roleSlideTarget === "driver"
                  ? "crSlideInFromLeft 0.38s cubic-bezier(0.22, 1, 0.36, 1) both"
                  : "none",
          }}
        >
        {tab === "find" && role === "rider" && (
          <>
            <div style={{ ...styles.card, marginTop: 2, padding: "20px" }}>
              <div style={styles.label}>路线</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 14, letterSpacing: "-0.02em" }}>搜索行程</div>
              <div
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: colors.white,
                  display: "flex",
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    width: 28,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 14,
                    paddingBottom: 14,
                    background: colors.page,
                    borderRight: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ width: 9, height: 9, borderRadius: "50%", border: `2px solid ${colors.navy}` }} />
                  <div style={{ flex: 1, width: 2, background: colors.border, margin: "6px 0" }} />
                  <div style={{ width: 8, height: 8, background: colors.navy, borderRadius: 2 }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", minHeight: 48 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanTripFocus("from");
                        setPlanTripOpen(true);
                      }}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        padding: "14px 8px 14px 12px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.text,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {fromUseCurrentLocation ? "当前位置" : riderFrom || "输入出发地"}
                    </button>
                    <button
                      type="button"
                      aria-label="将出发地设为当前位置"
                      onClick={(e) => {
                        e.stopPropagation();
                        snapOriginToCurrentLocation();
                      }}
                      style={{
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        marginRight: 4,
                        border: "none",
                        borderRadius: 10,
                        background: "transparent",
                        color: colors.navy,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ display: "flex" }}>{Icons.navigate}</span>
                    </button>
                  </div>
                  <div style={{ height: 1, background: colors.border }} />
                  <button
                    type="button"
                    onClick={() => {
                      setPlanTripFocus("to");
                      setPlanTripOpen(true);
                    }}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      padding: "14px 12px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: riderTo ? 600 : 400,
                      color: riderTo ? colors.text : colors.muted,
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    {riderTo || "您想去哪里？"}
                  </button>
                </div>
              </div>
              {routePreviewReady && effectiveFromLatLng && riderToCoords && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ ...styles.label, marginTop: 0 }}>路线预览</div>
                  <TripRouteMap
                    fromLat={effectiveFromLatLng.lat}
                    fromLng={effectiveFromLatLng.lng}
                    toLat={riderToCoords.lat}
                    toLng={riderToCoords.lng}
                    lineColor={themePrimary}
                    userLocation={currentLocationCoords}
                  />
                </div>
              )}
            </div>

            <div style={styles.sectionTitle}>附近行程</div>
            <div style={styles.sectionHeadline}>共 {matchedRides.length} 条匹配</div>
            <p style={{ fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
              根据你在「{activeCampus.short}」的位置，优先展示附近可搭乘的行程
            </p>
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
                    <div style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>/ 人</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    marginBottom: 12,
                    padding: "12px 14px",
                    background: colors.page,
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 12, paddingTop: 4 }}>
                    <div style={styles.routeDot(true)} />
                    <div style={{ width: 2, flex: 1, minHeight: 16, background: colors.border, margin: "4px 0" }} />
                    <div style={styles.routeDot(false)} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                    <div>
                      <span style={{ fontSize: 11, color: colors.muted, fontWeight: 600 }}>出发 </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{ride.from}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: colors.muted, fontWeight: 600 }}>到达 </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{ride.to}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Tag text={ride.time} accent={themePrimary} />
                  <Tag text={`${ride.seats} 席`} accent={themePrimary} />
                  <Tag text={`绕路 ${ride.detour}`} accent={themePrimary} />
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "find" && role === "driver" && (
          <>
            <div style={styles.sectionTitle}>司机</div>
            <div style={styles.sectionHeadline}>顺路请求</div>
            <p style={{ fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
              根据你在「{activeCampus.short}」的位置，优先展示附近乘客请求
            </p>
            <div style={{ ...styles.card, background: colors.white, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: colors.text, fontWeight: 600, marginBottom: 6 }}>匹配说明</div>
              <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.55, fontWeight: 400 }}>
                系统根据绕路距离推荐顺路乘客；接单后按实际绕路计费。
              </div>
            </div>
            {matchedRequests.map((req) => (
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
                    <div style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>预计收益</div>
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
                  <Tag text={`绕路 ${req.detour}`} accent={themePrimary} />
                  {typeof req._km === "number" && <Tag text={`距你约 ${req._km.toFixed(1)} km`} accent={themePrimary} />}
                </div>
                <button
                  type="button"
                  style={{ ...styles.btn, padding: "12px", fontSize: 14 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRide(null);
                    setSelectedRequest(req);
                  }}
                >
                  查看详情
                </button>
              </div>
            ))}
          </>
        )}

        {tab === "post" && role === "driver" && (
          <>
            <div style={styles.sectionTitle}>发布</div>
            <div style={styles.sectionHeadline}>发布空座</div>
            <div style={styles.card}>
              <div style={styles.label}>路线</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>出发地</div>
              <input
                value={publishFrom}
                onChange={(e) => setPublishFrom(e.target.value)}
                style={{ ...styles.input, paddingLeft: 12 }}
                placeholder="出发地"
              />
              <button
                type="button"
                onClick={() => setMapPicker((p) => (p === "publish-from" ? null : "publish-from"))}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                  marginTop: 4,
                  padding: "4px 0",
                  border: "none",
                  background: "none",
                  color: colors.navy,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                <span style={{ display: "flex" }}>{Icons.mapPath}</span>
                从地图选择
              </button>
              {mapPicker === "publish-from" && (
                <MapPickerPanel
                  lineColor={colors.navy}
                  center={mapPickerCenter}
                  userLocation={currentLocationCoords}
                  onPick={(name) => {
                    setPublishFrom(name);
                    setMapPicker(null);
                  }}
                  onClose={() => setMapPicker(null)}
                />
              )}
              <input
                value={publishTo}
                onChange={(e) => setPublishTo(e.target.value)}
                style={{ ...styles.input, paddingLeft: 12 }}
                placeholder="目的地"
              />

              <div style={styles.label}>出发时间</div>
              <input style={{ ...styles.input, paddingLeft: 12 }} placeholder="如：8:30 AM" />

              <div style={styles.label}>空余座位</div>
              <select
                id="cr-post-seats"
                aria-label="空余座位数量"
                value={postSeats}
                onChange={(e) => setPostSeats(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  fontSize: 14,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 500,
                  backgroundColor: colors.white,
                  color: colors.text,
                  cursor: "pointer",
                  boxSizing: "border-box",
                  outline: "none",
                  marginBottom: 14,
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} 个空座
                  </option>
                ))}
              </select>

              <div style={styles.label}>计价</div>
              <div style={{ ...styles.card, background: colors.tint, border: `1px solid ${colors.border}`, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: colors.navy, fontWeight: 600 }}>平台自动计价</div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 1.5 }}>按绕路距离比例计费；平台收取 10% 服务费。</div>
              </div>

              <button type="button" style={styles.btn}>
                发布行程
              </button>
            </div>
          </>
        )}

        {tab === "saved" && role === "rider" && (
          <>
            <div style={styles.sectionTitle}>常用路线</div>
            <div style={styles.sectionHeadline}>已保存的路线</div>
            <p style={{ fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 14, lineHeight: 1.55 }}>
              保存后可在找拼车或下方时间表中一键使用；出发前在「规划行程」里确认即可。
            </p>

            {canConfirmPlanRoute && (
              <div style={{ ...styles.card, marginBottom: 14 }}>
                {!showCommonRouteSaveForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCommonRouteSaveName("通勤");
                      setShowCommonRouteSaveForm(true);
                    }}
                    style={{ ...styles.btnOutline, width: "100%", marginBottom: 0 }}
                  >
                    将当前路线存为常用路线
                  </button>
                ) : (
                  <div>
                    <div style={{ ...styles.label, marginBottom: 8 }}>路线名称</div>
                    <input
                      type="text"
                      value={commonRouteSaveName}
                      onChange={(e) => setCommonRouteSaveName(e.target.value)}
                      placeholder="例如：平日上学、周末回家"
                      style={{ ...styles.input, marginBottom: 12 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => setShowCommonRouteSaveForm(false)} style={{ ...styles.btnOutline, flex: 1 }}>
                        取消
                      </button>
                      <button type="button" onClick={commitSaveCurrentAsCommonRoute} style={{ ...styles.btn, flex: 1 }}>
                        保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {commonRoutes.length === 0 ? (
              <div style={{ ...styles.card, padding: "22px 18px", marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, textAlign: "center" }}>
                  暂无常用路线。在「找拼车」里选好出发地与目的地后，回到本页即可保存。
                </div>
              </div>
            ) : (
              commonRoutes.map((trip) => {
                const fromText = trip.fromUseCurrentLocation ? "当前位置" : trip.fromLabel || "出发地";
                return (
                  <div key={trip.id} style={{ ...styles.card, padding: "16px 18px" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, letterSpacing: "-0.02em" }}>{trip.name}</div>
                    <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.5, marginBottom: 14 }}>
                      <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>从 </span>
                      {fromText}
                      <br />
                      <span style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>到 </span>
                      {trip.toLabel}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => applyCommonRoute(trip)} style={{ ...styles.btn, flex: 1, marginBottom: 0 }}>
                        使用此路线
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCommonRoute(trip.id)}
                        style={{
                          ...styles.btnOutline,
                          flex: "0 0 auto",
                          width: "auto",
                          padding: "12px 14px",
                          marginBottom: 0,
                          color: colors.muted,
                          borderColor: colors.border,
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ ...styles.sectionTitle, marginTop: 8 }}>常用时间表</div>
            <div style={styles.sectionHeadline}>一周安排</div>
            <p style={{ fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 12, lineHeight: 1.55 }}>
              左侧加号可向时间表添加常用路线：选择星期、时间与起终点，条目会出现在对应星期的格子里。
            </p>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ width: 40, flexShrink: 0, paddingTop: 22 }}>
                <button
                  type="button"
                  onClick={openScheduleModal}
                  aria-label="向时间表添加常用路线"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: `1.5px solid ${colors.navy}`,
                    background: colors.white,
                    color: colors.navy,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span style={{ display: "flex" }}>{Icons.plus}</span>
                </button>
              </div>
              <div style={{ flex: 1, minWidth: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(76px, 1fr))",
                    gap: 6,
                    minWidth: 560,
                  }}
                >
                  {WEEKDAY_LABELS.map((label, wd) => (
                    <div key={label}>
                      <div
                        style={{
                          textAlign: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: colors.muted,
                          marginBottom: 6,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          border: `1px solid ${colors.border}`,
                          borderRadius: 10,
                          minHeight: 260,
                          background: colors.page,
                          padding: 6,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {scheduleEntries
                          .filter((e) => e.weekday === wd)
                          .sort((a, b) => a.minutes - b.minutes)
                          .map((entry) => {
                            const fromT = entry.fromUseCurrentLocation ? "当前位置" : entry.fromLabel || "出发地";
                            return (
                              <div
                                key={entry.id}
                                style={{
                                  background: colors.card,
                                  borderRadius: 8,
                                  padding: "8px 8px 6px",
                                  border: `1px solid ${colors.border}`,
                                  fontSize: 11,
                                  lineHeight: 1.35,
                                }}
                              >
                                <div style={{ fontWeight: 700, color: colors.navy, marginBottom: 4, fontSize: 12, lineHeight: 1.35 }}>
                                  {formatScheduleMinutes(entry.minutes)}
                                  {entry.returnMinutes != null ? (
                                    <span style={{ color: colors.muted, fontWeight: 600 }}>
                                      {" "}
                                      · 返程 {formatScheduleMinutes(entry.returnMinutes)}
                                    </span>
                                  ) : null}
                                </div>
                                <div style={{ color: colors.text, marginBottom: 6 }}>
                                  {fromT} → {entry.toLabel}
                                </div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={() => applyCommonRoute(entry)}
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      padding: "6px 6px",
                                      borderRadius: 6,
                                      border: "none",
                                      background: colors.navy,
                                      color: colors.white,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      fontFamily: "'Inter', system-ui, sans-serif",
                                    }}
                                  >
                                    使用
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteScheduleEntry(entry.id)}
                                    style={{
                                      padding: "6px 8px",
                                      borderRadius: 6,
                                      border: `1px solid ${colors.border}`,
                                      background: colors.white,
                                      color: colors.muted,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      fontFamily: "'Inter', system-ui, sans-serif",
                                    }}
                                  >
                                    删
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {scheduleModalOpen && role === "rider" && (
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
                background: "rgba(0,0,0,0.45)",
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
                maxHeight: "min(92vh, 900px)",
                overflowY: "auto",
                background: colors.navy,
                borderRadius: 16,
                padding: "20px 18px 18px",
                boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
                zIndex: 1,
                color: colors.white,
              }}
            >
              <div id="cr-schedule-modal-title" style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: colors.white }}>
                添加常用路线
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 16, lineHeight: 1.5 }}>
                选择星期、出发时间与起终点，保存后会出现在对应星期的格子里。
              </p>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                星期
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setScheduleModalWeekday(i)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${scheduleModalWeekday === i ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)"}`,
                      background: scheduleModalWeekday === i ? "rgba(255,255,255,0.95)" : "transparent",
                      color: scheduleModalWeekday === i ? colors.navy : "rgba(255,255,255,0.92)",
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

              <div style={{ marginBottom: 14 }}>
                <TimeHourMinuteBlock
                  key={scheduleModalWheelKey}
                  variant="dark"
                  compact
                  heading="出发时间"
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
                }}
              >
                <input
                  type="checkbox"
                  checked={scheduleModalFromUseCL}
                  onChange={(e) => {
                    setScheduleModalFromUseCL(e.target.checked);
                    if (e.target.checked) {
                      setScheduleModalFrom("");
                      setScheduleModalFromCoords(null);
                    }
                  }}
                  style={{ width: 18, height: 18, accentColor: "#fff", cursor: "pointer" }}
                />
                出发地使用当前位置
              </label>

              {!scheduleModalFromUseCL && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.55)",
                      marginBottom: 6,
                    }}
                  >
                    出发地
                  </div>
                  <PlaceSuggestField
                    inputId="cr-schedule-modal-from"
                    value={scheduleModalFrom}
                    onChange={setScheduleModalFrom}
                    onCoordsChange={setScheduleModalFromCoords}
                    placeholder="搜索出发地"
                    variant="dark"
                    borderColor="rgba(255,255,255,0.28)"
                    hoverRgb={themePrimaryRgb}
                    icon={
                      <span
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "rgba(255,255,255,0.85)",
                          display: "flex",
                          zIndex: 1,
                          pointerEvents: "none",
                        }}
                      >
                        {Icons.pin}
                      </span>
                    }
                    inputStyle={{
                      ...styles.input,
                      marginBottom: 0,
                      paddingLeft: 36,
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                    }}
                    wrapperStyle={{
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "rgba(0,0,0,0.15)",
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 6,
                  }}
                >
                  目的地
                </div>
                <PlaceSuggestField
                  inputId="cr-schedule-modal-to"
                  value={scheduleModalTo}
                  onChange={setScheduleModalTo}
                  onCoordsChange={setScheduleModalToCoords}
                  placeholder="搜索目的地"
                  variant="dark"
                  borderColor="rgba(255,255,255,0.28)"
                  hoverRgb={themePrimaryRgb}
                  icon={
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(255,255,255,0.85)",
                        display: "flex",
                        zIndex: 1,
                        pointerEvents: "none",
                      }}
                    >
                      {Icons.flag}
                    </span>
                  }
                  inputStyle={{
                    ...styles.input,
                    marginBottom: 0,
                    paddingLeft: 36,
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                  }}
                  wrapperStyle={{
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(0,0,0,0.15)",
                  }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: scheduleModalReturnEnabled ? 10 : 14,
                  cursor: "pointer",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                <input
                  type="checkbox"
                  checked={scheduleModalReturnEnabled}
                  onChange={(e) => {
                    setScheduleModalReturnEnabled(e.target.checked);
                    if (e.target.checked) setScheduleModalReturnWheelKey((k) => k + 1);
                  }}
                  style={{ width: 18, height: 18, accentColor: "#fff", cursor: "pointer" }}
                />
                添加返程
              </label>
              {scheduleModalReturnEnabled && (
                <div style={{ marginBottom: 16 }}>
                  <TimeHourMinuteBlock
                    key={scheduleModalReturnWheelKey}
                    variant="dark"
                    compact
                    heading="返程时间"
                    hour24={scheduleModalReturnHour}
                    minute={scheduleModalReturnMinute}
                    onHour24Change={setScheduleModalReturnHour}
                    onMinuteChange={setScheduleModalReturnMinute}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.45)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={commitScheduleEntry}
                  title={
                    !(
                      scheduleModalToCoords &&
                      scheduleModalTo.trim() &&
                      (scheduleModalFromUseCL || (scheduleModalFrom.trim() && scheduleModalFromCoords))
                    )
                      ? "请填写目的地并从下拉列表中选择地点以保存坐标"
                      : undefined
                  }
                  disabled={
                    !(
                      scheduleModalToCoords &&
                      scheduleModalTo.trim() &&
                      (scheduleModalFromUseCL || (scheduleModalFrom.trim() && scheduleModalFromCoords))
                    )
                  }
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "none",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor:
                      scheduleModalToCoords &&
                      scheduleModalTo.trim() &&
                      (scheduleModalFromUseCL || (scheduleModalFrom.trim() && scheduleModalFromCoords))
                        ? "pointer"
                        : "not-allowed",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    background:
                      scheduleModalToCoords &&
                      scheduleModalTo.trim() &&
                      (scheduleModalFromUseCL || (scheduleModalFrom.trim() && scheduleModalFromCoords))
                        ? "#3b82f6"
                        : "rgba(255,255,255,0.14)",
                    color: "#ffffff",
                    opacity:
                      scheduleModalToCoords &&
                      scheduleModalTo.trim() &&
                      (scheduleModalFromUseCL || (scheduleModalFrom.trim() && scheduleModalFromCoords))
                        ? 1
                        : 0.65,
                  }}
                >
                  保存到时间表
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <>
            <div style={styles.sectionTitle}>记录</div>
            <div style={styles.sectionHeadline}>行程与节省</div>
            {[
              { date: "今天", from: "Foggy Bottom", to: "Capitol Hill", cost: "$4.50", type: "乘客", driver: "Alex K." },
              { date: "昨天", from: "Georgetown", to: "Dupont Circle", cost: "$3.00", type: "乘客", driver: "Maya S." },
              { date: "3月5日", from: "Tenleytown", to: "Downtown DC", cost: "+$6.20", type: "司机", driver: "你" },
            ].map((item, i) => (
              <div key={i} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: colors.muted, fontWeight: 600 }}>{item.date}</div>
                  <Tag text={item.type} accent={themePrimary} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.02em" }}>
                  {item.from} — {item.to}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: colors.muted }}>{item.type === "乘客" ? `司机：${item.driver}` : "你开车"}</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: item.type === "司机" ? colors.navy : colors.text }}>{item.cost}</span>
                </div>
              </div>
            ))}
            <div
              style={{
                ...styles.card,
                background: colors.navy,
                textAlign: "center",
                border: "none",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 6, fontWeight: 600, letterSpacing: "0.06em" }}>本月合计节省</div>
              <div style={{ color: colors.white, fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>$24.50</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 6 }}>相较网约车约省 42%</div>
            </div>
          </>
        )}

        {tab === "profile" && (
          <>
            <div style={styles.sectionTitle}>账户</div>
            <div style={styles.sectionHeadline}>个人资料</div>
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
                T
              </div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Timon L.</div>
              <div style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>JHU · 2024级</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                <Tag text="已验证学生" accent={themePrimary} />
                <StarRating rating={4.9} accent={themePrimary} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "总行程", value: "12 次" },
                { label: "节省金额", value: "$67.20" },
                { label: "司机收入", value: "$18.60" },
                { label: "减碳量", value: "23 kg" },
              ].map((item) => (
                <div key={item.label} style={{ ...styles.card, textAlign: "center", padding: "16px 12px" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: 500 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>学校</div>
              <div style={{ fontSize: 14, color: colors.text, fontWeight: 600, marginBottom: 8 }}>{USER_SCHOOL}</div>
              <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.55 }}>
                学校由登录与身份验证确定，不可在此修改。教学楼 / 校区请在「规划行程」地图中通过出发地与目的地旁的教学楼下拉选择。
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      <div style={styles.navBar}>
        <NavItem icon={Icons.search} label="找拼车" id="find" />
        {role === "rider" && <NavItem icon={Icons.route} label="常用路线" id="saved" />}
        {role === "driver" && <NavItem icon={Icons.plus} label="发布" id="post" />}
        <NavItem icon={Icons.list} label="记录" id="history" />
        <NavItem icon={Icons.user} label="我的" id="profile" />
      </div>

      {planTripOpen && role === "rider" && tab === "find" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100000,
              display: "flex",
              flexDirection: "column",
              background: "#000",
            }}
          >
            {pickupTimeMenuOpen && (
              <>
                <div
                  role="presentation"
                  aria-hidden
                  onClick={closePickupMenuAnimated}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 100001,
                  }}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="接载时间"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "fixed",
                    left: pickupPopoverPos.x,
                    top: pickupPopoverPos.y,
                    transform: "translate(-50%, -50%)",
                    zIndex: 100002,
                    width: "min(380px, calc(100vw - 24px))",
                    maxHeight: "min(72vh, 540px)",
                    overflowY: "auto",
                    overflowX: "hidden",
                    background: "#ffffff",
                    borderRadius: 16,
                    boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
                    padding: 16,
                    color: themePrimary,
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: themePrimary, marginBottom: 12 }}>接载时间</div>
                  <button
                    type="button"
                    onClick={() => {
                      setPickupMenuHighlight("immediate");
                      setPickupTimeMode("immediate");
                      setPickupTimeMenuExpanded(false);
                      closePickupMenuAnimated();
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,51,153,0.35)",
                      background:
                        pickupMenuHighlight === "immediate" ? "rgba(0,51,153,0.1)" : "rgba(0,51,153,0.04)",
                      color: themePrimary,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: "pointer",
                      marginBottom: 8,
                      textAlign: "left",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${themePrimary}`,
                        flexShrink: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: pickupMenuHighlight === "immediate" ? themePrimary : "transparent",
                      }}
                      aria-hidden
                    >
                      {pickupMenuHighlight === "immediate" ? (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#ffffff",
                          }}
                        />
                      ) : null}
                    </span>
                    <span>立即接载</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickupMenuHighlight("scheduled");
                      setPickupTimeMode("scheduled");
                      resetScheduleToNow();
                      setPickupTimeMenuExpanded(true);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,51,153,0.35)",
                      background:
                        pickupMenuHighlight === "scheduled" ? "rgba(0,51,153,0.1)" : "rgba(0,51,153,0.04)",
                      color: themePrimary,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${themePrimary}`,
                        flexShrink: 0,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: pickupMenuHighlight === "scheduled" ? themePrimary : "transparent",
                      }}
                      aria-hidden
                    >
                      {pickupMenuHighlight === "scheduled" ? (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#ffffff",
                          }}
                        />
                      ) : null}
                    </span>
                    <span>预约出发</span>
                  </button>

                  <div
                    style={{
                      maxHeight: pickupTimeMenuExpanded ? 2000 : 0,
                      opacity: pickupTimeMenuExpanded ? 1 : 0,
                      overflow: "hidden",
                      transition: `max-height ${PICKUP_MENU_ANIM_MS}ms ease-out, opacity ${PICKUP_MENU_ANIM_MS}ms ease-out`,
                      pointerEvents: pickupTimeMenuExpanded ? "auto" : "none",
                    }}
                  >
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid rgba(0,51,153,0.15)",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(0,51,153,0.75)",
                          marginBottom: 10,
                        }}
                      >
                        滑动选择日期与时间
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "stretch",
                          overflow: "hidden",
                          marginBottom: 12,
                        }}
                      >
                        <WheelScrollColumn
                          variant="light"
                          label="日期"
                          options={dateOptionsForWheel}
                          value={scheduledPickupDate}
                          onChange={setScheduledPickupDate}
                          format={formatCnDateLabel}
                          equals={sameCalendarDay}
                        />
                        <TimeHourMinuteBlock
                          key={pickupWheelResetKey}
                          variant="light"
                          hour24={scheduledHour}
                          minute={scheduledMinute}
                          onHour24Change={setScheduledHour}
                          onMinuteChange={setScheduledMinute}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPickupTimeMode("scheduled");
                          closePickupMenuAnimated();
                        }}
                        style={{
                          width: "100%",
                          padding: "14px 16px",
                          borderRadius: 12,
                          border: "none",
                          background: themePrimary,
                          color: "#ffffff",
                          fontSize: 16,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          marginBottom: 0,
                        }}
                      >
                        完成
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div style={{ flex: 1, minHeight: 0, position: "relative", height: "100vh" }}>
              <Map
                key={`plan-${planModalMapCenter.lat}-${planModalMapCenter.lng}`}
                mapLib={maplibregl}
                initialViewState={{
                  longitude: planModalMapCenter.lng,
                  latitude: planModalMapCenter.lat,
                  zoom: 13,
                }}
                mapStyle={COLLEGE_VECTOR_MAP_STYLE}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                scrollZoom
                onLoad={(e) => applyCollegeRoadHierarchy(e.target)}
              >
                <UserLocationMarker lat={currentLocationCoords?.lat} lng={currentLocationCoords?.lng} />
              </Map>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 1,
                  pointerEvents: "none",
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 38%, transparent 62%, rgba(0,0,0,0.35) 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 2,
                  padding: "10px 12px 8px",
                  paddingTop: "max(10px, env(safe-area-inset-top))",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  pointerEvents: "auto",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPlanTripOpen(false)}
                  aria-label="返回"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex" }}>{Icons.chevronLeft}</span>
                </button>
                <span style={{ fontWeight: 600, fontSize: 17, color: "#fff", letterSpacing: "-0.02em" }}>规划您的行程</span>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 3,
                maxHeight: "88vh",
                overflowY: "auto",
                borderRadius: "18px 18px 0 0",
                background: themePrimary,
                boxShadow: "0 -12px 48px rgba(0,0,0,0.45)",
                padding: "16px 16px max(20px, env(safe-area-inset-bottom))",
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <button
                  ref={planPickupTimeBtnRef}
                  type="button"
                  onClick={() => {
                    if (pickupTimeMenuOpen) closePickupMenuAnimated();
                    else {
                      setPickupTimeMenuOpen(true);
                      setPickupTimeMenuExpanded(pickupTimeMode === "scheduled");
                      setPickupMenuHighlight(pickupTimeMode === "scheduled" ? "scheduled" : "immediate");
                    }
                  }}
                  aria-expanded={pickupTimeMenuOpen}
                  aria-haspopup="dialog"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    maxWidth: "100%",
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.35)",
                    background: pickupTimeMenuOpen ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "left",
                    }}
                  >
                    {planTripTimeChipLabel}
                  </span>
                  <span style={{ display: "flex", flexShrink: 0, marginLeft: 2, opacity: 0.92 }}>{Icons.chevronDown}</span>
                </button>
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.35)",
                    background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <span style={{ display: "flex" }}>{Icons.user}</span>
                  为我本人
                  <span style={{ opacity: 0.7, fontSize: 10 }}>▾</span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    border: "1px solid rgba(255,255,255,0.35)",
                    borderRadius: 12,
                    overflow: "visible",
                    background: "rgba(0,0,0,0.2)",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      paddingTop: 12,
                      paddingBottom: 12,
                      borderRight: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.95)" }} />
                    <div style={{ flex: 1, width: 2, background: "rgba(255,255,255,0.35)", margin: "5px 0" }} />
                    <div style={{ width: 8, height: 8, background: "#fff", borderRadius: 2 }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <div
                      style={{
                        padding: "8px 12px 4px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.55)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      出发地
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 12px 8px", alignItems: "center" }}>
                      <div
                        ref={planTripOriginNearestRef}
                        style={{
                          position: "relative",
                          display: "inline-flex",
                          alignItems: "stretch",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.35)",
                          background: "rgba(255,255,255,0.1)",
                          overflow: "visible",
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            snapOriginToNearestBuilding();
                          }}
                          aria-label="定位到最近教学楼"
                          style={{
                            padding: "9px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            border: "none",
                            borderRight: "1px solid rgba(255,255,255,0.25)",
                            borderRadius: "999px 0 0 999px",
                            background: "transparent",
                            color: "rgba(255,255,255,0.95)",
                            cursor: "pointer",
                            fontFamily: "'Inter', system-ui, sans-serif",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ display: "flex", width: 18, height: 18 }}>{Icons.navigate}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlanTripCampusOpen((o) => !o)}
                          aria-expanded={planTripCampusOpen}
                          aria-haspopup="listbox"
                          aria-controls="cr-plan-trip-origin-building-listbox"
                          style={{
                            padding: "9px 14px",
                            fontSize: 13,
                            fontWeight: 600,
                            border: "none",
                            borderRadius: "0 999px 999px 0",
                            background: "transparent",
                            color: "rgba(255,255,255,0.95)",
                            cursor: "pointer",
                            fontFamily: "'Inter', system-ui, sans-serif",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          最近教学楼
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(255,255,255,0.85)"
                            strokeWidth="2"
                            style={{
                              transform: planTripCampusOpen ? "rotate(180deg)" : "none",
                              transition: "transform 0.15s ease",
                              flexShrink: 0,
                            }}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {planTripCampusOpen && (
                          <ul
                            id="cr-plan-trip-origin-building-listbox"
                            role="listbox"
                            aria-label="教学楼或校区（出发，按距离排序）"
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              top: "100%",
                              marginTop: 4,
                              padding: "4px 0",
                              maxHeight: 280,
                              overflowY: "auto",
                              borderRadius: 10,
                              border: "1px solid rgba(255,255,255,0.35)",
                              background: "rgba(18,20,28,0.98)",
                              boxShadow: "0 14px 40px rgba(0,0,0,0.55)",
                              zIndex: 100001,
                              listStyle: "none",
                              marginBottom: 0,
                            }}
                          >
                            {originCampusesByDistance.map(({ loc, km }) => (
                              <li
                                key={loc.id}
                                role="option"
                                aria-selected={loc.id === jhuLocationId && originPickedFromBuilding}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  pickOriginBuilding(loc);
                                }}
                                style={{
                                  padding: "10px 14px",
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: "rgba(255,255,255,0.95)",
                                  cursor: "pointer",
                                  lineHeight: 1.35,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  gap: 2,
                                  background:
                                    loc.id === jhuLocationId && originPickedFromBuilding
                                      ? `rgba(${themePrimaryRgb}, 0.22)`
                                      : "transparent",
                                }}
                              >
                                <span>{loc.label}</span>
                                <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)" }}>
                                  {km < 1 ? `约 ${Math.round(km * 1000)} m` : `约 ${km.toFixed(1)} km`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => snapOriginToCurrentLocation()}
                        style={{
                          padding: "9px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.35)",
                          background: "rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.95)",
                          cursor: "pointer",
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        使用当前定位
                      </button>
                    </div>
                    <div style={{ padding: "0 12px 8px" }}>
                      <PlaceSuggestField
                        inputId="cr-plan-trip-origin-input"
                        value={fromUseCurrentLocation ? "" : riderFrom}
                        onChange={handleRiderFromChange}
                        onCoordsChange={setRiderFromCoords}
                        onFocus={onOriginInputFocus}
                        onBlur={onOriginInputBlur}
                        placeholder={fromUseCurrentLocation ? "当前位置（或在此搜索地址）" : "搜索出发地"}
                        variant="dark"
                        icon={
                          <span
                            style={{
                              position: "absolute",
                              left: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "rgba(255,255,255,0.85)",
                              display: "flex",
                              zIndex: 1,
                              pointerEvents: "none",
                            }}
                          >
                            {Icons.pin}
                          </span>
                        }
                        borderColor="rgba(255,255,255,0.25)"
                        hoverRgb={themePrimaryRgb}
                        inputStyle={{ ...styles.input, marginBottom: 0, paddingLeft: 36, paddingTop: 12, paddingBottom: 12, fontSize: 15 }}
                        wrapperStyle={{
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.2)",
                          background: "rgba(0,0,0,0.15)",
                          marginBottom: 0,
                        }}
                      />
                    </div>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
                    <div
                      style={{
                        padding: "4px 12px 4px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.55)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      目的地
                    </div>
                    <div style={{ padding: "0 12px 10px" }}>
                      <PlaceSuggestField
                        inputId="cr-plan-trip-dest-input"
                        value={riderTo}
                        onChange={handleRiderToChange}
                        onCoordsChange={setRiderToCoords}
                        placeholder={planTripFocus === "to" ? "您想去哪里？" : "搜索目的地"}
                        variant="dark"
                        icon={
                          <span
                            style={{
                              position: "absolute",
                              left: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "rgba(255,255,255,0.85)",
                              display: "flex",
                              zIndex: 1,
                              pointerEvents: "none",
                            }}
                          >
                            {Icons.flag}
                          </span>
                        }
                        borderColor="rgba(255,255,255,0.25)"
                        hoverRgb={themePrimaryRgb}
                        inputStyle={{ ...styles.input, marginBottom: 0, paddingLeft: 36, paddingTop: 12, paddingBottom: 12, fontSize: 15 }}
                        wrapperStyle={{
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.2)",
                          background: "rgba(0,0,0,0.15)",
                          marginBottom: 0,
                        }}
                      />
                    </div>
                    <div style={{ padding: "4px 12px 10px" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.92)",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={planTripReturnEnabled}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setPlanTripReturnEnabled(on);
                            if (on) {
                              setReturnScheduledDate(new Date(scheduledPickupDate));
                              setReturnWheelKey((k) => k + 1);
                            }
                          }}
                          style={{ width: 18, height: 18, accentColor: "#fff", cursor: "pointer" }}
                        />
                        添加返程
                      </label>
                      {planTripReturnEnabled && (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "rgba(255,255,255,0.55)",
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              marginBottom: 8,
                            }}
                          >
                            返程时间
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "stretch",
                              overflow: "hidden",
                            }}
                          >
                            <WheelScrollColumn
                              variant="dark"
                              label="日期"
                              options={dateOptionsForWheel}
                              value={returnScheduledDate}
                              onChange={setReturnScheduledDate}
                              format={formatCnDateLabel}
                              equals={sameCalendarDay}
                            />
                            <TimeHourMinuteBlock
                              key={returnWheelKey}
                              variant="dark"
                              hour24={returnHour}
                              minute={returnMinute}
                              onHour24Change={setReturnHour}
                              onMinuteChange={setReturnMinute}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={swapPlanTripEndpoints}
                  aria-label="交换出发地与目的地"
                  title="交换出发地与目的地"
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    alignSelf: "center",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.88)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M7 16V4M7 4l-3 3M7 4l3 3" />
                    <path d="M17 8v12M17 20l3-3M17 20l-3-3" />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                disabled={!canConfirmPlanRoute}
                onClick={() => {
                  setRoutePreviewReady(true);
                  setPlanTripOpen(false);
                }}
                style={{
                  ...styles.btn,
                  marginTop: 16,
                  opacity: canConfirmPlanRoute ? 1 : 0.45,
                  cursor: canConfirmPlanRoute ? "pointer" : "not-allowed",
                }}
              >
                确认行程
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
