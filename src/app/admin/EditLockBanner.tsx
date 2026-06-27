"use client";

import type { LockHolder } from "./lockActions";
import { CRIMSON } from "@/lib/palette";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// Sticky bar shown when someone else (or you, in another tab) holds the edit
// lock. Mirrors the newsroom-CMS pattern: tell the user, offer to take over.
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
  const isSelf = selfOtherTab;
  const message = isSelf
    ? "Heads up — you already have this open in another tab."
    : `${holder.name} is currently editing this.`;
  const action = isSelf ? "Start editing here" : "Take over";

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem",
      background: "#fff8e6", borderBottom: "1px solid #e7d9a8",
      padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.85rem", color: "#5c4a12",
    }}>
      <span>{message}</span>
      <button type="button" onClick={onTakeOver} style={{
        background: CRIMSON, color: "#fff", border: "none", borderRadius: 20,
        padding: "0.35rem 1rem", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
      }}>{action}</button>
    </div>
  );
}
