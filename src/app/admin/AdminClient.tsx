"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { savePost, deletePost, saveAbout, saveLately, uploadImage } from "./actions";
import type { SanityPost } from "@/lib/sanity";

const CRIMSON = "#8B0000";
const BORDER = "#e1e8ed";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";
const FONT = "'Inter', sans-serif";

const INPUT: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.9rem", padding: "0.5rem 0.7rem",
  border: `1px solid ${BORDER}`, borderRadius: 4, width: "100%",
  boxSizing: "border-box", color: TEXT_DARK, outline: "none", background: "white",
};
const LABEL: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700,
  color: TEXT_MUTED, letterSpacing: "0.08em", textTransform: "uppercase",
  display: "block", marginBottom: "0.3rem",
};

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ptToMarkdown(body: import("@portabletext/types").PortableTextBlock[]): string {
  return body
    .filter((b: any) => b._type === "block")
    .map((b: any) =>
      b.children
        .map((span: any) => {
          const t: string = span.text ?? "";
          const marks: string[] = span.marks ?? [];
          const isStrong = marks.includes("strong");
          const isEm = marks.includes("em");
          if (isStrong && isEm) return `**_${t}_**`;
          if (isStrong) return `**${t}**`;
          if (isEm) return `_${t}_`;
          return t;
        })
        .join("")
    )
    .join("\n\n");
}

const LS_KEY = "efemera_admin_draft";

type FormState = {
  headline: string;
  subheadline: string;
  byline: string;
  slug: string;
  section: string;
  date: string;
  body: string;
  status: "draft" | "published";
};

const DEFAULT_FORM: FormState = {
  headline: "",
  subheadline: "",
  byline: "Yacob Reyes",
  slug: "",
  section: "Narratives",
  date: new Date().toISOString().slice(0, 10),
  body: "",
  status: "draft",
};

export default function AdminClient({ posts: initialPosts }: { posts: SanityPost[] }) {
  const password = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  const [auth, setAuth] = useState(!password);
  const [pw, setPw] = useState("");
  const [authError, setAuthError] = useState("");

  const [posts, setPosts] = useState<SanityPost[]>(initialPosts);
  const [editing, setEditing] = useState<SanityPost | null>(null);
  const [activePanel, setActivePanel] = useState<"post" | "about" | "lately">("post");

  const [latelyReading, setLatelyReading] = useState("");
  const [latelyListening, setLatelyListening] = useState("");
  const [latelyWatching, setLatelyWatching] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageAssetId, setImageAssetId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(DEFAULT_FORM);
  const [isDirty, setIsDirty] = useState(false);

  const [aboutBody, setAboutBody] = useState("");

  // Undo / redo stacks for body text
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);
  const bodyBeforeTyping = useRef<string | null>(null);
  const undoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Draft history snapshots
  const LS_HISTORY = "efemera_admin_history";
  type DraftSnapshot = { ts: number; label: string; form: FormState };
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [autosaveLabel, setAutosaveLabel] = useState("");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveFade = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showPreview, setShowPreview] = useState(false);

  // Load draft history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      if (raw) setDraftHistory(JSON.parse(raw));
    } catch {}
  }, []);

  function addDraftSnapshot(f: FormState) {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      const existing: DraftSnapshot[] = raw ? JSON.parse(raw) : [];
      const ts = Date.now();
      const label = f.headline ? `${f.headline.slice(0, 30)} — ${new Date(ts).toLocaleTimeString()}` : `Untitled — ${new Date(ts).toLocaleTimeString()}`;
      const updated = [{ ts, label, form: f }, ...existing].slice(0, 15);
      localStorage.setItem(LS_HISTORY, JSON.stringify(updated));
      setDraftHistory(updated);
    } catch {}
  }

  // Undo/redo helpers
  function pushUndo(snapshot: string) {
    undoStack.current.push(snapshot);
    redoStack.current = [];
    setUndoLen(undoStack.current.length);
    setRedoLen(0);
  }

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (bodyBeforeTyping.current === null) bodyBeforeTyping.current = form.body;
    if (undoDebounce.current) clearTimeout(undoDebounce.current);
    undoDebounce.current = setTimeout(() => {
      if (bodyBeforeTyping.current !== null) {
        pushUndo(bodyBeforeTyping.current);
        bodyBeforeTyping.current = null;
      }
    }, 800);
    updateForm({ body: e.target.value });
  }

  function handleUndo() {
    if (!undoStack.current.length) return;
    redoStack.current.push(form.body);
    const prev = undoStack.current.pop()!;
    updateForm({ body: prev });
    setUndoLen(undoStack.current.length);
    setRedoLen(redoStack.current.length);
  }

  function handleRedo() {
    if (!redoStack.current.length) return;
    undoStack.current.push(form.body);
    const next = redoStack.current.pop()!;
    updateForm({ body: next });
    setUndoLen(undoStack.current.length);
    setRedoLen(redoStack.current.length);
  }

  // Load posts from admin API
  function refreshPosts() {
    fetch("/api/posts-admin")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPosts(data); })
      .catch(() => {});
  }

  useEffect(() => {
    refreshPosts();
    fetch("/api/about")
      .then(r => r.json())
      .then(data => {
        if (data?.body) {
          const plain = data.body
            .filter((b: any) => b._type === "block")
            .map((b: any) => b.children.map((c: any) => c.text).join(""))
            .join("\n\n");
          setAboutBody(plain);
        }
      })
      .catch(() => {});
  }, []);

  // Restore autosave on mount when creating new post
  useEffect(() => {
    if (!editing && activePanel === "post") {
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
          const parsed: FormState = JSON.parse(saved);
          setForm(parsed);
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track dirty state
  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
    setIsDirty(dirty);
  }, [form, savedForm]);

  // Autosave to localStorage
  useEffect(() => {
    if (!editing && activePanel === "post") {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(form));
          addDraftSnapshot(form);
          setAutosaveLabel("Draft saved");
          if (autosaveFade.current) clearTimeout(autosaveFade.current);
          autosaveFade.current = setTimeout(() => setAutosaveLabel(""), 2000);
        } catch {}
      }, 800);
    }
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [form, editing, activePanel]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes";
      }
    };
    if (isDirty) window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function trySelectPost(post: SanityPost) {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    startEdit(post);
  }

  function trySelectAbout() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    setActivePanel("about");
    setEditing(null);
    setIsDirty(false);
  }

  function trySelectLately() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    setActivePanel("lately");
    setEditing(null);
    setIsDirty(false);
  }

  function tryStartNew() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    startNew();
  }

  function startEdit(post: SanityPost) {
    const bodyMd = ptToMarkdown(post.body);
    const f: FormState = {
      headline: post.headline,
      subheadline: post.subheadline ?? "",
      byline: post.byline ?? "Yacob Reyes",
      slug: post.slug,
      section: post.section,
      date: post.date,
      body: bodyMd,
      status: post.status ?? "published",
    };
    setEditing(post);
    setForm(f);
    setSavedForm(f);
    setIsDirty(false);
    setImageAssetId(post.image?.asset?._ref ?? "");
    setImagePreview(post.image?.asset ? "existing" : "");
    setImageCaption(post.image?.caption ?? "");
    setImageFile(null);
    setActivePanel("post");
    setSuccess("");
    setError("");
  }

  function startNew() {
    const f = { ...DEFAULT_FORM, date: new Date().toISOString().slice(0, 10) };
    setEditing(null);
    setForm(f);
    setSavedForm(f);
    setIsDirty(false);
    setImageAssetId("");
    setImagePreview("");
    setImageCaption("");
    setImageFile(null);
    setActivePanel("post");
    setSuccess("");
    setError("");
  }

  function updateForm(patch: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const { assetId } = await uploadImage(fd);
      setImageAssetId(assetId);
    } catch (err: any) {
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  function wrapSelection(before: string, after: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    pushUndo(val);
    const selected = val.slice(start, end);
    const newVal = val.slice(0, start) + before + selected + after + val.slice(end);
    updateForm({ body: newVal });
    // restore selection after state update
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      wrapSelection("**", "**");
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      e.preventDefault();
      wrapSelection("_", "_");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData();
    (Object.entries(form) as [string, string][]).forEach(([k, v]) => fd.set(k, v));
    if (editing) fd.set("id", editing._id);
    if (imageAssetId) fd.set("imageAssetId", imageAssetId);
    if (imageCaption) fd.set("imageCaption", imageCaption);
    startTransition(async () => {
      try {
        const { slug } = await savePost(fd);
        setSuccess(`Saved! /stories/${slug}`);
        refreshPosts();
        setSavedForm({ ...form });
        setIsDirty(false);
        try { localStorage.removeItem(LS_KEY); } catch {}
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  function handleLatelySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.set("reading", latelyReading);
    fd.set("listening", latelyListening);
    fd.set("watching", latelyWatching);
    startTransition(async () => {
      try {
        await saveLately(fd);
        setSuccess("Lately saved!");
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  function handleAboutSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData();
    fd.set("body", aboutBody);
    startTransition(async () => {
      try {
        await saveAbout(fd);
        setSuccess("About page saved!");
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  if (!auth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f8fa" }}>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (pw === password) setAuth(true);
            else setAuthError("Wrong password");
          }}
          style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "2rem", width: 300, display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h1 style={{ fontFamily: FONT, fontSize: "1.4rem", color: TEXT_DARK, margin: 0 }}>Admin</h1>
          <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} style={INPUT} />
          {authError && <p style={{ color: "#e0245e", fontFamily: FONT, fontSize: "0.8rem", margin: 0 }}>{authError}</p>}
          <button type="submit" style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.4rem", fontFamily: FONT, fontSize: "1rem", cursor: "pointer" }}>Enter</button>
        </form>
      </div>
    );
  }

  const submitLabel = isPending
    ? "Saving…"
    : form.status === "published"
    ? "Publish"
    : "Save draft";

  return (
    <>
      {/* Responsive grid styles */}
      <style>{`
        .admin-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          min-height: 100vh;
          font-family: ${FONT};
        }
        @media (max-width: 700px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
          .admin-left-panel {
            height: auto !important;
            position: relative !important;
          }
        }
        .admin-post-item:hover {
          background: rgba(255,255,255,0.1) !important;
          cursor: pointer;
        }
        .admin-post-item.active {
          background: white !important;
          color: ${TEXT_DARK} !important;
        }
        .admin-post-item.active * {
          color: ${TEXT_DARK} !important;
        }
      `}</style>

      {/* Preview Modal */}
      {showPreview && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "2rem 1rem" }}
          onClick={e => { if (e.target === e.currentTarget) setShowPreview(false); }}
        >
          <div style={{ background: "white", borderRadius: 6, maxWidth: 680, width: "100%", padding: "2.5rem", position: "relative" }}>
            <button
              onClick={() => setShowPreview(false)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: TEXT_MUTED, lineHeight: 1 }}
              aria-label="Close preview"
            >×</button>
            <p style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.5rem" }}>{form.section}</p>
            <h1 style={{ fontFamily: FONT, fontSize: "1.8rem", color: TEXT_DARK, margin: "0 0 0.5rem", lineHeight: 1.25 }}>{form.headline || <em style={{ color: TEXT_MUTED }}>No headline</em>}</h1>
            {form.subheadline && <p style={{ fontFamily: FONT, fontSize: "1.05rem", color: TEXT_MUTED, margin: "0 0 1rem" }}>{form.subheadline}</p>}
            <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: TEXT_MUTED, margin: "0 0 1.5rem" }}>{form.byline} · {form.date}</p>
            <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "0 0 1.5rem" }} />
            {form.body.split(/\n\n+/).filter(Boolean).map((para, i) => (
              <p key={i} style={{ fontFamily: "'Georgia', serif", fontSize: "1rem", color: TEXT_DARK, lineHeight: 1.75, margin: "0 0 1.2rem" }}>{para}</p>
            ))}
          </div>
        </div>
      )}

      <div className="admin-grid">
        {/* LEFT PANEL */}
        <div
          className="admin-left-panel"
          style={{ background: CRIMSON, color: "white", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "hidden" }}
        >
          <div style={{ padding: "1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}>
            <button
              onClick={tryStartNew}
              style={{ width: "100%", background: "none", border: "1px solid white", borderRadius: 4, color: "white", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem", cursor: "pointer" }}
            >+ New post</button>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {posts.map(p => {
              const isActive = activePanel === "post" && editing?._id === p._id;
              return (
                <div
                  key={p._id}
                  className={`admin-post-item${isActive ? " active" : ""}`}
                  onClick={() => trySelectPost(p)}
                  style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                >
                  <p style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit" }}>
                    {p.headline}
                  </p>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT, fontSize: "0.65rem", background: "rgba(255,255,255,0.2)", borderRadius: 3, padding: "0.1rem 0.4rem", color: "inherit" }}>{p.section}</span>
                    {p.status === "draft" && (
                      <span style={{ fontFamily: FONT, fontSize: "0.65rem", background: "rgba(255,200,100,0.3)", border: "1px solid rgba(255,200,100,0.5)", borderRadius: 3, padding: "0.1rem 0.4rem", color: "inherit" }}>draft</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* About Page item */}
            <div
              className={`admin-post-item${activePanel === "about" ? " active" : ""}`}
              onClick={trySelectAbout}
              style={{ padding: "0.75rem 1rem", color: "white", borderTop: "1px solid rgba(255,255,255,0.2)", marginTop: "auto" }}
            >
              <p style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, margin: 0, color: "inherit" }}>About Page</p>
            </div>

            {/* Lately item */}
            <div
              className={`admin-post-item${activePanel === "lately" ? " active" : ""}`}
              onClick={trySelectLately}
              style={{ padding: "0.75rem 1rem", color: "white", borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, margin: 0, color: "inherit" }}>Lately</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ background: "#f5f8fa", overflowY: "auto", padding: "2rem" }}>
          {/* Banners */}
          {success && (
            <div style={{ background: "#e6f4ea", border: "1px solid #a8d5b5", borderRadius: 4, padding: "0.7rem 1rem", fontFamily: FONT, fontSize: "0.85rem", color: "#1a6b3a", marginBottom: "1rem" }}>
              {success}
            </div>
          )}
          {error && (
            <div style={{ background: "#fde8e8", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.7rem 1rem", fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          {/* ABOUT EDITOR */}
          {activePanel === "about" && (
            <form onSubmit={handleAboutSubmit} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.2rem", maxWidth: 720 }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>About Page</h2>
              <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, margin: 0 }}>Separate paragraphs with a blank line.</p>
              <textarea
                style={{ ...INPUT, minHeight: 240, resize: "vertical", lineHeight: 1.7 }}
                value={aboutBody}
                onChange={e => setAboutBody(e.target.value)}
                required
              />
              <button type="submit" disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.4rem", fontFamily: FONT, fontSize: "1rem", cursor: isPending ? "wait" : "pointer", alignSelf: "flex-start", opacity: isPending ? 0.7 : 1 }}>
                {isPending ? "Saving…" : "Save About Page"}
              </button>
            </form>
          )}

          {/* LATELY EDITOR */}
          {activePanel === "lately" && (
            <form onSubmit={handleLatelySubmit} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.2rem", maxWidth: 720 }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>Lately</h2>
              <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, margin: 0 }}>What you&apos;re into right now. All fields optional.</p>

              <div>
                <label style={LABEL}>Currently Reading</label>
                <input style={INPUT} placeholder="e.g. Beloved, Toni Morrison" value={latelyReading} onChange={e => setLatelyReading(e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Currently Listening To</label>
                <input style={INPUT} placeholder="Song, album, artist, podcast…" value={latelyListening} onChange={e => setLatelyListening(e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Currently Watching</label>
                <input style={INPUT} placeholder="Show, film, director…" value={latelyWatching} onChange={e => setLatelyWatching(e.target.value)} />
              </div>

              <button type="submit" disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.4rem", fontFamily: FONT, fontSize: "1rem", cursor: isPending ? "wait" : "pointer", alignSelf: "flex-start", opacity: isPending ? 0.7 : 1 }}>
                {isPending ? "Saving…" : "Save Lately"}
              </button>
            </form>
          )}

          {/* POST EDITOR */}
          {activePanel === "post" && (
            <div style={{ maxWidth: 720 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <h1 style={{ fontFamily: FONT, fontSize: "1.4rem", color: TEXT_DARK, margin: 0 }}>
                  {editing ? "Edit post" : "New post"}
                </h1>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {autosaveLabel && (
                    <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: TEXT_MUTED }}>{autosaveLabel}</span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {/* 1. Headline */}
                <div>
                  <label style={LABEL}>Headline *</label>
                  <input
                    style={INPUT}
                    value={form.headline}
                    onChange={e => updateForm({ headline: e.target.value, ...(!editing ? { slug: slugify(e.target.value) } : {}) })}
                    required
                  />
                </div>

                {/* 2. Subheadline */}
                <div>
                  <label style={LABEL}>Subheadline</label>
                  <input style={INPUT} value={form.subheadline} onChange={e => updateForm({ subheadline: e.target.value })} />
                </div>

                {/* 3. Byline */}
                <div>
                  <label style={LABEL}>Byline</label>
                  <input style={INPUT} value={form.byline} onChange={e => updateForm({ byline: e.target.value })} placeholder="Yacob Reyes" />
                </div>

                {/* 4. Photo */}
                <div>
                  <label style={LABEL}>Photo {uploadingImage && <span style={{ color: "#657786", fontWeight: 400 }}>— uploading…</span>}</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: "0.45rem 1rem", border: `1px solid ${BORDER}`, borderRadius: 4, background: "white", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                      {imagePreview ? "Change photo" : "Add photo"}
                    </button>
                    {imagePreview && imagePreview !== "existing" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagePreview} alt="" style={{ height: 64, width: "auto", borderRadius: 4, objectFit: "cover" }} />
                    )}
                    {imagePreview === "existing" && <span style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#657786", alignSelf: "center" }}>Existing photo</span>}
                    {imagePreview && (
                      <button type="button" onClick={() => { setImagePreview(""); setImageAssetId(""); setImageFile(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#657786", fontSize: "0.8rem", alignSelf: "center" }}>
                        Remove
                      </button>
                    )}
                  </div>
                  {imagePreview && (
                    <div style={{ marginTop: "0.6rem" }}>
                      <label style={{ ...LABEL, marginTop: "0.4rem" }}>Caption (optional)</label>
                      <input style={INPUT} value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Describe the photo…" />
                    </div>
                  )}
                </div>

                {/* 5. Slug / Section / Date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={LABEL}>Slug</label>
                    <input style={INPUT} value={form.slug} onChange={e => updateForm({ slug: e.target.value })} required />
                  </div>
                  <div>
                    <label style={LABEL}>Section</label>
                    <select style={INPUT} value={form.section} onChange={e => updateForm({ section: e.target.value })}>
                      <option>Micro-Memoir</option>
                      <option>Narratives</option>
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Date</label>
                    <input type="date" style={INPUT} value={form.date} onChange={e => updateForm({ date: e.target.value })} required />
                  </div>
                </div>

                {/* 6. Body with toolbar */}
                <div>
                  <label style={LABEL}>Body (separate paragraphs with a blank line)</label>
                  {/* Toolbar */}
                  <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                    {[
                      { label: "B", title: "Bold (Cmd+B)", action: () => wrapSelection("**", "**"), style: { fontWeight: 700 } },
                      { label: "I", title: "Italic (Cmd+I)", action: () => wrapSelection("_", "_"), style: { fontStyle: "italic" } },
                    ].map(btn => (
                      <button
                        key={btn.label}
                        type="button"
                        title={btn.title}
                        onMouseDown={e => e.preventDefault()}
                        onClick={btn.action}
                        style={{ ...btn.style, background: "white", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.2rem 0.55rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_DARK, lineHeight: 1.4 }}
                      >
                        {btn.label}
                      </button>
                    ))}
                    <div style={{ width: 1, height: 18, background: BORDER, margin: "0 0.1rem" }} />
                    <button
                      type="button"
                      title="Undo (Cmd+Z)"
                      onMouseDown={e => e.preventDefault()}
                      onClick={handleUndo}
                      disabled={undoLen === 0}
                      style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.2rem 0.55rem", fontFamily: FONT, fontSize: "0.85rem", cursor: undoLen ? "pointer" : "default", color: undoLen ? TEXT_DARK : "#aaa", lineHeight: 1.4 }}
                    >↩</button>
                    <button
                      type="button"
                      title="Redo"
                      onMouseDown={e => e.preventDefault()}
                      onClick={handleRedo}
                      disabled={redoLen === 0}
                      style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.2rem 0.55rem", fontFamily: FONT, fontSize: "0.85rem", cursor: redoLen ? "pointer" : "default", color: redoLen ? TEXT_DARK : "#aaa", lineHeight: 1.4 }}
                    >↪</button>
                    {draftHistory.length > 0 && (
                      <>
                        <div style={{ width: 1, height: 18, background: BORDER, margin: "0 0.1rem" }} />
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => setShowHistory(h => !h)}
                          style={{ background: showHistory ? "#f5f8fa" : "white", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.2rem 0.65rem", fontFamily: FONT, fontSize: "0.75rem", cursor: "pointer", color: TEXT_MUTED, lineHeight: 1.4 }}
                        >
                          History {showHistory ? "▲" : "▼"}
                        </button>
                      </>
                    )}
                  </div>
                  {/* Draft history panel */}
                  {showHistory && draftHistory.length > 0 && (
                    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, background: "#f9fbfc", marginBottom: "0.5rem", maxHeight: 200, overflowY: "auto" }}>
                      {draftHistory.map((snap, i) => (
                        <div
                          key={snap.ts}
                          style={{ padding: "0.45rem 0.75rem", borderBottom: i < draftHistory.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}
                        >
                          <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_DARK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{snap.label}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Restore this draft? Current body text will be replaced.")) {
                                pushUndo(form.body);
                                updateForm({ body: snap.form.body });
                                setShowHistory(false);
                              }
                            }}
                            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.15rem 0.5rem", fontFamily: FONT, fontSize: "0.72rem", cursor: "pointer", color: TEXT_MUTED, whiteSpace: "nowrap", flexShrink: 0 }}
                          >Restore</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    ref={bodyRef}
                    style={{ ...INPUT, minHeight: 320, resize: "vertical", lineHeight: 1.7 }}
                    value={form.body}
                    onChange={handleBodyChange}
                    onKeyDown={handleBodyKeyDown}
                    required
                  />
                </div>

                {/* Status toggle */}
                <div>
                  <label style={LABEL}>Status</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {(["draft", "published"] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateForm({ status: s })}
                        style={{
                          fontFamily: FONT,
                          fontSize: "0.85rem",
                          padding: "0.4rem 1rem",
                          borderRadius: 4,
                          cursor: "pointer",
                          border: `1px solid ${CRIMSON}`,
                          background: form.status === s ? CRIMSON : "white",
                          color: form.status === s ? "white" : CRIMSON,
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {s === "draft" ? "Draft" : "Published"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={isPending || uploadingImage}
                    style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.4rem", fontFamily: FONT, fontSize: "1rem", cursor: isPending || uploadingImage ? "wait" : "pointer", opacity: isPending || uploadingImage ? 0.7 : 1 }}
                  >
                    {submitLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.6rem 1.2rem", fontFamily: FONT, fontSize: "1rem", cursor: "pointer", color: TEXT_MUTED }}
                  >
                    Preview
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this post?")) {
                          startTransition(async () => {
                            await deletePost(editing._id);
                            refreshPosts();
                            startNew();
                          });
                        }
                      }}
                      style={{ background: "none", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: CRIMSON }}
                    >
                      Delete
                    </button>
                  )}
                  {autosaveLabel && (
                    <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: TEXT_MUTED }}>{autosaveLabel}</span>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
