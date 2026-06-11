"use client";

import { useState, useTransition, useEffect } from "react";
import { savePost, deletePost } from "./actions";
import type { SanityPost } from "@/lib/sanity";

const INPUT = {
  fontFamily: "Arial, sans-serif",
  fontSize: "0.9rem",
  padding: "0.5rem 0.7rem",
  border: "1px solid #e1e8ed",
  borderRadius: 4,
  width: "100%",
  boxSizing: "border-box" as const,
  color: "#1c2938",
  outline: "none",
};

const LABEL = {
  fontFamily: "Arial, sans-serif",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#526270",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: "0.3rem",
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminClient({ posts: initialPosts }: { posts: SanityPost[] }) {
  const password = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  const [auth, setAuth] = useState(!password);
  const [pw, setPw] = useState("");
  const [posts, setPosts] = useState<SanityPost[]>(initialPosts);

  useEffect(() => {
    fetch("/api/posts").then(r => r.json()).then(data => { if (Array.isArray(data)) setPosts(data); }).catch(() => {});
  }, []);
  const [editing, setEditing] = useState<SanityPost | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    headline: "", subheadline: "", slug: "", section: "Narratives", date: new Date().toISOString().slice(0, 10), body: "",
  });

  function startEdit(post: SanityPost) {
    const plain = post.body
      .filter((b: any) => b._type === "block")
      .map((b: any) => b.children.map((c: any) => c.text).join(""))
      .join("\n\n");
    setEditing(post);
    setForm({ headline: post.headline, subheadline: post.subheadline, slug: post.slug, section: post.section, date: post.date, body: plain });
    window.scrollTo(0, 0);
  }

  function startNew() {
    setEditing(null);
    setForm({ headline: "", subheadline: "", slug: "", section: "Narratives", date: new Date().toISOString().slice(0, 10), body: "" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    if (editing) fd.set("id", editing._id);
    startTransition(async () => {
      try {
        const { slug } = await savePost(fd);
        setSuccess(`Saved! Visit /stories/${slug}`);
        startNew();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  if (!auth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f8fa" }}>
        <form onSubmit={e => { e.preventDefault(); if (pw === password) setAuth(true); else setError("Wrong password"); }} style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem", width: 300, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "1.4rem", color: "#1c2938", margin: 0 }}>Admin</h1>
          <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} style={INPUT} />
          {error && <p style={{ color: "#e0245e", fontFamily: "Arial, sans-serif", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
          <button type="submit" style={{ background: "#8B0000", color: "white", border: "none", borderRadius: 4, padding: "0.5rem 1rem", fontFamily: "'Bodoni Moda', serif", fontSize: "0.9rem", cursor: "pointer" }}>Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ background: "#f5f8fa", minHeight: "100vh", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "1.6rem", color: "#1c2938", margin: 0 }}>
            {editing ? "Edit post" : "New post"}
          </h1>
          {editing && <button onClick={startNew} style={{ background: "none", border: "1px solid #e1e8ed", borderRadius: 4, padding: "0.3rem 0.8rem", fontFamily: "Arial, sans-serif", fontSize: "0.8rem", cursor: "pointer", color: "#526270" }}>+ New post</button>}
        </div>

        {success && <p style={{ background: "#e6f4ea", border: "1px solid #a8d5b5", borderRadius: 4, padding: "0.7rem 1rem", fontFamily: "Arial, sans-serif", fontSize: "0.85rem", color: "#1a6b3a", margin: 0 }}>{success}</p>}
        {error && <p style={{ background: "#fde8e8", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.7rem 1rem", fontFamily: "Arial, sans-serif", fontSize: "0.85rem", color: "#8B0000", margin: 0 }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label style={LABEL}>Headline</label>
            <input style={INPUT} value={form.headline} onChange={e => { setForm(f => ({ ...f, headline: e.target.value, slug: editing ? f.slug : slugify(e.target.value) })); }} required />
          </div>
          <div>
            <label style={LABEL}>Subheadline</label>
            <input style={INPUT} value={form.subheadline} onChange={e => setForm(f => ({ ...f, subheadline: e.target.value }))} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={LABEL}>Slug</label>
              <input style={INPUT} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
            </div>
            <div>
              <label style={LABEL}>Section</label>
              <select style={INPUT} value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}>
                <option>Micro-Memoir</option>
                <option>Narratives</option>
              </select>
            </div>
            <div>
              <label style={LABEL}>Date</label>
              <input type="date" style={INPUT} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label style={LABEL}>Body (separate paragraphs with a blank line)</label>
            <textarea style={{ ...INPUT, minHeight: 320, resize: "vertical", lineHeight: 1.7 }} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required />
          </div>
          <button type="submit" disabled={isPending} style={{ background: "#8B0000", color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.4rem", fontFamily: "'Bodoni Moda', serif", fontSize: "1rem", cursor: isPending ? "wait" : "pointer", alignSelf: "flex-start", opacity: isPending ? 0.7 : 1 }}>
            {isPending ? "Saving…" : editing ? "Update post" : "Publish post"}
          </button>
        </form>

        {posts.length > 0 && (
          <div style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e1e8ed" }}>
              <h2 style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "1rem", color: "#1c2938", margin: 0 }}>All posts</h2>
            </div>
            {posts.map(p => (
              <div key={p._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.5rem", borderBottom: "1px solid #f0f3f4" }}>
                <div>
                  <p style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "0.95rem", color: "#1c2938", margin: "0 0 0.15rem" }}>{p.headline}</p>
                  <p style={{ fontFamily: "Arial, sans-serif", fontSize: "0.72rem", color: "#657786", margin: 0 }}>{p.section} · {p.date}</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => startEdit(p)} style={{ background: "none", border: "1px solid #e1e8ed", borderRadius: 4, padding: "0.25rem 0.7rem", fontFamily: "Arial, sans-serif", fontSize: "0.75rem", cursor: "pointer", color: "#526270" }}>Edit</button>
                  <button onClick={() => { if (confirm("Delete this post?")) startTransition(async () => { await deletePost(p._id); location.reload(); }); }} style={{ background: "none", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.25rem 0.7rem", fontFamily: "Arial, sans-serif", fontSize: "0.75rem", cursor: "pointer", color: "#8B0000" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
