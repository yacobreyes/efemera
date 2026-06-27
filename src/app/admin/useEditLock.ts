"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { claimLock, heartbeatLock, releaseLock, type LockHolder, type LockState } from "./lockActions";

export type LockStatus = "loading" | "held" | "locked";

const HEARTBEAT_MS = 7_000;

// Unique per tab. Falls back to a random string if crypto.randomUUID is
// unavailable — otherwise two tabs could share an empty id and be mistaken for
// the same session (so no lock conflict, no banner).
function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* fall through */ }
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Claims an edit lock for a document and keeps it alive while this editor is
// open. If another session holds it, status becomes "locked" with the holder's
// info; takeOver() seizes it. Releases on unmount. The same user in a second
// tab gets a different sessionId, so it surfaces as "open in another tab."
export function useEditLock(targetId: string | null) {
  const sessionRef = useRef<string>("");
  if (!sessionRef.current) sessionRef.current = newSessionId();
  const [status, setStatus] = useState<LockStatus>("loading");
  const [holder, setHolder] = useState<LockHolder | null>(null);
  const [selfOtherTab, setSelfOtherTab] = useState(false);
  const statusRef = useRef<LockStatus>("loading");

  const apply = useCallback((s: LockState) => {
    const next: LockStatus = s.held ? "held" : "locked";
    statusRef.current = next;
    setStatus(next);
    setHolder(s.holder);
    setSelfOtherTab(!!s.selfOtherTab);
  }, []);

  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    const sid = sessionRef.current;

    claimLock(targetId, sid, new Date().toISOString()).then(s => alive && apply(s)).catch(() => {});

    const iv = setInterval(async () => {
      if (!alive) return;
      try {
        const now = new Date().toISOString();
        // Held → keep alive. Locked → keep trying to acquire (auto-takes over
        // once the other session releases or its lock goes stale).
        const s = statusRef.current === "held"
          ? await heartbeatLock(targetId, sid, now)
          : await claimLock(targetId, sid, now);
        if (alive) apply(s);
      } catch { /* transient network — retry next tick */ }
    }, HEARTBEAT_MS);

    // Release reliably even on a hard navigation/tab close: sendBeacon survives
    // page unload, where the async releaseLock() call would be cut off.
    const beaconRelease = () => {
      try {
        const blob = new Blob([JSON.stringify({ targetId, sessionId: sid })], { type: "application/json" });
        navigator.sendBeacon("/api/admin/release-lock", blob);
      } catch { /* ignore */ }
    };
    window.addEventListener("pagehide", beaconRelease);

    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener("pagehide", beaconRelease);
      beaconRelease();
      releaseLock(targetId, sid).catch(() => {});
    };
  }, [targetId, apply]);

  const takeOver = useCallback(() => {
    if (!targetId) return;
    claimLock(targetId, sessionRef.current, new Date().toISOString(), true).then(apply).catch(() => {});
  }, [targetId, apply]);

  // Explicitly drop the lock — call before navigating away on an exit button so
  // presence clears immediately instead of waiting for the beacon/TTL.
  const release = useCallback(async () => {
    if (!targetId) return;
    try { await releaseLock(targetId, sessionRef.current); } catch { /* ignore */ }
  }, [targetId]);

  return { status, holder, selfOtherTab, takeOver, release, readOnly: status === "locked" };
}
