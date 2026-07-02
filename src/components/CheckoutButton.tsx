"use client";

import { useState } from "react";

export default function CheckoutButton({
  kind,
  item,
  className,
  children,
}: {
  kind: "subscription" | "merch";
  item: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, item }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout is unavailable right now.");
        setLoading(false);
      }
    } catch {
      setError("Checkout is unavailable right now.");
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick} disabled={loading} style={{ background: "none", border: "none", cursor: loading ? "default" : "pointer", padding: 0, opacity: loading ? 0.6 : 1 }}>
        {loading ? "Loading…" : children}
      </button>
      {error && <p style={{ fontFamily: "var(--font-subhead)", fontSize: 12, color: "#490000", margin: "6px 0 0" }}>{error}</p>}
    </>
  );
}
