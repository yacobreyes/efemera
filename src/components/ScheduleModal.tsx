"use client";

import { useState } from "react";

const CRIMSON = "#8B0000";
const BORDER = "#e1e8ed";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";
const FONT = "var(--font-inter), sans-serif";
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Props {
  value: string; // YYYY-MM-DDTHH:mm
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  label?: string; // "story" | "newsletter"
  disabled?: boolean;
}

export default function ScheduleModal({ value, onChange, onConfirm, onClose, label = "story", disabled }: Props) {
  const now = new Date();
  const sel = value ? new Date(value) : null;

  const [calYear, setCalYear] = useState(() => (sel ?? now).getFullYear());
  const [calMonth, setCalMonth] = useState(() => (sel ?? now).getMonth());

  const rawH = sel ? sel.getHours() : now.getHours();
  const rawM = sel ? sel.getMinutes() : now.getMinutes();
  const isPm = rawH >= 12;
  const dispH = rawH % 12 === 0 ? 12 : rawH % 12;
  const dispM = String(rawM).padStart(2, "0");

  const pad = (n: number) => String(n).padStart(2, "0");
  const buildVal = (year: number, month: number, day: number, h24: number, m: number) => {
    const d = new Date(year, month, day, h24, m);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const baseY = sel ? sel.getFullYear() : now.getFullYear();
  const baseM = sel ? sel.getMonth() : now.getMonth();
  const baseD = sel ? sel.getDate() : now.getDate();

  const nudgeH = (d: number) => onChange(buildVal(baseY, baseM, baseD, (rawH + d + 24) % 24, rawM));
  const nudgeM = (d: number) => onChange(buildVal(baseY, baseM, baseD, rawH, (rawM + d + 60) % 60));
  const toggleAmPm = () => onChange(buildVal(baseY, baseM, baseD, isPm ? rawH - 12 : rawH + 12, rawM));
  const pickDay = (day: number) => onChange(buildVal(calYear, calMonth, day, rawH, rawM));

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const formatLabel = () => {
    if (!sel) return "—";
    const time = sel.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    const date = sel.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return `${time} on ${date}`;
  };

  const spinBtn = (content: string, onClick: () => void) => (
    <button type="button" onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, fontSize: "0.7rem", lineHeight: 1, padding: "2px 4px", display: "block" }}>{content}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 12, padding: "1.75rem", width: 520, maxWidth: "96vw", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem" }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.1rem", color: TEXT_DARK }}>Schedule</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, lineHeight: 1, padding: "0.2rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.92rem", color: TEXT_DARK, margin: "0 0 0.4rem", fontWeight: 500 }}>
          Are you sure you want to schedule this {label}?
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: TEXT_MUTED, margin: "0 0 1.4rem" }}>
          <strong style={{ color: TEXT_DARK }}>Send &amp; Publish at:</strong> {formatLabel()}
        </p>

        {/* Calendar + Time */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "flex-start" }}>

          {/* Calendar */}
          <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.9rem", minWidth: 0 }}>
            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <button type="button" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: "0.87rem", color: TEXT_DARK }}>{MONTH_NAMES[calMonth]} {calYear}</span>
              <button type="button" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }}
                style={{ background: CRIMSON, border: "none", cursor: "pointer", color: "white", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", marginBottom: "0.2rem" }}>
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <span key={i} style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600, color: TEXT_MUTED, padding: "0.1rem 0" }}>{d}</span>
              ))}
            </div>
            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", gap: "1px" }}>
              {cells.map((day, i) => {
                if (!day) return <span key={i} />;
                const isSelected = sel && day === sel.getDate() && calMonth === sel.getMonth() && calYear === sel.getFullYear();
                const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear() && !isSelected;
                return (
                  <button key={i} type="button" onClick={() => pickDay(day)} style={{
                    fontFamily: FONT, fontSize: "0.8rem", padding: "0.28rem 0", border: isToday ? `2px solid ${CRIMSON}` : "2px solid transparent",
                    borderRadius: "50%", cursor: "pointer", margin: "1px",
                    background: isSelected ? CRIMSON : "none",
                    color: isSelected ? "white" : isToday ? CRIMSON : TEXT_DARK,
                    fontWeight: isToday || isSelected ? 700 : 400,
                    aspectRatio: "1",
                  }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time picker */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
            {/* Hour */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {spinBtn("▲", () => nudgeH(1))}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0.35rem 0.6rem", fontFamily: FONT, fontWeight: 600, fontSize: "1.2rem", color: TEXT_DARK, minWidth: 42, textAlign: "center", margin: "3px 0" }}>
                {String(dispH).padStart(2, "0")}
              </div>
              {spinBtn("▼", () => nudgeH(-1))}
            </div>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.3rem", color: TEXT_DARK, marginBottom: 2 }}>:</span>
            {/* Minute */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {spinBtn("▲", () => nudgeM(1))}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0.35rem 0.6rem", fontFamily: FONT, fontWeight: 600, fontSize: "1.2rem", color: TEXT_DARK, minWidth: 42, textAlign: "center", margin: "3px 0" }}>
                {dispM}
              </div>
              {spinBtn("▼", () => nudgeM(-1))}
            </div>
            {/* AM/PM */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginLeft: "0.3rem" }}>
              {(["AM","PM"] as const).map(p => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", fontFamily: FONT, fontSize: "0.83rem", color: TEXT_DARK, userSelect: "none" }}>
                  <input type="radio" name="schedule-ampm" checked={(p === "PM") === isPm} onChange={toggleAmPm} style={{ accentColor: CRIMSON, margin: 0 }} />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button type="button" onClick={onClose} style={{ fontFamily: FONT, fontSize: "0.87rem", fontWeight: 600, padding: "0.55rem 1.4rem", border: `1.5px solid ${BORDER}`, borderRadius: 24, background: "white", color: TEXT_DARK, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" disabled={!value || disabled} onClick={onConfirm} style={{ fontFamily: FONT, fontSize: "0.87rem", fontWeight: 600, padding: "0.55rem 1.4rem", border: "none", borderRadius: 24, background: CRIMSON, color: "white", cursor: value && !disabled ? "pointer" : "default", opacity: value && !disabled ? 1 : 0.5 }}>
            Yes, schedule it
          </button>
        </div>
      </div>
    </div>
  );
}
