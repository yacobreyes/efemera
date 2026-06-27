"use client";

import type { LockHolder } from "./lockActions";
import { CRIMSON, BORDER, TEXT_DARK } from "@/lib/palette";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// Fixed bottom bar shown when someone else — or you, in another tab — holds the
// edit lock. Mirrors the newsroom-CMS pattern: tell the user, offer to take over.
export default function EditLockBanner({
  holder,
  selfOtherTab = false,
  onTakeOver,
}: {
  holder: LockHolder | null;
  selfOtherTab?: boolean;
  onTakeOver: () => void;
}) {
  if (!holder) return null;
  const message = selfOtherTab
    ? "Heads up! Looks like you already have this open in another tab."
    : `${holder.name} is currently editing this. Do you want to take over?`;
  const action = selfOtherTab ? "Start editing here" : "Take over";

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 400,
      display: "flex", alignItems: "center", justifyContent: "center", gap: "1.25rem",
      background: "#ffffff", borderTop: `1px solid ${BORDER}`,
      boxShadow: "0 -2px 16px rgba(0,0,0,0.08)",
      padding: "0.85rem 1.25rem",
      fontFamily: FONT, fontSize: "0.9rem", color: TEXT_DARK,
    }}>
      <span>{message}</span>
      <button type="button" onClick={onTakeOver} style={{
        background: CRIMSON, color: "#fff", border: "none", borderRadius: 22,
        padding: "0.5rem 1.25rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600,
        cursor: "pointer", whiteSpace: "nowrap",
      }}>{action}</button>
    </div>
  );
}
