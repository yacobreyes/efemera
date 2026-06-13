"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { savePost, deletePost, trashPost, restorePost, saveAbout, saveLately, uploadImage, saveDraftToCloud, loadDraftFromCloud, clearCloudDraft, deleteMediaAsset, updateMediaAsset } from "./actions";
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
  const [activePanel, setActivePanel] = useState<"post" | "about" | "lately" | "media">("post");

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


  type MediaAsset = { _id: string; _createdAt: string; url: string; originalFilename?: string; title?: string; description?: string; metadata?: { dimensions?: { width: number; height: number }; size?: number } };
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const [inspectingAsset, setInspectingAsset] = useState<MediaAsset | null>(null);
  const [inspectTitle, setInspectTitle] = useState("");
  const [inspectCaption, setInspectCaption] = useState("");
  const [inspectSaving, setInspectSaving] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [photoPickerAssets, setPhotoPickerAssets] = useState<MediaAsset[]>([]);
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);


  const [autosaveLabel] = useState("");

  const [showPreview, setShowPreview] = useState(false);

  // Load posts from admin API
  function refreshPosts() {
    fetch("/api/posts-admin")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPosts(data); })
      .catch(() => {});
  }

  // Clear any stale drafts on mount
  useEffect(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    clearCloudDraft().catch(() => {});
  }, []);

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


  // Track dirty state
  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
    setIsDirty(dirty);
  }, [form, savedForm]);


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

  function trySelectMedia() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    setActivePanel("media");
    setEditing(null);
    setIsDirty(false);
    setMediaLoading(true);
    fetch("/api/media")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMediaAssets(data); })
      .catch(() => {})
      .finally(() => setMediaLoading(false));
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      await uploadImage(fd);
      // refresh library
      const data = await fetch("/api/media").then(r => r.json());
      if (Array.isArray(data)) setMediaAssets(data);
    } catch {}
    finally { setMediaUploading(false); if (mediaFileRef.current) mediaFileRef.current.value = ""; }
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
              if (ok) { try { localStorage.removeItem(LS_KEY); } catch {} setAuth(true); }
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

{/* Inspect / edit asset modal */}
      {inspectingAsset && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={e => { if (e.target === e.currentTarget) setInspectingAsset(null); }}>
          <div style={{ background: "white", borderRadius: 6, width: "100%", maxWidth: 520, padding: "1.5rem", position: "relative" }}>
            <button onClick={() => setInspectingAsset(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: TEXT_MUTED, lineHeight: 1 }}>×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${inspectingAsset.url}?w=480&h=270&fit=crop&auto=format`} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4, display: "block", marginBottom: "1rem" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={LABEL}>Name</label>
                <input style={INPUT} value={inspectTitle} onChange={e => setInspectTitle(e.target.value)} placeholder="Display name" />
              </div>
              <div>
                <label style={LABEL}>Caption (used when added to post)</label>
                <input style={INPUT} value={inspectCaption} onChange={e => setInspectCaption(e.target.value)} placeholder="Caption shown under photo in article" />
              </div>
              {inspectingAsset.metadata?.dimensions && (
                <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: TEXT_MUTED, margin: 0 }}>
                  {inspectingAsset.metadata.dimensions.width} × {inspectingAsset.metadata.dimensions.height}px
                  {inspectingAsset.metadata.size ? ` · ${(inspectingAsset.metadata.size / 1024).toFixed(0)} KB` : ""}
                  {" · "}{new Date(inspectingAsset._createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  disabled={inspectSaving}
                  onClick={async () => {
                    setInspectSaving(true);
                    try {
                      await updateMediaAsset(inspectingAsset._id, { title: inspectTitle, description: inspectCaption });
                      setMediaAssets(prev => prev.map(a => a._id === inspectingAsset._id ? { ...a, title: inspectTitle, description: inspectCaption } : a));
                      setInspectingAsset(null);
                    } catch { alert("Save failed"); }
                    finally { setInspectSaving(false); }
                  }}
                  style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.5rem 1.2rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, cursor: inspectSaving ? "wait" : "pointer", opacity: inspectSaving ? 0.7 : 1 }}
                >
                  {inspectSaving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setInspectingAsset(null)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.5rem 1rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", color: TEXT_MUTED }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo picker modal */}
      {showPhotoPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "2rem 1rem" }} onClick={e => { if (e.target === e.currentTarget) setShowPhotoPicker(false); }}>
          <div style={{ background: "white", borderRadius: 6, width: "100%", maxWidth: 720, padding: "1.5rem", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.1rem", color: TEXT_DARK, margin: 0 }}>Choose from library</h2>
              <button onClick={() => setShowPhotoPicker(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: TEXT_MUTED, lineHeight: 1 }}>×</button>
            </div>
            {photoPickerLoading ? (
              <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p>
            ) : photoPickerAssets.length === 0 ? (
              <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>No images in library yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.6rem" }}>
                {photoPickerAssets.map(asset => (
                  <div
                    key={asset._id}
                    onClick={() => {
                      const caption = asset.originalFilename ? asset.originalFilename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") : "";
                      setImageAssetId(asset._id);
                      setImagePreview("existing");
                      setImageCaption(caption);
                      setShowPhotoPicker(false);
                    }}
                    style={{ cursor: "pointer", border: `2px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = CRIMSON)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${asset.url}?w=280&h=160&fit=crop&auto=format`} alt={asset.originalFilename ?? ""} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                    <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: TEXT_MUTED, margin: 0, padding: "0.3rem 0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.originalFilename ?? asset._id.slice(-8)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

            {/* Media Library item */}
            <div
              className={`admin-post-item${activePanel === "media" ? " active" : ""}`}
              onClick={trySelectMedia}
              style={{ padding: "0.75rem 1rem", color: "white", borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, margin: 0, color: "inherit" }}>Media Library</p>
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

          {/* MEDIA LIBRARY */}
          {activePanel === "media" && (
            <div style={{ maxWidth: 860 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>Media Library</h2>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  {mediaUploading && <span style={{ fontFamily: FONT, fontSize: "0.8rem", color: TEXT_MUTED }}>Uploading…</span>}
                  <input ref={mediaFileRef} type="file" accept="image/*" onChange={handleMediaUpload} style={{ display: "none" }} />
                  <button
                    type="button"
                    onClick={() => mediaFileRef.current?.click()}
                    disabled={mediaUploading}
                    style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.5rem 1.1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: mediaUploading ? "wait" : "pointer", opacity: mediaUploading ? 0.7 : 1 }}
                  >
                    + Upload image
                  </button>
                </div>
              </div>

              {mediaLoading ? (
                <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_MUTED }}>Loading…</p>
              ) : mediaAssets.length === 0 ? (
                <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_MUTED }}>No images yet. Upload one above.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
                  {mediaAssets.map(asset => {
                    const displayName = asset.title || asset.originalFilename?.replace(/\.[^.]+$/, "") || asset._id.slice(-8);
                    return (
                      <div key={asset._id} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${asset.url}?w=360&h=200&fit=crop&auto=format`}
                          alt={displayName}
                          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                        />
                        <div style={{ padding: "0.45rem 0.5rem" }}>
                          <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: TEXT_DARK, margin: "0 0 0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                            {displayName}
                          </p>
                          {asset.metadata?.dimensions && (
                            <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "#aaa", margin: "0 0 0.45rem" }}>
                              {asset.metadata.dimensions.width} × {asset.metadata.dimensions.height}
                              {asset.metadata.size ? ` · ${(asset.metadata.size / 1024).toFixed(0)} KB` : ""}
                            </p>
                          )}
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const caption = asset.description || asset.title || asset.originalFilename?.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "";
                                setImageAssetId(asset._id);
                                setImagePreview("existing");
                                setImageCaption(caption);
                                setActivePanel("post");
                                setSuccess("Image set on post.");
                              }}
                              style={{ flex: 1, background: "#f5f8fa", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.3rem 0", fontFamily: FONT, fontSize: "0.7rem", cursor: "pointer", color: TEXT_DARK }}
                            >
                              Use in post
                            </button>
                            <button
                              type="button"
                              title="Inspect / edit"
                              onClick={() => { setInspectingAsset(asset); setInspectTitle(asset.title || asset.originalFilename?.replace(/\.[^.]+$/, "") || ""); setInspectCaption(asset.description || ""); }}
                              style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.3rem 0.45rem", fontFamily: FONT, fontSize: "0.7rem", cursor: "pointer", color: TEXT_MUTED }}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => {
                                if (!confirm("Delete this image permanently?")) return;
                                deleteMediaAsset(asset._id).then(() => setMediaAssets(prev => prev.filter(a => a._id !== asset._id))).catch(() => alert("Delete failed"));
                              }}
                              style={{ background: "none", border: `1px solid #f5a5a5`, borderRadius: 3, padding: "0.3rem 0.4rem", fontFamily: FONT, fontSize: "0.7rem", cursor: "pointer", color: CRIMSON }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: "0.45rem 1rem", border: `1px solid ${BORDER}`, borderRadius: 4, background: "white", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                      {imagePreview ? "Change photo" : "Upload photo"}
                    </button>
                    <button type="button" onClick={() => {
                      setShowPhotoPicker(true);
                      setPhotoPickerLoading(true);
                      fetch("/api/media").then(r => r.json()).then(data => { if (Array.isArray(data)) setPhotoPickerAssets(data); }).catch(() => {}).finally(() => setPhotoPickerLoading(false));
                    }} style={{ padding: "0.45rem 1rem", border: `1px solid ${BORDER}`, borderRadius: 4, background: "white", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                      Choose from library
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
