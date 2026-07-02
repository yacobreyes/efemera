"use client";

import { useState } from "react";

// Inline email signup for the crimson band on /issues. Posts to the same
// /api/subscribe endpoint used by the SubscribeButton popup.
export default function IssueSignupForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

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
    <div className="issue-signup">
      <style>{`
        .issue-signup form { display: flex; align-items: stretch; gap: 18px; }
        .issue-signup input {
          background: transparent;
          color: #ffffff;
          border: 0;
          border-bottom: 1.5px solid #ffffff;
          border-radius: 0;
          padding: 0 4px;
          font-family: var(--font-subhead);
          font-size: 14px;
          min-width: 230px;
          height: 44px;
          outline: none;
          box-sizing: border-box;
        }
        .issue-signup input::placeholder { color: rgba(255,255,255,.85); }
        .issue-signup button {
          display: flex;
          align-items: center;
          background: none;
          border: 0;
          padding: 0;
          color: #ffffff;
          font-family: var(--font-subhead);
          font-weight: 700;
          font-size: 11px;
          letter-spacing: .16em;
          text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 4px;
          cursor: pointer;
        }
        .issue-signup .signup-done {
          margin: 0;
          font-family: var(--font-headline);
          font-size: 19px;
          font-style: italic;
          color: #ffffff;
        }
        .issue-signup .signup-error {
          margin: 8px 0 0;
          font-family: var(--font-subhead);
          font-size: 13px;
          color: #ffffff;
          opacity: .9;
        }
        @media (max-width: 900px) {
          .issue-signup input { min-width: 0; flex: 1; }
          .issue-signup form { width: 100%; }
        }
      `}</style>
      {status === "done" ? (
        <p className="signup-done">{msg}</p>
      ) : (
        <form onSubmit={submit}>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" aria-label="Email address"
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "…" : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" && <p className="signup-error">{msg}</p>}
    </div>
  );
}
