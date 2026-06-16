"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading"); setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setStatus("done"); setMessage("You're on the list."); setEmail(""); }
      else { setStatus("error"); setMessage(data.error || "Something went wrong."); }
    } catch {
      setStatus("error"); setMessage("Something went wrong.");
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "0.78rem", color: "white", margin: "0 0 0.6rem", letterSpacing: "0.04em", opacity: 0.95 }}>
        Get new stories in your inbox.
      </p>
      {status === "done" ? (
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "0.8rem", color: "white", margin: 0, fontWeight: 600 }}>{message}</p>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-inter), sans-serif", fontSize: "0.85rem", padding: "0.5rem 0.7rem", border: "none", borderRadius: 4, outline: "none", color: "#1c2938", background: "white" }}
          />
          <button type="submit" disabled={status === "loading"}
            style={{ background: "white", color: "#8B0000", border: "none", borderRadius: 4, padding: "0.5rem 0.9rem", fontFamily: "var(--font-inter), sans-serif", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: status === "loading" ? 0.6 : 1 }}>
            {status === "loading" ? "…" : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" && <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "0.72rem", color: "white", margin: "0.5rem 0 0", opacity: 0.9 }}>{message}</p>}
    </div>
  );
}
