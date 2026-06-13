"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { savePost, deletePost, trashPost, restorePost, saveAbout, saveLately, saveWelcome, uploadImage, clearCloudDraft, deleteMediaAsset, updateMediaAsset } from "./actions";
import { login, logout } from "./auth";
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

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const LS_KEY = "efemera_admin_draft";

type FormState = {
  headline: string; subheadline: string; byline: string; slug: string;
  section: string; date: string; body: JSONContent;
  status: "draft" | "published" | "scheduled"; pinned: boolean;
};
const DEFAULT_FORM: FormState = {
  headline: "", subheadline: "", byline: "Yacob Reyes", slug: "",
  section: "Narratives", date: new Date().toISOString().slice(0, 10),
  body: EMPTY_DOC, status: "draft", pinned: false,
};

type Panel = "dashboard" | "editor" | "welcome" | "about" | "lately" | "media";

export default function AdminClient({ posts: initialPosts, initialAuth = false }: { posts: SanityPost[]; initialAuth?: boolean }) {
  const [auth, setAuth] = useState(initialAuth);
  const [pw, setPw] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [posts, setPosts] = useState<SanityPost[]>(initialPosts);
  const [activePanel, setActivePanel] = useState<Panel>("dashboard");
  const [postTab, setPostTab] = useState<"drafts" | "scheduled" | "published">("drafts");
  const [editing, setEditing] = useState<SanityPost | null>(null);

  const [welcomeHeadline, setWelcomeHeadline] = useState("👋 Hey, Yacob here.");
  const [welcomeBody, setWelcomeBody] = useState("Welcome to my world! I made this space to share some of my more personal writing. Stay tuned.");

  const [latelyReading, setLatelyReading] = useState("");
  const [latelyReadingAuthor, setLatelyReadingAuthor] = useState("");
  const [latelyListening, setLatelyListening] = useState("");
  const [latelyWatching, setLatelyWatching] = useState("");

  const [aboutBody, setAboutBody] = useState("");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(DEFAULT_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const submitStatusRef = useRef<"draft" | "published" | "scheduled">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);

  const [imageCaption, setImageCaption] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageAssetId, setImageAssetId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  type MediaAsset = { _id: string; _createdAt: string; url: string; originalFilename?: string; title?: string; description?: string; metadata?: { dimensions?: { width: number; height: number }; size?: number } };
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [photoPickerAssets, setPhotoPickerAssets] = useState<MediaAsset[]>([]);
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);
  const [inspectAsset, setInspectAsset] = useState<MediaAsset | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    clearCloudDraft().catch(() => {});
  }, []);

  function refreshPosts() {
    fetch("/api/posts-admin").then(r => r.json()).then(data => { if (Array.isArray(data)) setPosts(data); }).catch(() => {});
  }

  useEffect(() => {
    refreshPosts();
    fetch("/api/about").then(r => r.json()).then(data => {
      if (data?.body) {
        const plain = data.body.filter((b: any) => b._type === "block")
          .map((b: any) => b.children.map((c: any) => c.text).join("")).join("\n\n");
        setAboutBody(plain);
      }
    }).catch(() => {});
    fetch("/api/welcome").then(r => r.json()).then(data => {
      if (data?.headline) setWelcomeHeadline(data.headline);
      if (data?.body) setWelcomeBody(data.body);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setIsDirty(JSON.stringify(form) !== JSON.stringify(savedForm));
  }, [form, savedForm]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } };
    if (isDirty) window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function updateForm(patch: Partial<FormState>) { setForm(prev => ({ ...prev, ...patch })); }

  function startNew() {
    const f = { ...DEFAULT_FORM, date: new Date().toISOString().slice(0, 10) };
    setEditing(null); setForm(f); setSavedForm(f); setIsDirty(false);
    setImageAssetId(""); setImagePreview(""); setImageCaption(""); setImageAlt("");
    setActivePanel("editor"); setSuccess(""); setError("");
  }

  function startEdit(post: SanityPost) {
    const f: FormState = {
      headline: post.headline, subheadline: post.subheadline ?? "",
      byline: post.byline ?? "Yacob Reyes", slug: post.slug, section: post.section,
      date: post.date, body: portableTextToTiptap(post.body),
      status: post.status === "published" || !post.status ? "published" : post.status === "scheduled" ? "scheduled" : "draft",
      pinned: post.pinned ?? false,
    };
    submitStatusRef.current = f.status;
    setEditing(post); setForm(f); setSavedForm(f); setIsDirty(false);
    setImageAssetId(post.image?.asset?._ref ?? "");
    setImagePreview(post.image?.asset ? "existing" : "");
    setImageCaption(post.image?.caption ?? ""); setImageAlt(post.image?.alt ?? "");
    setActivePanel("editor"); setSuccess(""); setError("");
  }

  function tryNav(panel: Panel) {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    setActivePanel(panel);
    if (panel !== "editor") { setEditing(null); setIsDirty(false); }
    if (panel === "lately") {
      fetch("/api/lately").then(r => r.json()).then(data => {
        if (!data) return;
        setLatelyReading(data.reading ?? ""); setLatelyReadingAuthor(data.readingAuthor ?? "");
        setLatelyListening(data.listening ?? ""); setLatelyWatching(data.watching ?? "");
      }).catch(() => {});
    }
    if (panel === "media") {
      setMediaLoading(true);
      fetch("/api/media").then(r => r.json()).then(data => { if (Array.isArray(data)) setMediaAssets(data); })
        .catch(() => {}).finally(() => setMediaLoading(false));
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImagePreview(URL.createObjectURL(file)); setUploadingImage(true);
    try {
      const fd = new FormData(); fd.set("file", file);
      const { assetId } = await uploadImage(fd); setImageAssetId(assetId);
    } catch (err: any) { setError(`Image upload failed: ${err.message}`); }
    finally { setUploadingImage(false); }
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setMediaUploading(true);
    try {
      const fd = new FormData(); fd.set("file", file); await uploadImage(fd);
      const data = await fetch("/api/media").then(r => r.json());
      if (Array.isArray(data)) setMediaAssets(data);
    } catch {}
    finally { setMediaUploading(false); if (mediaFileRef.current) mediaFileRef.current.value = ""; }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    const fd = new FormData();
    const { body, ...rest } = form;
    Object.entries({ ...rest, status: submitStatusRef.current }).forEach(([k, v]) => fd.set(k, String(v)));
    fd.set("body", JSON.stringify(tiptapToPortableText(body)));
    if (editing) fd.set("id", editing._id);
    if (imageAssetId) fd.set("imageAssetId", imageAssetId);
    if (imageCaption) fd.set("imageCaption", imageCaption);
    if (imageAlt) fd.set("imageAlt", imageAlt);
    if (submitStatusRef.current === "scheduled" && scheduledAt) fd.set("scheduledAt", new Date(scheduledAt).toISOString());
    startTransition(async () => {
      try {
        const { slug } = await savePost(fd);
        const s = submitStatusRef.current;
        setSuccess(`Saved! /stories/${slug}`);
        refreshPosts();
        setForm(f => ({ ...f, status: s }));
        setSavedForm({ ...form, status: s }); setIsDirty(false);
        if (s === "draft") setPostTab("drafts");
        else setPostTab("published");
      } catch (err: any) { setError(err.message); }
    });
  }

  if (!auth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f8fa" }}>
        <form onSubmit={async e => {
          e.preventDefault(); setAuthError(""); setLoggingIn(true);
          try {
            const { ok } = await login(pw);
            if (ok) { try { localStorage.removeItem(LS_KEY); } catch {} setAuth(true); }
            else setAuthError("Wrong password");
          } catch { setAuthError("Login failed"); }
          finally { setLoggingIn(false); }
        }} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "2rem", width: 300, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h1 style={{ fontFamily: FONT, fontSize: "1.4rem", color: TEXT_DARK, margin: 0 }}>Admin</h1>
          <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} style={INPUT} />
          {authError && <p style={{ color: "#e0245e", fontFamily: FONT, fontSize: "0.8rem", margin: 0 }}>{authError}</p>}
          <button type="submit" disabled={loggingIn} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem", fontFamily: FONT, fontSize: "1rem", cursor: "pointer" }}>{loggingIn ? "…" : "Enter"}</button>
        </form>
      </div>
    );
  }

  const drafts = posts.filter(p => p.status === "draft");
  const scheduled = posts.filter(p => p.status === "scheduled");
  const published = posts.filter(p => p.status === "published" || !p.status);

  return (
    <>
      <style>{`
        .admin-grid { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
        @media (max-width: 700px) { .admin-grid { grid-template-columns: 1fr; } .admin-sidebar { height: auto !important; position: relative !important; } }
        .admin-nav-btn { display: block; width: 100%; background: none; border: none; text-align: left; padding: 0.55rem 0.75rem; font-family: ${FONT}; font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.75); cursor: pointer; border-radius: 4; }
        .admin-nav-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .admin-nav-btn.active { background: white; color: ${TEXT_DARK}; }
        .post-row { padding: 0.85rem 1.25rem; border-bottom: 1px solid ${BORDER}; display: flex; align-items: center; gap: 1rem; cursor: pointer; }
        .post-row:hover { background: #f5f8fa; }
        .post-row:last-child { border-bottom: none; }
      `}</style>

      {/* Photo picker modal */}
      {showPhotoPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "2rem 1rem" }} onClick={e => { if (e.target === e.currentTarget) setShowPhotoPicker(false); }}>
          <div style={{ background: "white", borderRadius: 6, width: "100%", maxWidth: 720, padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.1rem", color: TEXT_DARK, margin: 0 }}>Choose from library</h2>
              <button onClick={() => setShowPhotoPicker(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: TEXT_MUTED }}>×</button>
            </div>
            {photoPickerLoading ? <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p> : photoPickerAssets.length === 0 ? <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>No images yet.</p> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.6rem" }}>
                {photoPickerAssets.map(asset => (
                  <div key={asset._id} onClick={() => {
                    const caption = asset.title || (asset.originalFilename ? asset.originalFilename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") : "");
                    setImageAssetId(asset._id); setImagePreview("existing"); setImageCaption(caption); setShowPhotoPicker(false);
                  }} style={{ cursor: "pointer", border: `2px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = CRIMSON)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${asset.url}?w=280&h=160&fit=crop&auto=format`} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                    <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: TEXT_MUTED, margin: 0, padding: "0.3rem 0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.title || asset.originalFilename}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspect asset modal */}
      {inspectAsset && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }} onClick={e => { if (e.target === e.currentTarget) setInspectAsset(null); }}>
          <div style={{ background: "white", borderRadius: 6, maxWidth: 540, width: "100%", padding: "1.5rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${inspectAsset.url}?w=800&auto=format`} alt="" style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 4, marginBottom: "1rem" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div><label style={LABEL}>Title</label><input style={INPUT} defaultValue={inspectAsset.title ?? ""} onBlur={e => updateMediaAsset(inspectAsset._id, { title: e.target.value }).catch(() => {})} /></div>
              <div><label style={LABEL}>Description</label><textarea style={{ ...INPUT, minHeight: 60, resize: "vertical" }} defaultValue={inspectAsset.description ?? ""} onBlur={e => updateMediaAsset(inspectAsset._id, { description: e.target.value }).catch(() => {})} /></div>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#aaa", margin: 0 }}>{inspectAsset.metadata?.dimensions?.width} × {inspectAsset.metadata?.dimensions?.height}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => setInspectAsset(null)} style={{ flex: 1, background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.5rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer" }}>Done</button>
                <button onClick={() => { if (confirm("Delete permanently?")) deleteMediaAsset(inspectAsset._id).then(() => { setMediaAssets(prev => prev.filter(a => a._id !== inspectAsset._id)); setInspectAsset(null); }).catch(() => {}); }} style={{ background: "none", border: `1px solid #f5a5a5`, borderRadius: 4, padding: "0.5rem 0.75rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: CRIMSON }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "2rem 1rem" }} onClick={e => { if (e.target === e.currentTarget) setShowPreview(false); }}>
          <div style={{ background: "white", borderRadius: 6, maxWidth: 680, width: "100%", padding: "2.5rem", position: "relative" }}>
            <button onClick={() => setShowPreview(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: TEXT_MUTED }}>×</button>
            <p style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.5rem" }}>{form.section}</p>
            <h1 style={{ fontFamily: FONT, fontSize: "1.8rem", color: TEXT_DARK, margin: "0 0 0.5rem", lineHeight: 1.25 }}>{form.headline || <em style={{ color: TEXT_MUTED }}>No headline</em>}</h1>
            {form.subheadline && <p style={{ fontFamily: FONT, fontSize: "1.05rem", color: TEXT_MUTED, margin: "0 0 1rem" }}>{form.subheadline}</p>}
            <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "0 0 1.5rem" }} />
            {(form.body.content ?? []).map((node, i) => {
              const text = (node.content ?? []).flatMap((n: { type?: string; text?: string }) => n.type === "text" ? [n.text ?? ""] : []).join("");
              return <p key={i} style={{ fontFamily: "'Georgia', serif", fontSize: "1rem", color: TEXT_DARK, lineHeight: 1.75, margin: "0 0 1.2rem" }}>{text}</p>;
            })}
          </div>
        </div>
      )}

      <div className="admin-grid">
        {/* LEFT SIDEBAR */}
        <div className="admin-sidebar" style={{ background: CRIMSON, color: "white", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" }}>
          <div style={{ padding: "1.25rem 1rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 0.75rem" }}>Efemera</p>
            <button onClick={() => { if (isDirty && !confirm("Discard unsaved changes?")) return; startNew(); }}
              style={{ width: "100%", background: "white", border: "none", borderRadius: 4, color: CRIMSON, fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, padding: "0.55rem", cursor: "pointer" }}>
              + New post
            </button>
          </div>

          <div style={{ padding: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            <button className={`admin-nav-btn${activePanel === "dashboard" ? " active" : ""}`} onClick={() => tryNav("dashboard")}>Posts</button>
          </div>

          <div style={{ padding: "0.5rem", flex: 1 }}>
            <p style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", margin: "0.5rem 0.75rem 0.35rem" }}>Site</p>
            <button className={`admin-nav-btn${activePanel === "welcome" ? " active" : ""}`} onClick={() => tryNav("welcome")}>Welcome Note</button>
            <button className={`admin-nav-btn${activePanel === "about" ? " active" : ""}`} onClick={() => tryNav("about")}>About Page</button>
            <button className={`admin-nav-btn${activePanel === "lately" ? " active" : ""}`} onClick={() => tryNav("lately")}>Lately</button>
            <button className={`admin-nav-btn${activePanel === "media" ? " active" : ""}`} onClick={() => tryNav("media")}>Media Library</button>
          </div>

          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <button onClick={async () => { await logout(); setAuth(false); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", cursor: "pointer", padding: 0 }}>Sign out</button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ background: "#f5f8fa", overflowY: "auto", padding: "2rem" }}>

          {/* DASHBOARD */}
          {activePanel === "dashboard" && (
            <div style={{ maxWidth: 720 }}>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", alignItems: "center" }}>
                {(["drafts", "scheduled", "published"] as const).map(tab => (
                  <button key={tab} onClick={() => setPostTab(tab)} style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, padding: "0.4rem 1.1rem", borderRadius: 4, border: `1px solid ${postTab === tab ? CRIMSON : BORDER}`, background: postTab === tab ? CRIMSON : "white", color: postTab === tab ? "white" : TEXT_MUTED, cursor: "pointer" }}>
                    {tab === "drafts" ? `Drafts (${drafts.length})` : tab === "scheduled" ? `Scheduled (${scheduled.length})` : `Published (${published.length})`}
                  </button>
                ))}
                <button onClick={startNew} style={{ marginLeft: "auto", background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.4rem 1.1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>+ New post</button>
              </div>

              {postTab === "drafts" && (
                drafts.length === 0 ? (
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3rem", textAlign: "center" }}>
                    <p style={{ fontFamily: FONT, color: TEXT_MUTED, margin: 0 }}>No drafts yet.</p>
                  </div>
                ) : (
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                    {drafts.map(post => <PostRow key={post._id} post={post} onClick={() => { if (isDirty && !confirm("Discard?")) return; startEdit(post); }} />)}
                  </div>
                )
              )}

              {postTab === "scheduled" && (
                scheduled.length === 0 ? (
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3rem", textAlign: "center" }}>
                    <p style={{ fontFamily: FONT, color: TEXT_MUTED, margin: 0 }}>No scheduled posts.</p>
                  </div>
                ) : (
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                    {scheduled.map(post => <PostRow key={post._id} post={post} onClick={() => { if (isDirty && !confirm("Discard?")) return; startEdit(post); }} />)}
                  </div>
                )
              )}

              {postTab === "published" && (
                published.length === 0 ? (
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3rem", textAlign: "center" }}>
                    <p style={{ fontFamily: FONT, color: TEXT_MUTED, margin: 0 }}>No published posts yet.</p>
                  </div>
                ) : (
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                    {published.map(post => <PostRow key={post._id} post={post} onClick={() => { if (isDirty && !confirm("Discard?")) return; startEdit(post); }} />)}
                  </div>
                )
              )}
            </div>
          )}

          {/* WELCOME EDITOR */}
          {activePanel === "welcome" && (
            <div style={{ maxWidth: 600 }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: "0 0 1.5rem" }}>Welcome Note</h2>
              <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div><label style={LABEL}>Headline</label><input style={INPUT} value={welcomeHeadline} onChange={e => setWelcomeHeadline(e.target.value)} /></div>
                <div><label style={LABEL}>Body</label><textarea style={{ ...INPUT, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} value={welcomeBody} onChange={e => setWelcomeBody(e.target.value)} /></div>
                {success && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#2e7d32", margin: 0 }}>{success}</p>}
                <button onClick={() => startTransition(async () => { setSuccess(""); try { await saveWelcome(welcomeHeadline, welcomeBody); setSuccess("Saved!"); setTimeout(() => setSuccess(""), 2000); } catch { setError("Save failed"); } })} disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.2rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" }}>
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* ABOUT EDITOR */}
          {activePanel === "about" && (
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(); fd.set("body", aboutBody); startTransition(async () => { try { await saveAbout(fd); setSuccess("Saved!"); setTimeout(() => setSuccess(""), 2000); } catch (err: any) { setError(err.message); } }); }} style={{ maxWidth: 600, background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>About Page</h2>
              <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, margin: 0 }}>Separate paragraphs with a blank line.</p>
              <textarea style={{ ...INPUT, minHeight: 240, resize: "vertical", lineHeight: 1.7 }} value={aboutBody} onChange={e => setAboutBody(e.target.value)} />
              {success && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#2e7d32", margin: 0 }}>{success}</p>}
              {error && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.2rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" }}>{isPending ? "Saving…" : "Save"}</button>
            </form>
          )}

          {/* LATELY EDITOR */}
          {activePanel === "lately" && (
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(); fd.set("reading", latelyReading); fd.set("readingAuthor", latelyReadingAuthor); fd.set("listening", latelyListening); fd.set("watching", latelyWatching); startTransition(async () => { try { await saveLately(fd); setSuccess("Saved!"); setTimeout(() => setSuccess(""), 2000); } catch (err: any) { setError(err.message); } }); }} style={{ maxWidth: 600, background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>Lately</h2>
              <div><label style={LABEL}>Currently Reading</label><input style={INPUT} value={latelyReading} onChange={e => setLatelyReading(e.target.value)} /></div>
              <div><label style={LABEL}>Author</label><input style={INPUT} value={latelyReadingAuthor} onChange={e => setLatelyReadingAuthor(e.target.value)} /></div>
              <div><label style={LABEL}>Currently Listening To</label><input style={INPUT} value={latelyListening} onChange={e => setLatelyListening(e.target.value)} /></div>
              <div><label style={LABEL}>Currently Watching</label><input style={INPUT} value={latelyWatching} onChange={e => setLatelyWatching(e.target.value)} /></div>
              {success && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#2e7d32", margin: 0 }}>{success}</p>}
              {error && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.2rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" }}>{isPending ? "Saving…" : "Save"}</button>
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
                  <button type="button" onClick={() => mediaFileRef.current?.click()} disabled={mediaUploading} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.5rem 1.1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>+ Upload</button>
                </div>
              </div>
              {mediaLoading ? <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p> : mediaAssets.length === 0 ? <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>No images yet.</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
                  {mediaAssets.map(asset => (
                    <div key={asset._id} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${asset.url}?w=320&h=200&fit=crop&auto=format`} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", cursor: "pointer" }} onClick={() => setInspectAsset(asset)} />
                      <div style={{ padding: "0.4rem 0.5rem" }}>
                        <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: TEXT_MUTED, margin: "0 0 0.35rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.title || asset.originalFilename || asset._id.slice(-8)}</p>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button type="button" onClick={() => { const caption = asset.title || (asset.originalFilename ? asset.originalFilename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") : ""); setImageAssetId(asset._id); setImagePreview("existing"); setImageCaption(caption); setActivePanel("editor"); }} style={{ flex: 1, background: "#f5f8fa", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "0.3rem 0", fontFamily: FONT, fontSize: "0.72rem", cursor: "pointer", color: TEXT_DARK }}>Use in post</button>
                          <button type="button" onClick={() => { if (confirm("Delete permanently?")) deleteMediaAsset(asset._id).then(() => setMediaAssets(prev => prev.filter(a => a._id !== asset._id))).catch(() => {}); }} style={{ background: "none", border: `1px solid #f5a5a5`, borderRadius: 3, padding: "0.3rem 0.4rem", fontFamily: FONT, fontSize: "0.72rem", cursor: "pointer", color: CRIMSON }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POST EDITOR */}
          {activePanel === "editor" && (
            <div style={{ maxWidth: 720 }}>
              {success && <div style={{ background: "#e6f4ea", border: "1px solid #a8d5b5", borderRadius: 4, padding: "0.7rem 1rem", fontFamily: FONT, fontSize: "0.85rem", color: "#1a6b3a", marginBottom: "1rem" }}>{success}</div>}
              {error && <div style={{ background: "#fde8e8", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.7rem 1rem", fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, marginBottom: "1rem" }}>{error}</div>}

              <form onSubmit={handleSubmit} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {/* Top bar */}
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", padding: "0.75rem 1.25rem", borderBottom: `1px solid ${BORDER}`, background: "#fafbfc" }}>
                  <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, padding: "0.3rem 0.8rem", borderRadius: 20, border: `1px solid ${form.status === "published" ? "#2e7d32" : form.status === "scheduled" ? "#1565c0" : "#b0b0b0"}`, background: form.status === "published" ? "#e8f5e9" : form.status === "scheduled" ? "#e3f2fd" : "#f5f5f5", color: form.status === "published" ? "#2e7d32" : form.status === "scheduled" ? "#1565c0" : "#666" }}>
                    {form.status === "published" ? "● Live" : form.status === "scheduled" ? "⏱ Scheduled" : "○ Draft"}
                  </span>
                  <button type="submit" disabled={isPending || uploadingImage} onClick={() => { submitStatusRef.current = "published"; setShowScheduler(false); }} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.45rem 1.1rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>Publish</button>
                  <div style={{ position: "relative" }}>
                    <button type="button" onClick={() => setShowScheduler(s => !s)} style={{ background: "white", border: `1px solid ${showScheduler ? CRIMSON : BORDER}`, borderRadius: 4, padding: "0.45rem 0.9rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", color: showScheduler ? CRIMSON : TEXT_MUTED }}>⏱ Schedule</button>
                    {showScheduler && (
                      <div style={{ position: "absolute", top: "calc(100% + 0.4rem)", left: 0, zIndex: 20, background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.75rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 240 }}>
                        <label style={{ ...LABEL, marginBottom: "0.4rem" }}>Publish at</label>
                        <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ ...INPUT, marginBottom: "0.5rem" }} />
                        <button type="submit" disabled={!scheduledAt || isPending} onClick={() => { submitStatusRef.current = "scheduled"; setShowScheduler(false); }} style={{ width: "100%", background: "#1565c0", color: "white", border: "none", borderRadius: 4, padding: "0.45rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer" }}>Confirm schedule</button>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => updateForm({ pinned: !form.pinned })} style={{ fontFamily: FONT, fontSize: "0.9rem", padding: "0.45rem 1rem", borderRadius: 4, cursor: "pointer", border: `1px solid ${form.pinned ? CRIMSON : BORDER}`, background: form.pinned ? "#fff0f0" : "white", color: form.pinned ? CRIMSON : TEXT_MUTED }}>📌 Pin to top of feed</button>
                  <button type="submit" disabled={isPending || uploadingImage} onClick={() => { submitStatusRef.current = "draft"; }} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.45rem 0.9rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", color: TEXT_MUTED }}>{isPending ? "Saving…" : "Save draft"}</button>
                  <button type="button" onClick={() => setShowPreview(true)} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.45rem 0.9rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", color: TEXT_MUTED }}>Preview</button>
                  <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button type="button" onClick={() => { if (!isDirty || confirm("Discard?")) { setActivePanel("dashboard"); setEditing(null); setIsDirty(false); } }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: "#aaa" }}>← Back</button>
                    {editing && editing.status !== "trashed" && <button type="button" onClick={() => { if (confirm("Move to trash?")) startTransition(async () => { await trashPost(editing._id); refreshPosts(); setActivePanel("dashboard"); setEditing(null); }); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: "#aaa" }}>Trash</button>}
                    {editing && editing.status === "trashed" && <>
                      <button type="button" onClick={() => startTransition(async () => { await restorePost(editing._id); refreshPosts(); setActivePanel("dashboard"); setEditing(null); })} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.3rem 0.6rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: TEXT_DARK }}>Restore</button>
                      <button type="button" onClick={() => { if (confirm("Delete FOREVER?")) startTransition(async () => { await deletePost(editing._id); refreshPosts(); setActivePanel("dashboard"); setEditing(null); }); }} style={{ background: "none", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.3rem 0.6rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: CRIMSON }}>Delete forever</button>
                    </>}
                  </div>
                </div>

                <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div><label style={LABEL}>Headline *</label><input style={INPUT} value={form.headline} onChange={e => updateForm({ headline: e.target.value, ...(!editing ? { slug: slugify(e.target.value) } : {}) })} required /></div>
                  <div><label style={LABEL}>Subheadline</label><input style={INPUT} value={form.subheadline} onChange={e => updateForm({ subheadline: e.target.value })} /></div>
                  <div><label style={LABEL}>Byline</label><input style={INPUT} value={form.byline} onChange={e => updateForm({ byline: e.target.value })} /></div>

                  <div>
                    <label style={LABEL}>Photo {uploadingImage && <span style={{ fontWeight: 400, color: "#657786" }}>— uploading…</span>}</label>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                      <button type="button" onClick={() => fileRef.current?.click()} style={{ padding: "0.45rem 1rem", border: `1px solid ${BORDER}`, borderRadius: 4, background: "white", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_MUTED }}>{imagePreview ? "Change photo" : "Upload photo"}</button>
                      <button type="button" onClick={() => { setShowPhotoPicker(true); setPhotoPickerLoading(true); fetch("/api/media").then(r => r.json()).then(d => { if (Array.isArray(d)) setPhotoPickerAssets(d); }).catch(() => {}).finally(() => setPhotoPickerLoading(false)); }} style={{ padding: "0.45rem 1rem", border: `1px solid ${BORDER}`, borderRadius: 4, background: "white", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_MUTED }}>Choose from library</button>
                      {imagePreview && imagePreview !== "existing" && <img src={imagePreview} alt="" style={{ height: 64, borderRadius: 4, objectFit: "cover" }} />}
                      {imagePreview === "existing" && <span style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#657786", alignSelf: "center" }}>Existing photo</span>}
                      {imagePreview && <button type="button" onClick={() => { setImagePreview(""); setImageAssetId(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#657786", fontSize: "0.8rem", alignSelf: "center" }}>Remove</button>}
                    </div>
                    {imagePreview && (
                      <div style={{ marginTop: "0.6rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div><label style={{ ...LABEL, marginTop: "0.4rem" }}>Caption</label><input style={INPUT} value={imageCaption} onChange={e => setImageCaption(e.target.value)} /></div>
                        <div><label style={{ ...LABEL, marginTop: "0.4rem" }}>Alt text</label><input style={INPUT} value={imageAlt} onChange={e => setImageAlt(e.target.value)} /></div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                    <div><label style={LABEL}>Slug</label><input style={INPUT} value={form.slug} onChange={e => updateForm({ slug: e.target.value })} required /></div>
                    <div><label style={LABEL}>Section</label><select style={INPUT} value={form.section} onChange={e => updateForm({ section: e.target.value })}><option>Micro-Memoir</option><option>Narratives</option></select></div>
                    <div><label style={LABEL}>Date</label><input type="date" style={INPUT} value={form.date} onChange={e => updateForm({ date: e.target.value })} required /></div>
                  </div>

                  <div>
                    <label style={LABEL}>Body</label>
                    <RichBodyEditor initialContent={form.body} onChange={doc => updateForm({ body: doc })} />
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PostRow({ post, onClick }: { post: SanityPost; onClick: () => void }) {
  return (
    <div className="post-row" onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", fontWeight: 600, color: "#1c2938", margin: "0 0 0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.headline}</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#657786", margin: 0 }}>{post.section} · {post.date}</p>
      </div>
      {post.pinned && <span style={{ fontSize: "0.8rem" }}>📌</span>}
    </div>
  );
}
