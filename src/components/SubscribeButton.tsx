"use client";

import { useEffect, useState } from "react";

export default function SubscribeButton({
  className,
  children = "Subscribe",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading"); setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setStatus("done"); setMsg("You're on the list."); setEmail(""); }
      else { setStatus("error"); setMsg(data.error || "Something went wrong."); }
    } catch {
      setStatus("error"); setMsg("Something went wrong.");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9500,
            background: "rgba(18,14,11,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1.25rem",
          }}
        >
          <style>{`@keyframes subUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }`}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%", maxWidth: 440,
              background: "#8e0d0d",
              color: "#fbf6ee",
              borderRadius: 4,
              padding: "44px 36px 38px",
              textAlign: "center",
              boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
              animation: "subUp .28s ease",
            }}
          >
            <button
              type="button" aria-label="Close" onClick={() => setOpen(false)}
              style={{
                position: "absolute", top: 12, right: 14,
                background: "none", border: "none", color: "#fbf6ee",
                fontSize: 26, lineHeight: 1, cursor: "pointer", opacity: .8, padding: 4,
              }}
            >×</button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Cream Mayfly.png" alt="" style={{ height: 52, width: "auto", opacity: .9, marginBottom: 22 }} />

            <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", opacity: .75, marginBottom: 16 }}>
              The Chapbook
            </div>
            <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 36, lineHeight: 1.05, letterSpacing: "-.02em", margin: "0 0 16px" }}>
              Join the Collective.
            </h2>
            <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 19, fontStyle: "italic", lineHeight: 1.5, opacity: .9, margin: "0 0 28px" }}>
              Subscribe to read our monthly chapbook in your inbox.
            </p>

            {status === "done" ? (
              <p style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 24, fontStyle: "italic", margin: 0 }}>{msg}</p>
            ) : (
              <form onSubmit={submit} style={{ display: "flex", gap: 10, width: "100%" }}>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoComplete="email"
                  style={{ flex: 1, minWidth: 0, fontFamily: "Inter, system-ui, sans-serif", fontSize: 15, padding: "13px 16px", border: "none", borderRadius: 2, outline: "none", background: "#fbf6ee", color: "#171412" }}
                />
                <button
                  type="submit" disabled={status === "loading"}
                  style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", background: "#171412", color: "#fbf6ee", border: "none", borderRadius: 2, padding: "0 22px", cursor: "pointer", whiteSpace: "nowrap", opacity: status === "loading" ? .6 : 1 }}
                >
                  {status === "loading" ? "…" : "Join"}
                </button>
              </form>
            )}
            {status === "error" && <p style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, margin: "12px 0 0", opacity: .9 }}>{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
