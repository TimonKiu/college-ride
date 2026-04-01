import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** DMV 知名院校（优先展示，便于快速选择） */
const DMV_SCHOOLS_NOTABLE = [
  "George Washington University",
  "Georgetown University",
  "Johns Hopkins University — Homewood Campus (Baltimore)",
  "Johns Hopkins University — SAIS (Washington DC)",
  "American University",
  "Howard University",
  "University of Maryland, College Park",
  "George Mason University",
  "Catholic University of America",
  "University of the District of Columbia",
  "Virginia Tech — Northern Virginia Center",
  "University of Maryland, Baltimore County",
  "University of Maryland Global Campus",
  "Gallaudet University",
  "Trinity Washington University",
  "United States Naval Academy",
];

/** 其余 DMV 地区院校（按校名排序） */
const DMV_SCHOOLS_OTHER = [
  "Anne Arundel Community College",
  "Bowie State University",
  "Capitol Technology University",
  "College of Southern Maryland",
  "Fairfax University of America",
  "Howard Community College (MD)",
  "Loyola University Maryland",
  "Marymount University",
  "Montgomery College",
  "Morgan State University",
  "Northern Virginia Community College",
  "Prince George's Community College",
  "Strayer University (Washington DC)",
  "Towson University",
  "Washington Adventist University",
].sort((a, b) => a.localeCompare(b, "en"));

const DMV_SCHOOLS_ALL = [...new Set([...DMV_SCHOOLS_NOTABLE, ...DMV_SCHOOLS_OTHER])];

/** 演示用：DC 及周边地名 → [纬度, 经度] */
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

function nearestPlaceName(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const [name, coords] of Object.entries(DC_AREA_POINTS)) {
    const [plat, plng] = coords;
    const d = (lat - plat) ** 2 + (lng - plng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

const MOCK_RIDES = [
  {
    id: 1,
    driver: "Alex K.",
    school: "GWU",
    from: "Foggy Bottom",
    to: "Capitol Hill",
    time: "8:30 AM",
    seats: 2,
    price: 4.5,
    detour: "5 min",
    rating: 4.9,
    ...(() => {
      const [fromLat, fromLng] = DC_AREA_POINTS["Foggy Bottom"];
      const [toLat, toLng] = DC_AREA_POINTS["Capitol Hill"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 2,
    driver: "Maya S.",
    school: "Georgetown",
    from: "Georgetown",
    to: "Dupont Circle",
    time: "9:00 AM",
    seats: 3,
    price: 3.0,
    detour: "3 min",
    rating: 4.8,
    ...(() => {
      const [fromLat, fromLng] = DC_AREA_POINTS.Georgetown;
      const [toLat, toLng] = DC_AREA_POINTS["Dupont Circle"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 3,
    driver: "Jordan T.",
    school: "American U",
    from: "Tenleytown",
    to: "Downtown DC",
    time: "9:15 AM",
    seats: 1,
    price: 5.5,
    detour: "8 min",
    rating: 4.7,
    ...(() => {
      const [fromLat, fromLng] = DC_AREA_POINTS.Tenleytown;
      const [toLat, toLng] = DC_AREA_POINTS["Downtown DC"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 4,
    driver: "Priya M.",
    school: "Howard",
    from: "Shaw",
    to: "Navy Yard",
    time: "10:00 AM",
    seats: 2,
    price: 4.0,
    detour: "6 min",
    rating: 5.0,
    ...(() => {
      const [fromLat, fromLng] = DC_AREA_POINTS.Shaw;
      const [toLat, toLng] = DC_AREA_POINTS["Navy Yard"];
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
];

const MOCK_REQUESTS = [
  {
    id: 1,
    rider: "Sam L.",
    school: "GWU",
    from: "Foggy Bottom",
    to: "Georgetown",
    time: "9:00 AM",
    earn: "+$3.80",
    detour: "4 min",
    ...(() => {
      const [fromLat, fromLng] = DC_AREA_POINTS["Foggy Bottom"];
      const [toLat, toLng] = DC_AREA_POINTS.Georgetown;
      return { fromLat, fromLng, toLat, toLng };
    })(),
  },
  {
    id: 2,
    rider: "Lena W.",
    school: "Georgetown",
    from: "Dupont Circle",
    to: "Capitol Hill",
    time: "8:45 AM",
    earn: "+$5.20",
    detour: "7 min",
    ...(() => {
      const [fromLat, fromLng] = DC_AREA_POINTS["Dupont Circle"];
      const [toLat, toLng] = DC_AREA_POINTS["Capitol Hill"];
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
  star: (
    <Icon stroke={1.5}>
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 14 2 9.4h7.6L12 2z" />
    </Icon>
  ),
};

const PRIMARY = "#003399";
const PRIMARY_RGB = "0, 51, 153";

const Avatar = ({ name }) => {
  const c = {
    background: PRIMARY,
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

const StarRating = ({ rating }) => (
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
    <span style={{ display: "inline-flex", color: PRIMARY }}>{Icons.star}</span>
    {rating}
  </span>
);

const Tag = ({ text }) => (
  <span
    style={{
      background: `rgba(${PRIMARY_RGB}, 0.06)`,
      color: PRIMARY,
      fontSize: 11,
      fontWeight: 600,
      padding: "5px 10px",
      borderRadius: 6,
      letterSpacing: "0.02em",
      border: `1px solid rgba(${PRIMARY_RGB}, 0.12)`,
    }}
  >
    {text}
  </span>
);

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions?.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 15 });
    }
  }, [map, positions]);
  return null;
}

function MapClickLayer({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

function MapPickerPanel({ onPick, onClose, lineColor }) {
  const center = [38.9072, -77.0369];
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
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickLayer
          onPick={(latlng) => {
            onPick(nearestPlaceName(latlng.lat, latlng.lng));
          }}
        />
      </MapContainer>
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

function TripRouteMap({ fromLat, fromLng, toLat, toLng, lineColor = PRIMARY }) {
  const [path, setPath] = useState(() => [
    [fromLat, fromLng],
    [toLat, toLng],
  ]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #dce3ed" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            zIndex: 500,
            inset: 0,
            background: "rgba(255,255,255,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          加载路线中…
        </div>
      )}
      <MapContainer key={`${fromLat},${fromLng}-${toLat},${toLng}`} center={center} zoom={12} style={{ height: 200, width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={path} pathOptions={{ color: lineColor, weight: 3, opacity: 0.9 }} />
        <CircleMarker center={[fromLat, fromLng]} radius={7} pathOptions={{ color: lineColor, fillColor: "#fff", fillOpacity: 1, weight: 2 }} />
        <CircleMarker center={[toLat, toLng]} radius={7} pathOptions={{ color: lineColor, fillColor: "#fff", fillOpacity: 1, weight: 2 }} />
        <FitBounds positions={path} />
      </MapContainer>
    </div>
  );
}

export default function CollegeRide() {
  const [tab, setTab] = useState("find");
  const [selectedRide, setSelectedRide] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [school, setSchool] = useState(
    () => DMV_SCHOOLS_ALL.find((s) => s.includes("George Washington")) ?? DMV_SCHOOLS_ALL[0]
  );
  const [role, setRole] = useState("rider");
  const [postSeats, setPostSeats] = useState(2);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [riderFrom, setRiderFrom] = useState("");
  const [riderTo, setRiderTo] = useState("");
  const [publishFrom, setPublishFrom] = useState("");
  const [publishTo, setPublishTo] = useState("");
  const [mapPicker, setMapPicker] = useState(null);

  useEffect(() => {
    if (role === "rider" && tab === "post") setTab("find");
  }, [role, tab]);

  const colors = {
    navy: PRIMARY,
    navyMid: "#002266",
    white: "#ffffff",
    page: "#f4f6f9",
    card: "#ffffff",
    text: "#0a0a0a",
    muted: "#64748b",
    border: "#dce3ed",
    navBg: "rgba(255,255,255,0.96)",
    tint: `rgba(${PRIMARY_RGB}, 0.06)`,
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
      overflow: "hidden",
      color: colors.text,
      boxShadow: `0 0 0 1px rgba(${PRIMARY_RGB}, 0.06)`,
    },
    header: {
      position: "relative",
      padding: "22px 20px 20px",
      color: colors.white,
      overflow: "hidden",
      background: colors.navy,
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
    schoolBadge: {
      marginTop: 10,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "6px 12px",
      fontSize: 12,
      color: "rgba(255,255,255,0.9)",
      fontWeight: 500,
      border: "1px solid rgba(255,255,255,0.15)",
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

  const roleToggle = (active) => ({
    background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 12,
    color: "rgba(255,255,255,0.95)",
    cursor: "pointer",
    border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid transparent",
    fontWeight: active ? 600 : 500,
  });

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
              <Avatar name={selectedRide.driver} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: colors.text }}>{selectedRide.driver}</div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {selectedRide.school} · <StarRating rating={selectedRide.rating} />
                </div>
              </div>
              <Tag text="已验证" />
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
              lineColor={PRIMARY}
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
                  <Tag text="省 47%" />
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
              <Avatar name={req.rider} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: colors.text }}>{req.rider}</div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{req.school}</div>
              </div>
              <Tag text="待接单" />
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
            <TripRouteMap fromLat={req.fromLat} fromLng={req.fromLng} toLat={req.toLat} toLng={req.toLng} lineColor={PRIMARY} />
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
        .cr-ride-card { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .cr-ride-card:hover { box-shadow: 0 8px 24px rgba(${PRIMARY_RGB}, 0.1); border-color: #c5d0e0; }
        .cr-input-wrap:focus-within { border-color: ${PRIMARY}; box-shadow: 0 0 0 3px rgba(${PRIMARY_RGB}, 0.15); }
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
            <div
              style={{
                ...styles.schoolBadge,
                marginTop: 12,
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={school}
            >
              {school}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexShrink: 0 }}>
            <div style={roleToggle(role === "rider")} onClick={() => setRole("rider")}>
              乘客
            </div>
            <div style={roleToggle(role === "driver")} onClick={() => setRole("driver")}>
              司机
            </div>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {tab === "find" && role === "rider" && (
          <>
            <div style={{ ...styles.card, marginTop: 2, padding: "20px" }}>
              <div style={styles.label}>路线</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 14, letterSpacing: "-0.02em" }}>搜索行程</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>出发地</div>
              <div
                className="cr-input-wrap"
                style={{
                  position: "relative",
                  marginBottom: 8,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  transition: "box-shadow 0.2s, border-color 0.2s",
                }}
              >
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.navy, display: "flex" }}>{Icons.pin}</span>
                <input
                  value={riderFrom}
                  onChange={(e) => setRiderFrom(e.target.value)}
                  style={{ ...styles.input, marginBottom: 0, border: "none", paddingLeft: 40 }}
                  placeholder="出发地（如：Foggy Bottom）"
                />
              </div>
              <button
                type="button"
                onClick={() => setMapPicker((p) => (p === "rider-from" ? null : "rider-from"))}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
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
              {mapPicker === "rider-from" && (
                <MapPickerPanel
                  lineColor={colors.navy}
                  onPick={(name) => {
                    setRiderFrom(name);
                    setMapPicker(null);
                  }}
                  onClose={() => setMapPicker(null)}
                />
              )}
              <div
                className="cr-input-wrap"
                style={{
                  position: "relative",
                  marginBottom: 10,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  transition: "box-shadow 0.2s, border-color 0.2s",
                }}
              >
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.navy, display: "flex" }}>{Icons.flag}</span>
                <input
                  value={riderTo}
                  onChange={(e) => setRiderTo(e.target.value)}
                  style={{ ...styles.input, marginBottom: 0, border: "none", paddingLeft: 40 }}
                  placeholder="目的地（如：Capitol Hill）"
                />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                <div
                  className="cr-input-wrap"
                  style={{ position: "relative", flex: 1, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white }}
                >
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.navy, display: "flex" }}>{Icons.clock}</span>
                  <input style={{ ...styles.input, marginBottom: 0, border: "none", width: "100%" }} placeholder="时间（如：9:00 AM）" />
                </div>
                <button type="button" style={{ ...styles.btn, width: "auto", minWidth: 96, padding: "14px 18px", marginBottom: 0, flexShrink: 0 }}>
                  搜索
                </button>
              </div>
            </div>

            <div style={styles.sectionTitle}>附近行程</div>
            <div style={styles.sectionHeadline}>共 {MOCK_RIDES.length} 条匹配</div>
            {MOCK_RIDES.map((ride) => (
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
                    <Avatar name={ride.driver} />
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
                  <Tag text={ride.time} />
                  <Tag text={`${ride.seats} 席`} />
                  <Tag text={`绕路 ${ride.detour}`} />
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "find" && role === "driver" && (
          <>
            <div style={styles.sectionTitle}>司机</div>
            <div style={styles.sectionHeadline}>顺路请求</div>
            <div style={{ ...styles.card, background: colors.white, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: colors.text, fontWeight: 600, marginBottom: 6 }}>匹配说明</div>
              <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.55, fontWeight: 400 }}>
                系统根据绕路距离推荐顺路乘客；接单后按实际绕路计费。
              </div>
            </div>
            {MOCK_REQUESTS.map((req) => (
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
                    <Avatar name={req.rider} />
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
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <Tag text={req.time} />
                  <Tag text={`绕路 ${req.detour}`} />
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
                  <Tag text={item.type} />
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
                  boxShadow: `0 4px 16px rgba(${PRIMARY_RGB}, 0.25)`,
                }}
              >
                T
              </div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Timon L.</div>
              <div style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>GWU · 2024级</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                <Tag text="已验证学生" />
                <StarRating rating={4.9} />
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
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>我的学校</div>
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>选择你所在的 DMV 地区院校；将影响推荐与匹配。</div>
              <label htmlFor="cr-school-select" style={{ ...styles.label, display: "block", marginBottom: 8 }}>
                学校
              </label>
              <select
                id="cr-school-select"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
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
                }}
              >
                <optgroup label="知名院校（快速选择）">
                  {DMV_SCHOOLS_NOTABLE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="更多 DMV 院校">
                  {DMV_SCHOOLS_OTHER.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </>
        )}
      </div>

      <div style={styles.navBar}>
        <NavItem icon={Icons.search} label="找拼车" id="find" />
        {role === "driver" && <NavItem icon={Icons.plus} label="发布" id="post" />}
        <NavItem icon={Icons.list} label="记录" id="history" />
        <NavItem icon={Icons.user} label="我的" id="profile" />
      </div>
    </div>
  );
}
