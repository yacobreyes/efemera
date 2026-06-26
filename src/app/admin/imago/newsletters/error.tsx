"use client";

export default function NewsletterEditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", fontFamily: "sans-serif" }}>
      <div style={{ background: "white", border: "1px solid #b8b8ba", borderRadius: 8, padding: "2rem", maxWidth: 480, width: "90%" }}>
        <h2 style={{ color: "#490000", marginTop: 0 }}>Something went wrong</h2>
        <p style={{ color: "#392a22", fontSize: "0.9rem" }}>{error.message || "An unexpected error occurred in the newsletter editor."}</p>
        {error.digest && <p style={{ color: "#aaa", fontSize: "0.75rem" }}>Error ID: {error.digest}</p>}
        <button onClick={reset} style={{ background: "#490000", color: "white", border: "none", borderRadius: 20, padding: "0.5rem 1.4rem", fontWeight: 600, cursor: "pointer" }}>
          Try again
        </button>
      </div>
    </div>
  );
}
