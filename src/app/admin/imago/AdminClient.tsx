"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { savePost, deletePost, trashPost, restorePost, saveAbout, saveLately, saveWelcome, uploadImage, clearCloudDraft, deleteMediaAsset, updateMediaAsset, createDraft } from "../actions";
import { login, logout } from "../auth";
import { tiptapToPortableText, portableTextToTiptap } from "@/lib/tiptapConvert";
import RichBodyEditor, { type ToolbarHandles } from "@/components/RichBodyEditor";
import type { JSONContent, Editor } from "@tiptap/react";
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
  status: "draft" | "published" | "scheduled";
};
const DEFAULT_FORM: FormState = {
  headline: "", subheadline: "", byline: "Yacob Reyes", slug: "",
  section: "Narratives", date: new Date().toISOString().slice(0, 10),
  body: EMPTY_DOC, status: "draft",
};

type Panel = "dashboard" | "editor" | "welcome" | "about" | "lately" | "media" | "comments";

export default function AdminClient({ posts: initialPosts, initialAuth = false, initialPanel = "dashboard" }: { posts: SanityPost[]; initialAuth?: boolean; initialPanel?: Panel }) {
  const router = useRouter();
  const [auth, setAuth] = useState(initialAuth);
  const [pw, setPw] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [posts, setPosts] = useState<SanityPost[]>(initialPosts);
  const [activePanel, setActivePanel] = useState<Panel>(initialPanel);
  const [postTab, setPostTab] = useState<"drafts" | "scheduled" | "published">("drafts");
  const [editing, setEditing] = useState<SanityPost | null>(null);

  const [welcomeHeadline, setWelcomeHeadline] = useState("");
  const [welcomeBody, setWelcomeBody] = useState("");

  const [latelyReading, setLatelyReading] = useState("");
  const [latelyReadingAuthor, setLatelyReadingAuthor] = useState("");
  const [latelyReadingUrl, setLatelyReadingUrl] = useState("");
  const [latelyListening, setLatelyListening] = useState("");
  const [latelyListeningArtist, setLatelyListeningArtist] = useState("");
  const [latelyListeningUrl, setLatelyListeningUrl] = useState("");
  const [latelyWatching, setLatelyWatching] = useState("");
  const [latelyWatchingUrl, setLatelyWatchingUrl] = useState("");

  const [aboutDoc, setAboutDoc] = useState<JSONContent>(EMPTY_DOC);
  const [aboutEditor, setAboutEditor] = useState<Editor | null>(null);
  const [aboutToolbar, setAboutToolbar] = useState<ToolbarHandles | null>(null);

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

  type MediaAsset = { _id: string; _createdAt: string; url: string; originalFilename?: string; title?: string; description?: string; altText?: string; metadata?: { dimensions?: { width: number; height: number }; size?: number }; usedIn?: { slug: string; headline: string }[] };
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [photoPickerAssets, setPhotoPickerAssets] = useState<MediaAsset[]>([]);
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);
  const [inspectAsset, setInspectAsset] = useState<MediaAsset | null>(null);
  const [inspectAltText, setInspectAltText] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  type AdminComment = { _id: string; name: string; text: string; slug: string; _createdAt: string };
  const [adminComments, setAdminComments] = useState<AdminComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; post: SanityPost } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorTab, setEditorTab] = useState<"content" | "metadata">("content");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    clearCloudDraft().catch(() => {});
  }, []);

  function refreshPosts() {
    fetch("/api/posts-admin").then(r => r.json()).then(data => { if (Array.isArray(data)) setPosts(data); }).catch(() => {});
  }

  useEffect(() => {
    refreshPosts();
    const retryTimer = setTimeout(refreshPosts, 1500);
    fetch("/api/about").then(r => r.json()).then(data => {
      if (data?.body?.length) setAboutDoc(portableTextToTiptap(data.body));
    }).catch(() => {});
    fetch("/api/welcome").then(r => r.json()).then(data => {
      if (data?.headline) setWelcomeHeadline(data.headline);
      if (data?.body) setWelcomeBody(data.body);
    }).catch(() => {});
    fetch("/api/lately").then(r => r.json()).then(data => {
      if (!data) return;
      if (data.reading) setLatelyReading(data.reading);
      if (data.readingAuthor) setLatelyReadingAuthor(data.readingAuthor);
      if (data.readingUrl) setLatelyReadingUrl(data.readingUrl);
      if (data.listening) setLatelyListening(data.listening);
      if (data.listeningArtist) setLatelyListeningArtist(data.listeningArtist);
      if (data.listeningUrl) setLatelyListeningUrl(data.listeningUrl);
      if (data.watching) setLatelyWatching(data.watching);
      if (data.watchingUrl) setLatelyWatchingUrl(data.watchingUrl);
    }).catch(() => {});
    fetch("/api/media").then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setMediaAssets(data);
        if (data.length > 0) { setInspectAsset(prev => prev ?? data[0]); setInspectAltText(data[0].altText ?? ""); }
      }
    }).catch(() => {});
    return () => clearTimeout(retryTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    router.push(`/admin/imago/posts/untitled-${Date.now()}`);
  }

  function startEdit(post: SanityPost) {
    router.push(`/admin/imago/posts/${post.slug}`);
  }

  function tryNav(panel: Panel) {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    setActivePanel(panel);
    if (panel !== "editor") {
      setEditing(null);
      setIsDirty(false);
      const url = panel === "dashboard" ? "/admin/imago" : `/admin/imago/${panel}`;
      window.history.pushState(null, "", url);
    }
    if (panel === "media") {
      setMediaSearch("");
      fetch("/api/media").then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          setMediaAssets(data);
          if (data.length > 0) { setInspectAsset(data[0]); setInspectAltText(data[0].altText ?? ""); setUrlCopied(false); }
        }
      }).catch(() => {});
    }
    if (panel === "comments") {
      setCommentsLoading(true);
      fetch("/api/comments/all").then(r => r.json()).then(data => { if (Array.isArray(data)) setAdminComments(data); }).catch(() => {}).finally(() => setCommentsLoading(false));
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
      if (Array.isArray(data)) { setMediaAssets(data); if (data.length > 0) { setInspectAsset(data[0]); setInspectAltText(data[0].altText ?? ""); setUrlCopied(false); } }
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
        <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "2.5rem 2rem", width: 300, display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center", textAlign: "center" }}>
          <span style={{ fontFamily: FONT, fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
            <span style={{ color: CRIMSON }}>i</span>mago
          </span>
          <button
            onClick={() => { import("next-auth/react").then(({ signIn }) => signIn("google", { callbackUrl: "/admin/imago" })); }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", width: "100%", background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, color: TEXT_DARK, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v8.51h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.14z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.55 10.78l7.98-6.19z"/><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.55 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/></svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (!mounted) return <div style={{ minHeight: "100vh", background: "white" }} />;

  const drafts = posts.filter(p => p.status === "draft");
  const scheduled = posts.filter(p => p.status === "scheduled");
  const published = posts.filter(p => p.status === "published" || !p.status);

  return (
    <>
      <style>{`
        body { background: white !important; }
        .admin-layout { display: flex; min-height: 100vh; }
        .admin-sidebar {
          width: ${sidebarOpen ? "220px" : "60px"};
          min-width: ${sidebarOpen ? "220px" : "60px"};
          background: white;
          border-right: 1px solid ${BORDER};
          display: flex;
          flex-direction: column;
          transition: width 0.2s ease, min-width 0.2s ease;
          overflow: hidden;
          position: relative;
          z-index: 10;
          overflow: visible;
        }
        .admin-right { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: visible; }
        .admin-mobile-bar { display: flex; align-items: center; justify-content: space-between; background: white; padding: 0 1.25rem; position: sticky; top: 0; z-index: 200; border-bottom: 1px solid ${BORDER}; box-shadow: 0 1px 4px rgba(0,0,0,0.08); height: 52px; box-sizing: border-box; }
        .admin-main { background: #f5f8fa; overflow-y: auto; padding: 2rem; flex: 1; display: flex; flex-direction: column; align-items: stretch; }
        .admin-main > * { max-width: 900px; width: 100%; margin-left: auto; margin-right: auto; }
        .admin-nav-btn { display: flex; align-items: center; gap: 0.75rem; width: 100%; background: none; border: none; text-align: left; padding: 0.65rem 0.85rem; font-family: ${FONT}; font-size: 0.88rem; font-weight: 500; color: ${TEXT_DARK}; cursor: pointer; border-radius: 6px; white-space: nowrap; overflow: hidden; }
        .admin-nav-btn:hover { background: #f5f0f0; color: ${CRIMSON}; }
        .admin-nav-btn.active { background: #f0e8e8; color: ${CRIMSON}; font-weight: 700; border-left: 3px solid ${CRIMSON}; padding-left: calc(0.85rem - 3px); }
        .post-row { padding: 0.85rem 1.25rem; border-bottom: 1px solid ${BORDER}; display: flex; align-items: center; gap: 1rem; cursor: pointer; }
        .post-row:hover { background: #f5f8fa; }
        .post-row:last-child { border-bottom: none; }
        @media (max-width: 700px) {
          .admin-sidebar { display: none; }
          .admin-main { padding: 0.75rem; }
          .post-row { padding: 0.75rem 1rem; }
        }
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

      <div className="admin-layout">
        {/* Collapsible sidebar */}
        <div className="admin-sidebar">
          {/* Logo */}
          <div style={{ padding: "0 0.75rem", display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-start" : "center", borderBottom: `1px solid ${BORDER}`, height: 52, boxSizing: "border-box", flexShrink: 0 }}>
            <span style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 900, color: TEXT_DARK, letterSpacing: "-0.02em" }}>
              <span style={{ color: CRIMSON }}>i</span>{sidebarOpen ? "mago" : ""}
            </span>
          </div>
          {/* Nav items */}
          <div style={{ flex: 1, padding: "0.5rem 0.4rem", overflowY: "auto", overflowX: "hidden" }}>
            {([
              ["dashboard", "Posts", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>],
              ["welcome", "Welcome Note", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>],
              ["about", "About", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>],
              ["lately", "Lately", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>],
              ["media", "Media Library", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>],
              ["comments", "Comments", <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>],
            ] as [Panel, string, React.ReactNode][]).map(([panel, label, icon]) => (
              <button key={panel} onClick={() => tryNav(panel)} className={`admin-nav-btn${activePanel === panel ? " active" : ""}`} title={!sidebarOpen ? label : undefined}>
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{icon}</span>
                {sidebarOpen && <span>{label}</span>}
              </button>
            ))}
          </div>
          {/* Sign out */}
          <div style={{ padding: "0.75rem 0.4rem", borderTop: `1px solid ${BORDER}` }}>
            <button onClick={async () => { const { signOut } = await import("next-auth/react"); await signOut({ callbackUrl: "/admin/imago" }); }} className="admin-nav-btn" title={!sidebarOpen ? "Sign out" : undefined}>
              <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </span>
              {sidebarOpen && <span>Sign out</span>}
            </button>
          </div>
        </div>

        {/* Right side: top bar + main content */}
        <div className="admin-right" style={{ position: "relative" }}>
          {/* Toggle button — on the left edge of admin-right = sidebar border */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ position: "absolute", left: -14, top: 26, transform: "translateY(-50%)", background: "white", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 28, height: 28, display: isMobile ? "none" : "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED, zIndex: 250, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>
          {/* Top bar — desktop */}
          {!isMobile && (
            <div className="admin-mobile-bar">
              {/* Left: search */}
              <div style={{ width: 280, flexShrink: 0 }}>
                {activePanel === "dashboard" && (
                  <div style={{ position: "relative" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input placeholder="Search for stories…" value={query} onChange={e => setQuery(e.target.value)} style={{ fontFamily: FONT, fontSize: "0.82rem", padding: "0.38rem 0.8rem 0.38rem 2.1rem", border: `1px solid ${BORDER}`, borderRadius: 20, background: "#f5f8fa", color: TEXT_DARK, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
                  </div>
                )}
              </div>
              {/* Center: tabs */}
              <div style={{ flex: 1, display: "flex", justifyContent: "center", alignSelf: "stretch", alignItems: "flex-end" }}>
                {activePanel === "dashboard" && (["drafts", "scheduled", "published"] as const).map(tab => (
                  <button key={tab} onClick={() => setPostTab(tab)} style={{ background: "none", border: "none", borderBottom: `2px solid ${postTab === tab ? CRIMSON : "transparent"}`, marginBottom: -1, padding: "0.5rem 1rem", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: postTab === tab ? CRIMSON : TEXT_MUTED, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {tab === "drafts" ? "Drafts" : tab === "scheduled" ? "Scheduled" : "Published"}
                  </button>
                ))}
              </div>
              {/* Right: Create new (dashboard only) or panel title */}
              <div style={{ width: 280, flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                {activePanel === "dashboard" ? (
                  <button onClick={() => { if (isDirty && !confirm("Discard unsaved changes?")) return; startNew(); }}
                    style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.4rem 0.9rem", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    + Create new
                  </button>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: TEXT_DARK }}>
                    {activePanel === "media" ? "Media Library" : activePanel === "comments" ? "Comments" : activePanel === "welcome" ? "Welcome Note" : activePanel === "about" ? "About" : activePanel === "lately" ? "Lately" : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Top bar — mobile */}
          {isMobile && (
            <div style={{ position: "sticky", top: 0, zIndex: 200, background: "white", borderBottom: `1px solid ${BORDER}` }}>
              {/* Row 1: menu | logo | + new */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem", height: 52, boxSizing: "border-box" }}>
                <button onClick={() => setShowMobileNav(true)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DARK, padding: 0, display: "flex", alignItems: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <span style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 900, color: TEXT_DARK, letterSpacing: "-0.02em" }}>
                  <span style={{ color: CRIMSON }}>i</span>mago
                </span>
                {activePanel === "dashboard" ? (
                  <button onClick={() => { if (isDirty && !confirm("Discard unsaved changes?")) return; startNew(); }}
                    style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.35rem 0.85rem", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                    + New
                  </button>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: TEXT_MUTED }}>
                    {activePanel === "media" ? "Media Library" : activePanel === "welcome" ? "Welcome Note" : activePanel === "about" ? "About" : activePanel === "lately" ? "Lately" : activePanel === "comments" ? "Comments" : ""}
                  </span>
                )}
              </div>
              {/* Row 2: search (dashboard only) */}
              {activePanel === "dashboard" && (
                <div style={{ padding: "0 1rem 0.6rem" }}>
                  <div style={{ position: "relative" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} style={{ fontFamily: FONT, fontSize: "0.85rem", padding: "0.42rem 0.8rem 0.42rem 2.1rem", border: `1px solid ${BORDER}`, borderRadius: 20, background: "#f5f8fa", color: TEXT_DARK, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
                  </div>
                </div>
              )}
              {/* Row 3: tabs (dashboard only) */}
              {activePanel === "dashboard" && (
                <div style={{ display: "flex", borderTop: `1px solid ${BORDER}` }}>
                  {(["drafts", "scheduled", "published"] as const).map(tab => (
                    <button key={tab} onClick={() => setPostTab(tab)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${postTab === tab ? CRIMSON : "transparent"}`, padding: "0.6rem 0", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: postTab === tab ? CRIMSON : TEXT_MUTED, cursor: "pointer" }}>
                      {tab === "drafts" ? "Drafts" : tab === "scheduled" ? "Sched." : "Published"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mobile drawer */}
          {showMobileNav && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setShowMobileNav(false)}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
              <div style={{ position: "absolute", top: 0, left: 0, width: 260, height: "100%", background: "white", display: "flex", flexDirection: "column", overflowY: "auto", boxSizing: "border-box", boxShadow: "2px 0 12px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 900, color: TEXT_DARK }}><span style={{ color: CRIMSON }}>i</span>mago</span>
                  <button onClick={() => setShowMobileNav(false)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 0, display: "flex" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div style={{ padding: "0.75rem", flex: 1 }}>
                  {([["dashboard", "Posts"], ["welcome", "Welcome Note"], ["about", "About"], ["lately", "Lately"], ["media", "Media Library"], ["comments", "Comments"]] as [Panel, string][]).map(([panel, label]) => (
                    <button key={panel} onClick={() => { tryNav(panel); setShowMobileNav(false); }} style={{ display: "block", width: "100%", background: activePanel === panel ? "#f5f0f0" : "none", border: "none", textAlign: "left", padding: "0.75rem", fontFamily: FONT, fontSize: "1rem", fontWeight: activePanel === panel ? 700 : 500, color: activePanel === panel ? CRIMSON : TEXT_DARK, cursor: "pointer", borderRadius: 6, marginBottom: "0.1rem" }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ padding: "1rem 1.25rem", borderTop: `1px solid ${BORDER}` }}>
                  <button onClick={async () => { const { signOut } = await import("next-auth/react"); await signOut({ callbackUrl: "/admin/imago" }); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_MUTED, cursor: "pointer", padding: 0 }}>Sign out</button>
                </div>
              </div>
            </div>
          )}

        <div className="admin-main">

          {/* DASHBOARD */}
          {activePanel === "dashboard" && (
            <div style={{ maxWidth: 900 }}>

              {/* Count + sort row */}
              {(() => {
                const list = postTab === "drafts" ? drafts : postTab === "scheduled" ? scheduled : published;
                const filtered = query.trim() ? list.filter(p => p.headline.toLowerCase().includes(query.toLowerCase()) || p.subheadline?.toLowerCase().includes(query.toLowerCase())) : list;
                const label = postTab === "drafts" ? "draft" : postTab === "scheduled" ? "scheduled post" : "published post";
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, margin: 0, paddingLeft: "1rem" }}>{filtered.length} {filtered.length === 1 ? label : label + "s"}</p>
                    </div>
                    {/* Table header */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px", padding: "0.4rem 1rem" }}>
                      {["Name", "Section", "Date"].map(h => (
                        <span key={h} style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_MUTED }}>{h}</span>
                      ))}
                    </div>
                    {/* Rows */}
                    {filtered.length === 0 ? (
                      <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3rem", textAlign: "center", marginTop: "0.25rem" }}>
                        <p style={{ fontFamily: FONT, color: TEXT_MUTED, margin: 0 }}>{query ? `No results for "${query}"` : `No ${label}s yet.`}</p>
                      </div>
                    ) : (
                      <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginTop: "0.25rem" }}>
                        {filtered.map(post => (
                          <div key={post._id}
                            onClick={() => { if (isDirty && !confirm("Discard?")) return; startEdit(post); }}
                            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, post }); }}
                            style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 100px 80px" : "1fr 140px 120px", gap: isMobile ? "0 0.5rem" : "0 1rem", padding: "0.85rem 1rem", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", alignItems: "center" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                            onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, color: TEXT_DARK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.headline || <em style={{ color: TEXT_MUTED, fontWeight: 400 }}>No headline</em>}</p>
                                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, margin: 0 }}>{post.byline}</p>
                              </div>
                            </div>
                            <span style={{ fontFamily: FONT, fontSize: isMobile ? "0.7rem" : "0.8rem", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.section}</span>
                            <span style={{ fontFamily: FONT, fontSize: isMobile ? "0.7rem" : "0.8rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>{post.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* WELCOME EDITOR */}
          {activePanel === "welcome" && (
            <form onSubmit={e => { e.preventDefault(); startTransition(async () => { setSuccess(""); try { await saveWelcome(welcomeHeadline, welcomeBody); setSuccess("Saved!"); setTimeout(() => setSuccess(""), 2000); } catch { setError("Save failed"); } }); }} style={{ maxWidth: 600, background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>Welcome Note</h2>
              <div><label style={LABEL}>Headline</label><input style={INPUT} value={welcomeHeadline} onChange={e => setWelcomeHeadline(e.target.value)} /></div>
              <div><label style={LABEL}>Body</label><textarea style={{ ...INPUT, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} value={welcomeBody} onChange={e => setWelcomeBody(e.target.value)} /></div>
              {success && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#2e7d32", margin: 0 }}>{success}</p>}
              {error && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.2rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" }}>{isPending ? "Saving…" : "Save"}</button>
            </form>
          )}

          {/* ABOUT EDITOR */}
          {activePanel === "about" && (
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(); fd.set("body", JSON.stringify(tiptapToPortableText(aboutDoc))); startTransition(async () => { try { await saveAbout(fd); setSuccess("Saved!"); setTimeout(() => setSuccess(""), 2000); } catch (err: any) { setError(err.message); } }); }} style={{ maxWidth: 600, background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>About Page</h2>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.1rem", padding: "0.35rem 0.5rem", background: "#fafafa", borderBottom: `1px solid ${BORDER}` }}>
                  <button type="button" title="Bold" onMouseDown={e => { e.preventDefault(); aboutEditor?.chain().focus().toggleBold().run(); }} style={{ background: aboutEditor?.isActive("bold") ? "#efefef" : "none", border: "none", borderRadius: 3, width: 30, height: 30, cursor: "pointer", color: aboutEditor?.isActive("bold") ? CRIMSON : TEXT_MUTED, fontWeight: 700, fontSize: "1rem", fontFamily: FONT }}>B</button>
                  <button type="button" title="Italic" onMouseDown={e => { e.preventDefault(); aboutEditor?.chain().focus().toggleItalic().run(); }} style={{ background: aboutEditor?.isActive("italic") ? "#efefef" : "none", border: "none", borderRadius: 3, width: 30, height: 30, cursor: "pointer", color: aboutEditor?.isActive("italic") ? CRIMSON : TEXT_MUTED, fontStyle: "italic", fontSize: "1rem", fontFamily: FONT }}>I</button>
                  <button type="button" title="Heading" onMouseDown={e => { e.preventDefault(); aboutEditor?.chain().focus().toggleHeading({ level: 2 }).run(); }} style={{ background: aboutEditor?.isActive("heading", { level: 2 }) ? "#efefef" : "none", border: "none", borderRadius: 3, padding: "0 6px", height: 30, cursor: "pointer", color: aboutEditor?.isActive("heading", { level: 2 }) ? CRIMSON : TEXT_MUTED, fontWeight: 700, fontSize: "0.85rem", fontFamily: FONT }}>H2</button>
                  <div style={{ width: 1, height: 18, background: BORDER, margin: "0 0.25rem" }} />
                  <button type="button" title="Link" onMouseDown={e => { e.preventDefault(); aboutToolbar?.openLink(); }} style={{ background: aboutEditor?.isActive("link") ? "#efefef" : "none", border: "none", borderRadius: 3, width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: aboutEditor?.isActive("link") ? CRIMSON : TEXT_MUTED }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                </div>
                <div style={{ minHeight: 240, padding: "1rem 1.1rem" }}>
                  <RichBodyEditor initialContent={aboutDoc} onChange={setAboutDoc} onEditor={setAboutEditor} onToolbar={setAboutToolbar} />
                </div>
              </div>
              {success && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#2e7d32", margin: 0 }}>{success}</p>}
              {error && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.2rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" }}>{isPending ? "Saving…" : "Save"}</button>
            </form>
          )}

          {/* LATELY EDITOR */}
          {activePanel === "lately" && (
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(); fd.set("reading", latelyReading); fd.set("readingAuthor", latelyReadingAuthor); fd.set("readingUrl", latelyReadingUrl); fd.set("listening", latelyListening); fd.set("listeningArtist", latelyListeningArtist); fd.set("listeningUrl", latelyListeningUrl); fd.set("watching", latelyWatching); fd.set("watchingUrl", latelyWatchingUrl); startTransition(async () => { try { await saveLately(fd); setSuccess("Saved!"); setTimeout(() => setSuccess(""), 2000); } catch (err: any) { setError(err.message); } }); }} style={{ maxWidth: 600, background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: 0 }}>Lately</h2>
              {([
                { label: "Reading", fields: [
                  { key: "reading", label: "Book title", val: latelyReading, set: setLatelyReading },
                  { key: "readingUrl", label: "Link (optional)", val: latelyReadingUrl, set: setLatelyReadingUrl, placeholder: "https://…" },
                  { key: "readingAuthor", label: "Author", val: latelyReadingAuthor, set: setLatelyReadingAuthor },
                ]},
                { label: "Listening", fields: [
                  { key: "listening", label: "Song / album title", val: latelyListening, set: setLatelyListening },
                  { key: "listeningUrl", label: "Link (optional)", val: latelyListeningUrl, set: setLatelyListeningUrl, placeholder: "https://…" },
                  { key: "listeningArtist", label: "Artist", val: latelyListeningArtist, set: setLatelyListeningArtist },
                ]},
                { label: "Watching", fields: [
                  { key: "watching", label: "Title", val: latelyWatching, set: setLatelyWatching },
                  { key: "watchingUrl", label: "Link (optional)", val: latelyWatchingUrl, set: setLatelyWatchingUrl, placeholder: "https://…" },
                ]},
              ] as { label: string; fields: { key: string; label: string; val: string; set: (v: string) => void; placeholder?: string }[] }[]).map(section => (
                <div key={section.label} style={{ border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ padding: "0.5rem 0.85rem", background: "#fafafa", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: CRIMSON }}>{section.label}</span>
                  </div>
                  <div style={{ padding: "1rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {section.fields.map(f => (
                      <div key={f.key}>
                        <label style={LABEL}>{f.label}</label>
                        <input style={INPUT} value={f.val} placeholder={f.placeholder ?? ""} onChange={e => f.set(e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {success && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#2e7d32", margin: 0 }}>{success}</p>}
              {error && <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, margin: 0 }}>{error}</p>}
              <button type="submit" disabled={isPending} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.6rem 1.2rem", fontFamily: FONT, fontSize: "0.9rem", cursor: "pointer", alignSelf: "flex-start" }}>{isPending ? "Saving…" : "Save"}</button>
            </form>
          )}

          {/* MEDIA LIBRARY */}
          {activePanel === "media" && (() => {
            const q = mediaSearch.toLowerCase();
            const filtered = mediaAssets.filter(a =>
              !q ||
              (a.originalFilename ?? "").toLowerCase().includes(q) ||
              (a.altText ?? "").toLowerCase().includes(q) ||
              (a.description ?? "").toLowerCase().includes(q) ||
              a.url.toLowerCase().includes(q)
            );

            const detailContent = inspectAsset ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${inspectAsset.url}?w=560&auto=format`} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4 }} />
                <div>
                  <label style={LABEL}>Alt text</label>
                  <textarea style={{ ...INPUT, minHeight: 52, resize: "vertical" }} value={inspectAltText} onChange={e => setInspectAltText(e.target.value)} onBlur={() => updateMediaAsset(inspectAsset._id, { altText: inspectAltText }).catch(() => {})} placeholder="Describe for screen readers" />
                </div>
                <div>
                  <label style={LABEL}>Caption &amp; credit</label>
                  <textarea style={{ ...INPUT, minHeight: 60, resize: "vertical" }} defaultValue={inspectAsset.description ?? ""} key={inspectAsset._id + "_desc"} onBlur={e => updateMediaAsset(inspectAsset._id, { description: e.target.value }).catch(() => {})} />
                </div>
                <div>
                  <label style={LABEL}>Date added</label>
                  <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: TEXT_MUTED, margin: 0 }}>{new Date(inspectAsset._createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <div>
                  <label style={LABEL}>Recently used in</label>
                  {(inspectAsset.usedIn ?? []).length === 0
                    ? <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: TEXT_MUTED, margin: 0 }}>—</p>
                    : (inspectAsset.usedIn ?? []).map(p => (
                      <a key={p.slug} href={`/stories/${p.slug}`} target="_blank" rel="noreferrer" style={{ display: "block", fontFamily: FONT, fontSize: "0.82rem", color: CRIMSON, textDecoration: "none", marginBottom: "0.2rem" }}>{p.headline || p.slug}</a>
                    ))
                  }
                </div>
                <div>
                  <label style={LABEL}>Image URL</label>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <input readOnly style={{ ...INPUT, flex: 1, color: TEXT_MUTED, fontSize: "0.72rem" }} value={inspectAsset.url} />
                    <button type="button" onClick={() => { navigator.clipboard.writeText(inspectAsset.url).catch(() => {}); setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); }} style={{ background: urlCopied ? "#6a0000" : CRIMSON, border: "none", borderRadius: 4, padding: "0 0.65rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: "white", whiteSpace: "nowrap", transition: "background 0.15s" }}>{urlCopied ? "Copied!" : "Copy"}</button>
                  </div>
                </div>
                <button type="button" onClick={() => { if (confirm("Delete permanently?")) deleteMediaAsset(inspectAsset._id).then(() => { const next = mediaAssets.filter(a => a._id !== inspectAsset._id); setMediaAssets(next); setInspectAsset(next[0] ?? null); setInspectAltText(next[0]?.altText ?? ""); }).catch(() => {}); }} style={{ background: "none", border: `1px solid #f5a5a5`, borderRadius: 4, padding: "0.4rem 0.75rem", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: CRIMSON, alignSelf: "flex-start" }}>Delete image</button>
              </div>
            ) : null;

            return (
              <>
                {/* Mobile: detail panel as overlay */}
                {isMobile && inspectAsset && (
                  <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.5)", overflowY: "auto", padding: "1rem" }} onClick={e => { if (e.target === e.currentTarget) setInspectAsset(null); }}>
                    <div style={{ background: "white", borderRadius: 8, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: TEXT_DARK }}>Image detail</span>
                        <button onClick={() => setInspectAsset(null)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, fontSize: "1.5rem", lineHeight: 1, padding: 0 }}>×</button>
                      </div>
                      {detailContent}
                    </div>
                  </div>
                )}

                {/* Desktop: side-by-side layout */}
                <div style={{ display: "flex", gap: 0, height: "100%", minHeight: 0 }}>
                  {/* Grid */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", paddingRight: isMobile ? 0 : "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <input type="search" placeholder="Search by name, alt text, or URL…" value={mediaSearch} onChange={e => setMediaSearch(e.target.value)} style={{ ...INPUT, flex: 1, minWidth: 140, fontSize: "0.82rem" }} />
                      <input ref={mediaFileRef} type="file" accept="image/*" onChange={handleMediaUpload} style={{ display: "none" }} />
                      <button type="button" onClick={() => mediaFileRef.current?.click()} disabled={mediaUploading} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 4, padding: "0.5rem 1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>{mediaUploading ? "Uploading…" : "+ Upload"}</button>
                    </div>
                    {mediaLoading ? <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p> : filtered.length === 0 ? <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>{mediaSearch ? "No results." : "No images yet."}</p> : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem" }}>
                        {filtered.map(asset => (
                          <div key={asset._id}
                            onClick={() => { setInspectAsset(asset); setInspectAltText(asset.altText ?? ""); setUrlCopied(false); }}
                            style={{ cursor: "pointer", borderRadius: 4, overflow: "hidden", border: `2px solid ${inspectAsset?._id === asset._id ? CRIMSON : BORDER}`, background: "white", transition: "border-color 0.1s" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${asset.url}?w=280&h=160&fit=crop&auto=format`} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Desktop detail panel */}
                  {!isMobile && inspectAsset && (
                    <div style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${BORDER}`, paddingLeft: "1.5rem", overflowY: "auto" }}>
                      {detailContent}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* COMMENTS */}
          {activePanel === "comments" && (
            <div style={{ maxWidth: 700 }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1.2rem", color: TEXT_DARK, margin: "0 0 1.25rem" }}>Comments</h2>
              {commentsLoading ? (
                <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p>
              ) : adminComments.length === 0 ? (
                <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>No comments yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {adminComments.map(c => (
                    <div key={c._id} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.78rem", color: CRIMSON, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.name}</span>
                          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED }}>on <a href={`/stories/${c.slug}`} target="_blank" rel="noreferrer" style={{ color: TEXT_MUTED }}>{c.slug}</a></span>
                          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED }}>{new Date(c._createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                        <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: "#2d2d2d", margin: 0, lineHeight: 1.6 }}>{c.text}</p>
                      </div>
                      <button
                        onClick={() => { if (!confirm("Delete this comment?")) return; startTransition(async () => { await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c._id }) }); setAdminComments(prev => prev.filter(x => x._id !== c._id)); }); }}
                        style={{ flexShrink: 0, background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.3rem 0.6rem", fontFamily: FONT, fontSize: "0.78rem", color: CRIMSON, cursor: "pointer" }}
                      >Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POST EDITOR is now at /admin/imago/posts/[id] and /admin/imago/posts/new */}
          {activePanel === "editor" && (
            <div style={{ margin: "-2rem", minHeight: "100%", display: "flex", flexDirection: "column", background: "white" }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>

                {/* Top bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", borderBottom: `1px solid ${BORDER}`, height: 52, boxSizing: "border-box", flexShrink: 0, background: "white" }}>
                  {/* Left: go back */}
                  <button type="button" onClick={() => { if (!isDirty || confirm("Discard?")) { setActivePanel("dashboard"); setEditing(null); setIsDirty(false); } }} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, color: TEXT_MUTED, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Go back
                  </button>
                  {/* Right: actions */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {editing && editing.status !== "trashed" && (
                      <button type="button" onClick={() => { if (confirm("Move to trash?")) startTransition(async () => { await trashPost(editing._id); refreshPosts(); setActivePanel("dashboard"); setEditing(null); }); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: TEXT_MUTED }}>Trash</button>
                    )}
<button type="button" onClick={() => setShowPreview(true)} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: TEXT_MUTED }}>Preview</button>
                    <div style={{ position: "relative" }}>
                      <button type="button" onClick={() => setShowScheduler(s => !s)} style={{ background: "white", border: `1px solid ${showScheduler ? CRIMSON : BORDER}`, borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: showScheduler ? CRIMSON : TEXT_MUTED }}>Schedule</button>
                      {showScheduler && (
                        <div style={{ position: "absolute", top: "calc(100% + 0.4rem)", right: 0, zIndex: 20, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.75rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 240 }}>
                          <label style={{ ...LABEL, marginBottom: "0.4rem" }}>Publish at</label>
                          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ ...INPUT, marginBottom: "0.5rem" }} />
                          <button type="submit" disabled={!scheduledAt || isPending} onClick={() => { submitStatusRef.current = "scheduled"; setShowScheduler(false); }} style={{ width: "100%", background: "#1565c0", color: "white", border: "none", borderRadius: 4, padding: "0.45rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer" }}>Confirm schedule</button>
                        </div>
                      )}
                    </div>
                    <button type="submit" disabled={isPending || uploadingImage} onClick={() => { submitStatusRef.current = "draft"; }} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.3rem 0.85rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_MUTED }}>{isPending ? "Saving…" : "Save draft"}</button>
                    <button type="submit" disabled={isPending || uploadingImage} onClick={() => { submitStatusRef.current = "published"; setShowScheduler(false); }} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.3rem 1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Publish</button>
                  </div>
                </div>

                {/* Body: left section nav + canvas */}
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                  {/* Left section nav */}
                  <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${BORDER}`, padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "0.25rem", overflowY: "auto" }}>
                    <p style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, margin: "0 0 0.5rem 1rem", opacity: 0.7 }}>Required</p>
                    {(["content", "metadata"] as const).map(tab => (
                      <button key={tab} type="button" onClick={() => setEditorTab(tab)}
                        style={{ display: "block", width: "100%", background: "none", border: "none", borderLeft: `3px solid ${editorTab === tab ? CRIMSON : "transparent"}`, textAlign: "left", padding: "0.5rem 1rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: editorTab === tab ? 600 : 400, color: editorTab === tab ? CRIMSON : TEXT_DARK, cursor: "pointer" }}>
                        {tab === "content" ? "Story content" : "Metadata"}
                      </button>
                    ))}
                    {success && <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#2e7d32", margin: "1rem 1rem 0", lineHeight: 1.4 }}>{success}</p>}
                    {error && <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: CRIMSON, margin: "1rem 1rem 0", lineHeight: 1.4 }}>{error}</p>}
                  </div>

                  {/* Canvas */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "3rem 4rem", maxWidth: 800 }}>

                    {editorTab === "content" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        {/* Headline */}
                        <input
                          placeholder="Type your headline"
                          style={{ fontFamily: FONT, fontSize: "2rem", fontWeight: 700, color: TEXT_DARK, border: "none", outline: "none", width: "100%", background: "transparent", lineHeight: 1.2 }}
                          value={form.headline}
                          onChange={e => updateForm({ headline: e.target.value, ...(!editing ? { slug: slugify(e.target.value) } : {}) })}
                          required
                        />
                        {/* Photo */}
                        {!imagePreview ? (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="button" onClick={() => fileRef.current?.click()} style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.4rem 1rem", cursor: "pointer" }}>
                              {uploadingImage ? "Uploading…" : "+ Add a featured image"}
                            </button>
                            <button type="button" onClick={() => { setShowPhotoPicker(true); setPhotoPickerLoading(true); fetch("/api/media").then(r => r.json()).then(d => { if (Array.isArray(d)) setPhotoPickerAssets(d); }).catch(() => {}).finally(() => setPhotoPickerLoading(false)); }} style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.4rem 1rem", cursor: "pointer" }}>Choose from library</button>
                          </div>
                        ) : (
                          <div>
                            {imagePreview !== "existing" ? <img src={imagePreview} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 6 }} /> : <div style={{ padding: "0.75rem", background: "#f5f8fa", borderRadius: 6, fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED }}>Existing photo attached</div>}
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                              <input placeholder="Caption" style={{ ...INPUT, flex: 1, minWidth: 140 }} value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
                              <input placeholder="Alt text" style={{ ...INPUT, flex: 1, minWidth: 140 }} value={imageAlt} onChange={e => setImageAlt(e.target.value)} />
                              <button type="button" onClick={() => fileRef.current?.click()} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", color: TEXT_MUTED }}>Change</button>
                              <button type="button" onClick={() => { setImagePreview(""); setImageAssetId(""); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", color: TEXT_MUTED }}>Remove</button>
                            </div>
                          </div>
                        )}
                        {/* Body */}
                        <div>
                          <RichBodyEditor initialContent={form.body} onChange={doc => updateForm({ body: doc })} />
                        </div>
                      </div>
                    )}

                    {editorTab === "metadata" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div><label style={LABEL}>Subheadline</label><input style={INPUT} value={form.subheadline} onChange={e => updateForm({ subheadline: e.target.value })} /></div>
                        <div><label style={LABEL}>Byline</label><input style={INPUT} value={form.byline} onChange={e => updateForm({ byline: e.target.value })} /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                          <div><label style={LABEL}>Slug</label><input style={INPUT} value={form.slug} onChange={e => updateForm({ slug: e.target.value })} required /></div>
                          <div><label style={LABEL}>Section</label><select style={INPUT} value={form.section} onChange={e => updateForm({ section: e.target.value })}><option>Micro-Memoir</option><option>Narratives</option></select></div>
                          <div><label style={LABEL}>Date</label><input type="date" style={INPUT} value={form.date} onChange={e => updateForm({ date: e.target.value })} required /></div>
                        </div>
                        {editing && editing.status === "trashed" && (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button type="button" onClick={() => startTransition(async () => { await restorePost(editing._id); refreshPosts(); setActivePanel("dashboard"); setEditing(null); })} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.3rem 0.6rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: TEXT_DARK }}>Restore</button>
                            <button type="button" onClick={() => { if (confirm("Delete FOREVER?")) startTransition(async () => { await deletePost(editing._id); refreshPosts(); setActivePanel("dashboard"); setEditing(null); }); }} style={{ background: "none", border: "1px solid #f5a5a5", borderRadius: 4, padding: "0.3rem 0.6rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: CRIMSON }}>Delete forever</button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
        </div>{/* end admin-right */}
      </div>{/* end admin-layout */}

      {/* Right-click context menu */}
      {contextMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500 }} onClick={() => setContextMenu(null)} onContextMenu={e => { e.preventDefault(); setContextMenu(null); }}>
          <div style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.14)", minWidth: 180, overflow: "hidden", zIndex: 501 }} onClick={e => e.stopPropagation()}>
            {contextMenu.post.status === "draft" ? (
              <>
                <button onClick={() => { const p = contextMenu.post; setContextMenu(null); window.open(`/stories/${p.slug}/preview`, "_blank"); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Preview</button>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <button onClick={() => { const p = contextMenu.post; setContextMenu(null); if (confirm(`Delete "${p.headline || "this draft"}"?`)) startTransition(async () => { await deletePost(p._id); refreshPosts(); }); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete draft</button>
              </>
            ) : (
              <>
                <button onClick={() => { setContextMenu(null); router.push(`/admin/imago/posts/${contextMenu.post.slug}`); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Open</button>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <button onClick={() => { const p = contextMenu.post; setContextMenu(null); if (confirm(`Delete "${p.headline || "this post"}"? This cannot be undone.`)) startTransition(async () => { await deletePost(p._id); refreshPosts(); }); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete</button>
              </>
            )}
          </div>
        </div>
      )}
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
    </div>
  );
}
