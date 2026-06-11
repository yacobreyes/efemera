"use client";

import { useEffect, useRef, useState } from "react";

interface Comment { id: number; text: string; }

export default function CommentSection({ slug }: { slug: string }) {
  const storageKey = `efemera_comments_${slug}`;
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setComments(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [storageKey]);

  function submit() {
    if (!text.trim()) return;
    const next = [...comments, { id: Date.now(), text: text.trim() }];
    setComments(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setText("");
  }

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
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "1rem", lineHeight: 1.6, color: "#2d2d2d", margin: 0 }}>{c.text}</p>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="What did this bring up for you? (Enter to post)"
          rows={3}
          style={{ width: "100%", fontFamily: "'Inter', sans-serif", fontSize: "1rem", padding: "0.6rem 0.8rem", border: "1px solid #e1e8ed", borderRadius: 4, resize: "vertical", outline: "none", boxSizing: "border-box", color: "#2d2d2d", lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            onClick={submit}
            style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "white", background: "#8B0000", border: "none", borderRadius: 3, cursor: "pointer", padding: "0.4rem 1rem", letterSpacing: "0.03em" }}>
            Post
          </button>
        </div>
      </div>
    </section>
  );
}
