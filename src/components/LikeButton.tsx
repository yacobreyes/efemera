"use client";

import { useEffect, useState } from "react";

export default function LikeButton({ slug }: { slug: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    try {
      setLiked(localStorage.getItem(`efemera_liked_${slug}`) === "1");
      setCount(parseInt(localStorage.getItem(`efemera_likes_${slug}`) ?? "0", 10));
    } catch { /* ignore */ }
  }, [slug]);

  function toggle() {
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : count - 1;
    setLiked(newLiked);
    setCount(newCount);
    try {
      localStorage.setItem(`efemera_liked_${slug}`, newLiked ? "1" : "0");
      localStorage.setItem(`efemera_likes_${slug}`, String(newCount));
    } catch { /* ignore */ }
  }

  return (
    <button onClick={toggle} style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", padding: 0, color: liked ? "#e0245e" : "#657786" }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
      <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem" }}>{count}</span>
    </button>
  );
}
