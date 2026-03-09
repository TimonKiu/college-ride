import { useState } from "react";

const SCHOOLS = ["George Washington University", "Georgetown University", "American University", "Howard University", "Johns Hopkins University"];

const MOCK_RIDES = [
  { id: 1, driver: "Alex K.", school: "GWU", from: "Foggy Bottom", to: "Capitol Hill", time: "8:30 AM", seats: 2, price: 4.5, detour: "5 min", rating: 4.9 },
  { id: 2, driver: "Maya S.", school: "Georgetown", from: "Georgetown", to: "Dupont Circle", time: "9:00 AM", seats: 3, price: 3.0, detour: "3 min", rating: 4.8 },
  { id: 3, driver: "Jordan T.", school: "American U", from: "Tenleytown", to: "Downtown DC", time: "9:15 AM", seats: 1, price: 5.5, detour: "8 min", rating: 4.7 },
  { id: 4, driver: "Priya M.", school: "Howard", from: "Shaw", to: "Navy Yard", time: "10:00 AM", seats: 2, price: 4.0, detour: "6 min", rating: 5.0 },
];

const MOCK_REQUESTS = [
  { id: 1, rider: "Sam L.", school: "GWU", from: "Foggy Bottom", to: "Georgetown", time: "9:00 AM", earn: "+$3.80", detour: "4 min" },
  { id: 2, rider: "Lena W.", school: "Georgetown", from: "Dupont Circle", to: "Capitol Hill", time: "8:45 AM", earn: "+$5.20", detour: "7 min" },
];

const Avatar = ({ name, color }) => {
  const colors = { blue: "#3B82F6", green: "#10B981", amber: "#F59E0B", purple: "#8B5CF6", pink: "#EC4899" };
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: colors[color] || "#3B82F6",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
      fontFamily: "'Syne', sans-serif"
    }}>
      {name.charAt(0)}
    </div>
  );
};

const StarRating = ({ rating }) => (
  <span style={{ color: "#F59E0B", fontSize: 12, fontWeight: 600 }}>★ {rating}</span>
);

const Tag = ({ text, color = "#E0F2FE", textColor = "#0369A1" }) => (
  <span style={{
    background: color, color: textColor,
    fontSize: 10, fontWeight: 700, padding: "2px 8px",
    borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase"
  }}>{text}</span>
);

export default function CollegeRide() {
  const [tab, setTab] = useState("find");
  const [screen, setScreen] = useState("home"); // home | find | offer | profile | confirm
  const [selectedRide, setSelectedRide] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [school, setSchool] = useState("George Washington University");
  const [role, setRole] = useState("rider");

  const colors = {
    bg: "#F8F7F4",
    card: "#FFFFFF",
    primary: "#1A1A2E",
    accent: "#E63946",
    accentLight: "#FFF0F1",
    green: "#10B981",
    greenLight: "#ECFDF5",
    text: "#1A1A2E",
    muted: "#9CA3AF",
    border: "#F0EEE8",
  };

  const styles = {
    app: {
      fontFamily: "'DM Sans', sans-serif",
      background: colors.bg,
      minHeight: "100vh",
      maxWidth: 430,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      background: colors.primary,
      padding: "20px 20px 16px",
      color: "#fff",
    },
    logo: {
      fontFamily: "'Syne', sans-serif",
      fontWeight: 800,
      fontSize: 22,
      letterSpacing: "-0.5px",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    logoAccent: { color: colors.accent },
    schoolBadge: {
      marginTop: 8,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: "4px 12px",
      fontSize: 12,
      color: "#E5E7EB",
      fontWeight: 500,
    },
    content: {
      flex: 1,
      overflowY: "auto",
      padding: "16px 16px 80px",
    },
    card: {
      background: colors.card,
      borderRadius: 16,
      padding: "16px",
      marginBottom: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      border: `1px solid ${colors.border}`,
    },
    rideCard: {
      background: colors.card,
      borderRadius: 16,
      padding: "16px",
      marginBottom: 12,
      border: `1px solid ${colors.border}`,
      cursor: "pointer",
      transition: "transform 0.15s, box-shadow 0.15s",
    },
    btn: {
      background: colors.accent,
      color: "#fff",
      border: "none",
      borderRadius: 12,
      padding: "12px 20px",
      fontWeight: 700,
      fontSize: 15,
      fontFamily: "'Syne', sans-serif",
      cursor: "pointer",
      width: "100%",
    },
    btnOutline: {
      background: "transparent",
      color: colors.primary,
      border: `2px solid ${colors.border}`,
      borderRadius: 12,
      padding: "10px 20px",
      fontWeight: 600,
      fontSize: 14,
      fontFamily: "'DM Sans', sans-serif",
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
      background: "#fff",
      borderTop: `1px solid ${colors.border}`,
      display: "flex",
      justifyContent: "space-around",
      padding: "10px 0 14px",
      zIndex: 100,
    },
    navItem: (active) => ({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      cursor: "pointer",
      color: active ? colors.accent : colors.muted,
      fontSize: 10,
      fontWeight: active ? 700 : 500,
      transition: "color 0.2s",
    }),
    sectionTitle: {
      fontFamily: "'Syne', sans-serif",
      fontSize: 18,
      fontWeight: 800,
      color: colors.text,
      margin: "16px 0 12px",
      letterSpacing: "-0.3px",
    },
    routeRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      margin: "8px 0",
    },
    routeDot: (accent) => ({
      width: 8, height: 8, borderRadius: "50%",
      background: accent ? colors.accent : colors.green,
      flexShrink: 0,
    }),
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 12,
      border: `1.5px solid ${colors.border}`,
      fontSize: 14,
      fontFamily: "'DM Sans', sans-serif",
      background: "#FAFAF8",
      color: colors.text,
      outline: "none",
      boxSizing: "border-box",
      marginBottom: 10,
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: colors.muted,
      marginBottom: 4,
    },
  };

  // Nav icons
  const NavIcon = ({ icon, label, id }) => (
    <div style={styles.navItem(tab === id)} onClick={() => setTab(id)}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );

  // Confirm Screen
  if (confirmed && selectedRide) {
    return (
      <div style={{ ...styles.app, background: colors.primary }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🚗</div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", color: "#fff", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>你已上车！</h2>
          <p style={{ color: "#9CA3AF", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            {selectedRide.driver} 将于 <strong style={{ color: "#fff" }}>{selectedRide.time}</strong> 接你<br />
            从 <strong style={{ color: colors.accent }}>{selectedRide.from}</strong> → <strong style={{ color: "#10B981" }}>{selectedRide.to}</strong>
          </p>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 28px", marginBottom: 32, width: "100%" }}>
            <div style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>预计费用</div>
            <div style={{ color: "#fff", fontSize: 36, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>${selectedRide.price.toFixed(2)}</div>
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>比 Uber 便宜约 40%</div>
          </div>
          <button style={{ ...styles.btn, background: colors.accent }} onClick={() => { setConfirmed(false); setSelectedRide(null); setTab("find"); }}>
            返回主页
          </button>
        </div>
      </div>
    );
  }

  // Ride detail screen
  if (selectedRide && !confirmed) {
    return (
      <div style={styles.app}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ cursor: "pointer", fontSize: 20 }} onClick={() => setSelectedRide(null)}>←</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18 }}>行程详情</span>
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Avatar name={selectedRide.driver} color="blue" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: colors.text }}>{selectedRide.driver}</div>
                <div style={{ fontSize: 12, color: colors.muted }}>{selectedRide.school} · <StarRating rating={selectedRide.rating} /></div>
              </div>
              <Tag text="已验证" color="#ECFDF5" textColor="#059669" />
            </div>
            <div style={{ height: 1, background: colors.border, margin: "0 0 16px" }} />
            <div style={styles.routeRow}>
              <div style={styles.routeDot(true)} />
              <div>
                <div style={{ fontSize: 12, color: colors.muted }}>出发地</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedRide.from}</div>
              </div>
            </div>
            <div style={{ width: 1, height: 20, background: colors.border, marginLeft: 4, marginBottom: 4 }} />
            <div style={styles.routeRow}>
              <div style={styles.routeDot(false)} />
              <div>
                <div style={{ fontSize: 12, color: colors.muted }}>目的地</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedRide.to}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "出发时间", value: selectedRide.time, icon: "🕐" },
              { label: "剩余座位", value: `${selectedRide.seats} 个`, icon: "💺" },
              { label: "绕路时间", value: selectedRide.detour, icon: "🗺️" },
            ].map(item => (
              <div key={item.label} style={{ ...styles.card, textAlign: "center", marginBottom: 0, padding: "14px 10px" }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>{item.value}</div>
                <div style={{ fontSize: 11, color: colors.muted }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.card, background: colors.accentLight, border: `1px solid #FECDD3` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>你需要支付</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: colors.accent }}>${selectedRide.price.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: colors.muted }}>平台抽成 10%（含服务费）</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: colors.muted }}>Uber 同路线约</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#9CA3AF", textDecoration: "line-through" }}>$8.50</div>
                <Tag text="省 47%" color={colors.accentLight} textColor={colors.accent} />
              </div>
            </div>
          </div>

          <button style={{ ...styles.btn, marginTop: 8 }} onClick={() => setConfirmed(true)}>
            确认拼车 →
          </button>
          <button style={{ ...styles.btnOutline, marginTop: 10 }} onClick={() => setSelectedRide(null)}>
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={styles.logo}>
              <span>🚗</span>
              <span>College<span style={styles.logoAccent}>Ride</span></span>
            </div>
            <div style={styles.schoolBadge}>
              🎓 {school.split(" ").slice(0, 2).join(" ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <div style={{
              background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 12px",
              fontSize: 12, color: "#E5E7EB", cursor: "pointer",
              border: role === "rider" ? "1.5px solid rgba(255,255,255,0.4)" : "1.5px solid transparent"
            }} onClick={() => setRole("rider")}>乘客</div>
            <div style={{
              background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 12px",
              fontSize: 12, color: "#E5E7EB", cursor: "pointer",
              border: role === "driver" ? "1.5px solid rgba(255,255,255,0.4)" : "1.5px solid transparent"
            }} onClick={() => setRole("driver")}>司机</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>

        {tab === "find" && role === "rider" && (
          <>
            {/* Search Bar */}
            <div style={{ ...styles.card, marginTop: 4 }}>
              <div style={styles.label}>我要去哪里？</div>
              <input style={styles.input} placeholder="出发地（如：Foggy Bottom）" />
              <input style={styles.input} placeholder="目的地（如：Capitol Hill）" />
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="时间（如：9:00 AM）" />
                <button style={{ ...styles.btn, width: "auto", padding: "12px 20px", marginBottom: 0 }}>搜索</button>
              </div>
            </div>

            {/* Available Rides */}
            <div style={styles.sectionTitle}>附近的行程 {MOCK_RIDES.length}</div>
            {MOCK_RIDES.map((ride) => (
              <div
                key={ride.id}
                style={styles.rideCard}
                onClick={() => setSelectedRide(ride)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={ride.driver} color={["blue", "green", "amber", "purple"][ride.id % 4]} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>{ride.driver}</div>
                      <div style={{ fontSize: 12, color: colors.muted }}>{ride.school} · <StarRating rating={ride.rating} /></div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: colors.accent }}>${ride.price.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: colors.muted }}>/ 人</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={styles.routeDot(true)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{ride.from}</span>
                  <span style={{ color: colors.muted, fontSize: 12 }}>→</span>
                  <div style={styles.routeDot(false)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{ride.to}</span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Tag text={`${ride.time}`} color="#F0F9FF" textColor="#0369A1" />
                  <Tag text={`${ride.seats}席`} color="#F0FDF4" textColor="#15803D" />
                  <Tag text={`绕路${ride.detour}`} color="#FFF7ED" textColor="#C2410C" />
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "find" && role === "driver" && (
          <>
            <div style={styles.sectionTitle}>附近的乘车请求</div>
            <div style={{ ...styles.card, background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#065F46", fontWeight: 500, lineHeight: 1.5 }}>
                💡 系统会自动计算绕路距离，推荐顺路的乘客。接单后按实际绕路距离收费。
              </div>
            </div>
            {MOCK_REQUESTS.map((req) => (
              <div key={req.id} style={styles.rideCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={req.rider} color="pink" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{req.rider}</div>
                      <div style={{ fontSize: 12, color: colors.muted }}>{req.school}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: colors.green }}>{req.earn}</div>
                    <div style={{ fontSize: 11, color: colors.muted }}>预计收益</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={styles.routeDot(true)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{req.from}</span>
                  <span style={{ color: colors.muted }}>→</span>
                  <div style={styles.routeDot(false)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{req.to}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <Tag text={req.time} color="#F0F9FF" textColor="#0369A1" />
                  <Tag text={`绕路 ${req.detour}`} color="#FFF7ED" textColor="#C2410C" />
                </div>
                <button style={{ ...styles.btn, padding: "10px", fontSize: 14 }}>接受这单</button>
              </div>
            ))}
          </>
        )}

        {tab === "post" && (
          <>
            <div style={styles.sectionTitle}>发布行程</div>
            <div style={styles.card}>
              <div style={styles.label}>你的路线</div>
              <input style={styles.input} placeholder="出发地" />
              <input style={styles.input} placeholder="目的地" />

              <div style={styles.label}>出发时间</div>
              <input style={styles.input} placeholder="如：8:30 AM" />

              <div style={styles.label}>空余座位数</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[1, 2, 3, 4].map(n => (
                  <div key={n} style={{
                    flex: 1, textAlign: "center", padding: "10px 0",
                    borderRadius: 10, border: `2px solid ${n === 2 ? colors.accent : colors.border}`,
                    fontWeight: 700, cursor: "pointer", fontSize: 16,
                    color: n === 2 ? colors.accent : colors.muted
                  }}>{n}</div>
                ))}
              </div>

              <div style={styles.label}>收费方式</div>
              <div style={{ ...styles.card, background: colors.accentLight, border: `1px solid #FECDD3`, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: colors.accent, fontWeight: 600 }}>
                  ✨ 平台自动计算
                </div>
                <div style={{ fontSize: 12, color: "#9F1239", marginTop: 4 }}>
                  按绕路距离百分比收费，保证公平合理。平台收取 10% 服务费。
                </div>
              </div>

              <button style={styles.btn}>发布行程</button>
            </div>
          </>
        )}

        {tab === "history" && (
          <>
            <div style={styles.sectionTitle}>行程记录</div>
            {[
              { date: "今天", from: "Foggy Bottom", to: "Capitol Hill", cost: "$4.50", type: "乘客", driver: "Alex K." },
              { date: "昨天", from: "Georgetown", to: "Dupont Circle", cost: "$3.00", type: "乘客", driver: "Maya S." },
              { date: "3月5日", from: "Tenleytown", to: "Downtown DC", cost: "+$6.20", type: "司机", driver: "你" },
            ].map((item, i) => (
              <div key={i} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: colors.muted }}>{item.date}</div>
                  <Tag
                    text={item.type}
                    color={item.type === "司机" ? colors.greenLight : colors.accentLight}
                    textColor={item.type === "司机" ? "#059669" : colors.accent}
                  />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {item.from} → {item.to}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: colors.muted }}>{item.type === "乘客" ? `司机：${item.driver}` : "你开车"}</span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: item.type === "司机" ? colors.green : colors.text }}>{item.cost}</span>
                </div>
              </div>
            ))}
            <div style={{ ...styles.card, background: colors.primary, textAlign: "center" }}>
              <div style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 4 }}>本月合计节省</div>
              <div style={{ fontFamily: "'Syne', sans-serif", color: "#fff", fontSize: 32, fontWeight: 800 }}>$24.50</div>
              <div style={{ color: "#6B7280", fontSize: 12 }}>相比 Uber 节省约 42%</div>
            </div>
          </>
        )}

        {tab === "profile" && (
          <>
            <div style={styles.sectionTitle}>个人资料</div>
            <div style={{ ...styles.card, textAlign: "center", padding: "28px 20px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: colors.accent, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 28, margin: "0 auto 12px",
                fontFamily: "'Syne', sans-serif"
              }}>T</div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Timon L.</div>
              <div style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>GWU · 2024级</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Tag text="已验证学生" color="#ECFDF5" textColor="#059669" />
                <StarRating rating={4.9} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { label: "总行程", value: "12次" },
                { label: "节省金额", value: "$67.20" },
                { label: "司机收入", value: "$18.60" },
                { label: "减碳量", value: "23 kg CO₂" },
              ].map(item => (
                <div key={item.label} style={{ ...styles.card, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: colors.text }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: colors.muted }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>我的学校</div>
              {SCHOOLS.map(s => (
                <div key={s}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${colors.border}`, cursor: "pointer" }}
                  onClick={() => setSchool(s)}
                >
                  <span style={{ fontSize: 13, color: s === school ? colors.accent : colors.text, fontWeight: s === school ? 700 : 400 }}>{s}</span>
                  {s === school && <span style={{ color: colors.accent, fontWeight: 700 }}>✓</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Nav Bar */}
      <div style={styles.navBar}>
        <NavIcon icon="🔍" label="找拼车" id="find" />
        <NavIcon icon="➕" label="发布" id="post" />
        <NavIcon icon="📋" label="记录" id="history" />
        <NavIcon icon="👤" label="我的" id="profile" />
      </div>
    </div>
  );
}
