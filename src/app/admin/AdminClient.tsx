"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { savePost, deletePost, trashPost, restorePost, saveAbout, saveLately, uploadImage, saveDraftToCloud, loadDraftFromCloud, clearCloudDraft } from "./actions";
import { login } from "./auth";
import { parseBody } from "@/lib/parseBody";
import { tiptapToPortableText, portableTextToTiptap } from "@/lib/tiptapConvert";
import RichBodyEditor from "@/components/RichBodyEditor";
import type { JSONContent } from "@tiptap/react";
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


const LS_KEY = "efemera_admin_draft";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

type FormState = {
  headline: string;
  subheadline: string;
  byline: string;
  slug: string;
  section: string;
  date: string;
  body: JSONContent;
  status: "draft" | "published";
  pinned: boolean;
};

const DEFAULT_FORM: FormState = {
  headline: "",
  subheadline: "",
  byline: "Yacob Reyes",
  slug: "",
  section: "Narratives",
  date: new Date().toISOString().slice(0, 10),
  body: EMPTY_DOC,
  status: "draft",
  pinned: false,
};

export default function AdminClient({ posts: initialPosts, initialAuth = false }: { posts: SanityPost[]; initialAuth?: boolean }) {
  const [auth, setAuth] = useState(initialAuth);
  const [pw, setPw] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [posts, setPosts] = useState<SanityPost[]>(initialPosts);
  const [editing, setEditing] = useState<SanityPost | null>(null);
  const [activePanel, setActivePanel] = useState<"post" | "about" | "lately">("post");

  const [latelyReading, setLatelyReading] = useState("");
  const [latelyReadingAuthor, setLatelyReadingAuthor] = useState("");
  const [latelyListening, setLatelyListening] = useState("");
  const [latelyWatching, setLatelyWatching] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageAssetId, setImageAssetId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const submitStatusRef = useRef<"draft" | "published">("draft");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(DEFAULT_FORM);
  const [isDirty, setIsDirty] = useState(false);

  const [aboutBody, setAboutBody] = useState("");


  const [autosaveLabel, setAutosaveLabel] = useState("");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveFade = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showPreview, setShowPreview] = useState(false);

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

  // Restore autosave on mount when creating new post — newest of localStorage vs Sanity cloud draft
  useEffect(() => {
    if (!auth || editing || activePanel !== "post") return;
    let local: { ts: number; form: FormState } | null = null;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // older format stored the FormState directly
        local = parsed?.form ? parsed : { ts: 0, form: parsed };
      }
    } catch {}
    if (local) setForm({ ...DEFAULT_FORM, ...local.form });

    loadDraftFromCloud()
      .then(cloud => {
        if (!cloud) return;
        const parsed = JSON.parse(cloud.data) as { ts: number; form: FormState };
        if (parsed?.form && (!local || (parsed.ts ?? 0) > local.ts)) {
          setForm({ ...DEFAULT_FORM, ...parsed.form });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  // Track dirty state
  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
    setIsDirty(dirty);
  }, [form, savedForm]);

  // Autosave to localStorage (fast) and Sanity (slower, cross-device)
  useEffect(() => {
    if (!editing && activePanel === "post") {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        const snapshot = { ts: Date.now(), form };
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
          setAutosaveLabel("Draft saved");
          if (autosaveFade.current) clearTimeout(autosaveFade.current);
          autosaveFade.current = setTimeout(() => setAutosaveLabel(""), 2000);
        } catch {}
      }, 800);
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
      cloudTimer.current = setTimeout(() => {
        const hasContent = form.headline.trim();
        if (hasContent) {
          saveDraftToCloud(JSON.stringify({ ts: Date.now(), form })).catch(() => {});
        }
      }, 4000);
    }
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
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
    fetch("/api/lately")
      .then(r => r.json())
      .then(data => {
        if (!data) return;
        setLatelyReading(data.reading ?? "");
        setLatelyReadingAuthor(data.readingAuthor ?? "");
        setLatelyListening(data.listening ?? "");
        setLatelyWatching(data.watching ?? "");
      })
      .catch(() => {});
  }

  function tryStartNew() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    startNew();
  }

  function startEdit(post: SanityPost) {
    const f: FormState = {
      headline: post.headline,
      subheadline: post.subheadline ?? "",
      byline: post.byline ?? "Yacob Reyes",
      slug: post.slug,
      section: post.section,
      date: post.date,
      body: portableTextToTiptap(post.body),
      status: post.status === "published" || !post.status ? "published" : "draft",
      pinned: post.pinned ?? false,
    };
    submitStatusRef.current = f.status;
    setEditing(post);
    setForm(f);
    setSavedForm(f);
    setIsDirty(false);
    setImageAssetId(post.image?.asset?._ref ?? "");
    setImagePreview(post.image?.asset ? "existing" : "");
    setImageCaption(post.image?.caption ?? "");
    setImageAlt(post.image?.alt ?? "");
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
    setImageAlt("");
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

function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fd = new FormData();
    const { body, ...rest } = form;
    const effectiveStatus = submitStatusRef.current;
    Object.entries({ ...rest, status: effectiveStatus }).forEach(([k, v]) => fd.set(k, String(v)));
    fd.set("body", JSON.stringify(tiptapToPortableText(body)));
    if (editing) fd.set("id", editing._id);
    if (imageAssetId) fd.set("imageAssetId", imageAssetId);
    if (imageCaption) fd.set("imageCaption", imageCaption);
    if (imageAlt) fd.set("imageAlt", imageAlt);
    startTransition(async () => {
      try {
        const { slug } = await savePost(fd);
        setSuccess(`Saved! /stories/${slug}`);
        refreshPosts();
        const savedStatus = submitStatusRef.current;
        setForm(f => ({ ...f, status: savedStatus }));
        setSavedForm({ ...form, status: savedStatus });
        setIsDirty(false);
        try { localStorage.removeItem(LS_KEY); } catch {}
        if (!editing) clearCloudDraft().catch(() => {});
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
    fd.set("readingAuthor", latelyReadingAuthor);
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
          onSubmit={async e => {
            e.preventDefault();
            setAuthError("");
            setLoggingIn(true);
            try {
              const { ok } = await login(pw);
              if (ok) setAuth(true);
              else setAuthError("Wrong password");
            } catch {
              setAuthError("Login failed — try again");
            } finally {
              setLoggingIn(false);
            }
          }}
          style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "2rem", width: 300, display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h1 style={{ fontFamily: FONT, fontSize: "1.4rem", color: TEXT_DARK, margin: 0 }}>Admin</h1>
          <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} style={INPUT} />
          {authError && <p style={{ color: "#e0245e", fontFamily: FONT, fontSize: "0.8rem", margin: 0 }}>{authError}</p>}
          <button type="submit" disabled={loggingIn} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.4rem", fontFamily: FONT, fontSize: "1rem", cursor: loggingIn ? "wait" : "pointer", opacity: loggingIn ? 0.7 : 1 }}>{loggingIn ? "…" : "Enter"}</button>
        </form>
      </div>
    );
  }

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
            {(form.body.content ?? []).map((node, i) => {
              const text = (node.content ?? []).flatMap((n: { type?: string; text?: string }) => n.type === "text" ? [n.text ?? ""] : []).join("");
              return <p key={i} style={{ fontFamily: "'Georgia', serif", fontSize: "1rem", color: TEXT_DARK, lineHeight: 1.75, margin: "0 0 1.2rem" }}>{text}</p>;
            })}
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
                    {p.status === "trashed" && (
                      <span style={{ fontFamily: FONT, fontSize: "0.65rem", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 3, padding: "0.1rem 0.4rem", color: "inherit" }}>trash</span>
                    )}
                    {p.pinned && (
                      <span style={{ fontFamily: FONT, fontSize: "0.65rem", background: "rgba(255,255,255,0.25)", borderRadius: 3, padding: "0.1rem 0.4rem", color: "inherit" }}>📌</span>
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
                <input style={INPUT} placeholder="Title" value={latelyReading} onChange={e => setLatelyReading(e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Author</label>
                <input style={INPUT} placeholder="Author" value={latelyReadingAuthor} onChange={e => setLatelyReadingAuthor(e.target.value)} />
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

              <form onSubmit={handleSubmit} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {/* Top action bar */}
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", padding: "0.75rem 1.25rem", borderBottom: `1px solid ${BORDER}`, background: "#fafbfc" }}>
                  {/* Status label */}
                  <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, padding: "0.3rem 0.8rem", borderRadius: 20, border: `1px solid ${form.status === "published" ? "#2e7d32" : "#b0b0b0"}`, background: form.status === "published" ? "#e8f5e9" : "#f5f5f5", color: form.status === "published" ? "#2e7d32" : "#666", whiteSpace: "nowrap" }}>
                    {form.status === "published" ? "● Live" : "○ Draft"}
                  </span>

                  {/* Publish */}
                  <button
                    type="submit"
                    disabled={isPending || uploadingImage}
                    onClick={() => { submitStatusRef.current = "published"; }}
                    style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.45rem 1.1rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, cursor: isPending || uploadingImage ? "wait" : "pointer", opacity: isPending || uploadingImage ? 0.7 : 1, whiteSpace: "nowrap" }}
                  >
                    Publish
                  </button>

                  {/* Pin toggle */}
                  <button
                    type="button"
                    onClick={() => updateForm({ pinned: !form.pinned })}
                    style={{ fontFamily: FONT, fontSize: "0.9rem", padding: "0.45rem 1rem", borderRadius: 4, cursor: "pointer", border: `1px solid ${form.pinned ? CRIMSON : BORDER}`, background: form.pinned ? "#fff0f0" : "white", color: form.pinned ? CRIMSON : TEXT_MUTED, whiteSpace: "nowrap" }}
                  >
                    📌 Pin to top of feed
                  </button>

                  {/* Save draft */}
                  <button
                    type="submit"
                    disabled={isPending || uploadingImage}
                    onClick={() => { submitStatusRef.current = "draft"; }}
                    style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.45rem 0.9rem", fontFamily: FONT, fontSize: "0.9rem", cursor: isPending || uploadingImage ? "wait" : "pointer", color: TEXT_MUTED, whiteSpace: "nowrap", opacity: isPending || uploadingImage ? 0.7 : 1 }}
                  >
                    {isPending ? "Saving…" : "Save draft"}
                  </button>

                  {/* Preview */}
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.45rem 0.9rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", color: TEXT_MUTED, whiteSpace: "nowrap" }}
                  >
                    Preview
                  </button>

                  {autosaveLabel && <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED }}>{autosaveLabel}</span>}

                  {/* Trash / restore / delete — pushed to the right */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
                    {editing && editing.status !== "trashed" && (
                      <button type="button" onClick={() => { if (confirm("Move this post to trash?")) startTransition(async () => { await trashPost(editing._id); refreshPosts(); startNew(); }); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: "#aaa" }}>
                        Move to trash
                      </button>
                    )}
                    {editing && editing.status === "trashed" && (
                      <>
                        <button type="button" onClick={() => startTransition(async () => { await restorePost(editing._id); refreshPosts(); startNew(); })} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.35rem 0.75rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: TEXT_DARK }}>Restore</button>
                        <button type="button" onClick={() => { if (confirm("Delete FOREVER? Cannot be undone.")) startTransition(async () => { await deletePost(editing._id); refreshPosts(); startNew(); }); }} style={{ background: "none", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.35rem 0.75rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: CRIMSON }}>Delete forever</button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
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
                    <div style={{ marginTop: "0.6rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <label style={{ ...LABEL, marginTop: "0.4rem" }}>Caption (optional)</label>
                        <input style={INPUT} value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Shown under the photo" />
                      </div>
                      <div>
                        <label style={{ ...LABEL, marginTop: "0.4rem" }}>Alt text (optional)</label>
                        <input style={INPUT} value={imageAlt} onChange={e => setImageAlt(e.target.value)} placeholder="For screen readers & SEO" />
                      </div>
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

                {/* 6. Body */}
                <div>
                  <label style={LABEL}>Body</label>
                  <RichBodyEditor
                    initialContent={form.body}
                    onChange={doc => updateForm({ body: doc })}
                  />
                </div>

                </div>{/* end inner padding div */}
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
