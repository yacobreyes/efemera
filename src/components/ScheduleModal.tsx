"use client";

import { useState } from "react";

const CRIMSON = "#8B0000";
const BORDER = "#e1e8ed";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";
const FONT = "var(--font-inter), sans-serif";
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  label?: string;
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
    const time = sel.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const date = sel.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return `${time} on ${date}`;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 12, width: 480, maxWidth: "96vw", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem 0.9rem", borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1rem", color: TEXT_DARK }}>Schedule</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 0, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.1rem 1.4rem 1.4rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_DARK, margin: "0 0 0.65rem" }}>
            Are you sure you want to schedule this {label}?
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: TEXT_MUTED, margin: "0 0 1.1rem" }}>
            <strong style={{ color: TEXT_DARK }}>Send &amp; Publish at:</strong> {formatLabel()}
          </p>

          {/* Calendar + Time */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "flex-start" }}>

            {/* Calendar */}
            <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.65rem 0.5rem 0.5rem", minWidth: 0 }}>
              {/* Month nav */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
                <button type="button" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, display: "flex", alignItems: "center", justifyContent: "center", padding: "3px 6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: "0.85rem", color: TEXT_DARK }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                {/* Rounded-square next button — matches reference */}
                <button type="button" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }}
                  style={{ background: CRIMSON, border: "none", cursor: "pointer", color: "white", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <div key={i} style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600, color: TEXT_MUTED, paddingBottom: "0.2rem" }}>{d}</div>
                ))}
              </div>
              {/* Days */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
                {cells.map((day, i) => {
                  if (!day) return <div key={i} style={{ height: 30 }} />;
                  const isSelected = sel && day === sel.getDate() && calMonth === sel.getMonth() && calYear === sel.getFullYear();
                  const isToday = !isSelected && day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 30 }}>
                      <button type="button" onClick={() => pickDay(day)} style={{
                        fontFamily: FONT, fontSize: "0.78rem", width: 26, height: 26,
                        border: isToday ? `2px solid ${CRIMSON}` : "none",
                        borderRadius: "50%", cursor: "pointer", padding: 0,
                        background: isSelected ? CRIMSON : "transparent",
                        color: isSelected ? "white" : isToday ? CRIMSON : TEXT_DARK,
                        fontWeight: isSelected || isToday ? 700 : 400,
                      }}>
                        {day}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time picker — no surrounding border, matches reference */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", paddingTop: "1.5rem" }}>
              {/* Hour column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <button type="button" onClick={() => nudgeH(1)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "2px 8px" }}>▲</button>
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, width: 42, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 600, fontSize: "1.1rem", color: TEXT_DARK }}>
                  {String(dispH).padStart(2, "0")}
                </div>
                <button type="button" onClick={() => nudgeH(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "2px 8px" }}>▼</button>
              </div>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.3rem", color: TEXT_DARK, marginTop: 2, userSelect: "none" }}>:</span>
              {/* Minute column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <button type="button" onClick={() => nudgeM(1)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "2px 8px" }}>▲</button>
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, width: 42, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 600, fontSize: "1.1rem", color: TEXT_DARK }}>
                  {dispM}
                </div>
                <button type="button" onClick={() => nudgeM(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "2px 8px" }}>▼</button>
              </div>
              {/* AM/PM */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginLeft: "0.5rem" }}>
                {(["AM","PM"] as const).map(p => (
                  <label key={p} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontFamily: FONT, fontSize: "0.83rem", color: TEXT_DARK, userSelect: "none" }}>
                    <input type="radio" name="schedule-ampm" checked={(p === "PM") === isPm} onChange={toggleAmPm} style={{ accentColor: CRIMSON, margin: 0, width: 15, height: 15 }} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem" }}>
            <button type="button" onClick={onClose} style={{ fontFamily: FONT, fontSize: "0.87rem", fontWeight: 600, padding: "0.5rem 1.4rem", border: `1.5px solid ${BORDER}`, borderRadius: 24, background: "white", color: TEXT_DARK, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="button" disabled={!value || disabled} onClick={onConfirm} style={{ fontFamily: FONT, fontSize: "0.87rem", fontWeight: 600, padding: "0.5rem 1.4rem", border: "none", borderRadius: 24, background: CRIMSON, color: "white", cursor: value && !disabled ? "pointer" : "default", opacity: value && !disabled ? 1 : 0.5 }}>
              Yes, schedule it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
