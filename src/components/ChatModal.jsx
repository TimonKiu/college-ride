import { useState, useEffect, useRef } from "react";
import { fetchMessages, sendMessage, subscribeToMessages } from "../api/messages.js";
import { shortPlaceName } from "../utils/scheduleUtils.js";

const SEND_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function ChatModal({ booking, userId, userName, colors, lang, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const otherName = userId === booking.driverId ? booking.passengerName : booking.driverName;
  const routeLabel = `${shortPlaceName(booking.from)} — ${shortPlaceName(booking.to)}`;

  // Load initial messages
  useEffect(() => {
    setLoading(true);
    fetchMessages(booking.id).then(({ data }) => {
      setMessages(data);
      setLoading(false);
    });
  }, [booking.id]);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToMessages(booking.id, (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [booking.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    const { data, error } = await sendMessage({ bookingId: booking.id, senderName: userName, body });
    if (!error && data) {
      setMessages((prev) => prev.find((m) => m.id === data.id) ? prev : [...prev, data]);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10200,
        display: "flex", flexDirection: "column",
        background: colors.page,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px 12px",
        borderBottom: `1px solid ${colors.border}`,
        background: colors.card,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: colors.text, padding: "4px 8px 4px 0", display: "flex", alignItems: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: colors.text, letterSpacing: "-0.01em" }}>
            {otherName}
          </div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {routeLabel}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 14px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {loading ? (
          <div style={{ textAlign: "center", color: colors.muted, fontSize: 13, marginTop: 40 }}>
            {lang === "zh" ? "加载中…" : "Loading…"}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", color: colors.muted, fontSize: 13, marginTop: 40, lineHeight: 1.6 }}>
            {lang === "zh" ? `向 ${otherName} 发一条消息吧` : `Say hello to ${otherName}`}
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === userId;
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                {!isMine && (
                  <div style={{ fontSize: 11, color: colors.muted, marginBottom: 3, marginLeft: 4 }}>{msg.senderName}</div>
                )}
                <div style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMine ? colors.navy : colors.card,
                  color: isMine ? "#ffffff" : colors.text,
                  fontSize: 14,
                  lineHeight: 1.5,
                  border: isMine ? "none" : `1px solid ${colors.border}`,
                  wordBreak: "break-word",
                }}>
                  {msg.body}
                </div>
                <div style={{ fontSize: 10, color: colors.muted, marginTop: 3, marginLeft: 4, marginRight: 4 }}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-end",
        padding: "10px 14px 16px",
        borderTop: `1px solid ${colors.border}`,
        background: colors.card,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === "zh" ? "发消息…" : "Message…"}
          rows={1}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 20,
            border: `1px solid ${colors.border}`,
            background: colors.page,
            color: colors.text,
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            maxHeight: 100,
            overflowY: "auto",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: 21,
            background: input.trim() ? colors.navy : colors.border,
            border: "none", cursor: input.trim() ? "pointer" : "default",
            color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.18s ease",
          }}
        >
          {SEND_ICON}
        </button>
      </div>
    </div>
  );
}
