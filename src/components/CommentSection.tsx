"use client";

import { useEffect, useRef, useState } from "react";

interface Comment { id: number; name: string; text: string; }

export default function CommentSection({ slug }: { slug: string }) {
  const storageKey = `efemera_comments_${slug}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setComments(JSON.parse(stored));
      const savedName = localStorage.getItem("efemera_commenter_name");
      if (savedName) setName(savedName);
    } catch { /* ignore */ }
  }, [storageKey]);

  function submit() {
    if (!text.trim() || !name.trim()) return;
    const next = [...comments, { id: Date.now(), name: name.trim(), text: text.trim() }];
    setComments(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    localStorage.setItem("efemera_commenter_name", name.trim());
    setText("");
  }

  const S: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.9rem",
    padding: "0.5rem 0.7rem",
    border: "1px solid #e1e8ed",
    borderRadius: 4,
    outline: "none",
    color: "#1c2938",
    boxSizing: "border-box",
  };

  return (
    <section id="comments" style={{ width: "100%", maxWidth: 600, margin: "0 auto 3rem", padding: "0 0", scrollMarginTop: "4rem" }}>
      <div style={{ borderTop: "2px solid #e1e8ed", paddingTop: "1.5rem", marginTop: "0.5rem" }}>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#1c2938", margin: "0 0 1.2rem" }}>
          {comments.length === 0 ? "Leave a comment" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
        </h2>

        {comments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {comments.map(c => (
              <div key={c.id} style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "0.75rem 1rem" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "0.78rem", color: "#8B0000", margin: "0 0 0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.name}</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", lineHeight: 1.6, color: "#2d2d2d", margin: 0 }}>{c.text}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...S, width: "100%" }}
          />
          <textarea
            ref={textRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="What did this bring up for you? (Enter to post)"
            rows={3}
            style={{ ...S, width: "100%", resize: "vertical", lineHeight: 1.6 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={submit}
              disabled={!name.trim() || !text.trim()}
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "white", background: "#8B0000", border: "none", borderRadius: 3, cursor: "pointer", padding: "0.4rem 1rem", opacity: (!name.trim() || !text.trim()) ? 0.5 : 1 }}>
              Post
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
