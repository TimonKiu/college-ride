import { useState, useRef } from "react";
import { TERMS_SECTIONS } from "./termsOfServiceContent.js";
import "../map.css";

const RIDER_PRIMARY = "#2563EB";
const FONT = "'Inter', system-ui, sans-serif";

export default function TermsOfServicePage({ lang, onBack }) {
  const content = TERMS_SECTIONS[lang] ?? TERMS_SECTIONS.en;
  const [exiting, setExiting] = useState(false);
  const layerRef = useRef(null);
  const finishedExitRef = useRef(false);

  function requestBack() {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      onBack();
      return;
    }
    finishedExitRef.current = false;
    setExiting(true);
  }

  function handleAnimationEnd(e) {
    if (e.target !== layerRef.current) return;
    if (!exiting) return;
    if (e.animationName !== "cr-stack-slide-out") return;
    if (finishedExitRef.current) return;
    finishedExitRef.current = true;
    onBack();
  }

  return (
    <div
      ref={layerRef}
      className={`cr-stack-layer${exiting ? " cr-stack-layer-exit" : ""}`}
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        fontFamily: FONT,
        minHeight: "100vh",
        background: "#f4f6f9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom))",
        boxSizing: "border-box",
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        <button
          type="button"
          onClick={requestBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: RIDER_PRIMARY,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          ← {lang === "zh" ? "返回" : "Back"}
        </button>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 28px rgba(15,23,42,0.08)",
            padding: "24px 22px 28px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.03em",
            }}
          >
            {content.title}
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: 12, color: "#64748b", fontWeight: 500 }}>{content.lastUpdated}</p>

          <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.65 }}>
            {content.sections.map((sec) => (
              <section key={sec.h} style={{ marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{sec.h}</h2>
                {sec.p.map((para, i) => (
                  <p key={i} style={{ margin: "0 0 10px" }}>
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
