"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { savePost, deletePost, trashPost, restorePost, uploadImage } from "./actions";
import { tiptapToPortableText, portableTextToTiptap } from "@/lib/tiptapConvert";
import RichBodyEditor from "@/components/RichBodyEditor";
import type { JSONContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
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

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

type FormState = {
  headline: string; subheadline: string; byline: string; slug: string;
  section: string; date: string; body: JSONContent;
  status: "draft" | "published" | "scheduled"; pinned: boolean;
};

type VersionEntry = { savedAt: string; type: "autosave" | "publish" };
type MediaAsset = { _id: string; url: string; originalFilename?: string };

function versionsKey(slug: string) { return `efemera_versions_${slug}`; }
function loadVersions(slug: string): VersionEntry[] {
  try { return JSON.parse(localStorage.getItem(versionsKey(slug)) ?? "[]"); } catch { return []; }
}
function appendVersion(slug: string, entry: VersionEntry) {
  try {
    const v = loadVersions(slug);
    v.unshift(entry);
    localStorage.setItem(versionsKey(slug), JSON.stringify(v.slice(0, 20)));
  } catch {}
}

export default function EditorClient({ post }: { post: SanityPost }) {
  const router = useRouter();

  const initialForm: FormState = {
    headline: post.headline ?? "",
    subheadline: post.subheadline ?? "",
    byline: post.byline ?? "Yacob Reyes",
    slug: post.slug,
    section: post.section ?? "Narratives",
    date: post.date ?? new Date().toISOString().slice(0, 10),
    body: post.body?.length ? portableTextToTiptap(post.body) : EMPTY_DOC,
    status: post.status === "published" || !post.status ? "published" : post.status === "scheduled" ? "scheduled" : "draft",
    pinned: post.pinned ?? false,
  };

  const [form, setForm] = useState<FormState>(initialForm);
  const [lastSaved, setLastSaved] = useState<FormState>(initialForm);
  const [editorTab, setEditorTab] = useState<"content" | "metadata" | "versions">("content");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isPending, startTransition] = useTransition();
  const [showEllipsis, setShowEllipsis] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(post.scheduledAt?.slice(0, 16) ?? "");
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  // Popup for re-publishing: ask whether to update publish date
  const [showPublishTimeModal, setShowPublishTimeModal] = useState(false);

  const [imageCaption, setImageCaption] = useState(post.image?.caption ?? "");
  const [imageAlt, setImageAlt] = useState(post.image?.alt ?? "");
  const [imagePreview, setImagePreview] = useState(post.image?.asset ? "existing" : "");
  const [imageAssetId, setImageAssetId] = useState(post.image?.asset?._ref ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalTab, setImageModalTab] = useState<"library" | "upload">("library");
  const [photoPickerAssets, setPhotoPickerAssets] = useState<MediaAsset[]>([]);
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadingNew, setUploadingNew] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    setVersions(loadVersions(post.slug));
  }, [post.slug]);

  function updateForm(patch: Partial<FormState>) { setForm(prev => ({ ...prev, ...patch })); }

  const isDirty = JSON.stringify(form) !== JSON.stringify(lastSaved);

  const doSave = useCallback((status: "draft" | "published" | "scheduled", updateDate = false) => {
    setSaveStatus("saving");
    const fd = new FormData();
    const { body, ...rest } = form;
    const saveDate = (status === "published" && updateDate) ? new Date().toISOString().slice(0, 10) : form.date;
    Object.entries({ ...rest, status, date: saveDate }).forEach(([k, v]) => fd.set(k, String(v)));
    fd.set("body", JSON.stringify(tiptapToPortableText(body)));
    fd.set("id", post._id);
    if (imageAssetId) fd.set("imageAssetId", imageAssetId);
    if (imageCaption) fd.set("imageCaption", imageCaption);
    if (imageAlt) fd.set("imageAlt", imageAlt);
    if (status === "scheduled" && scheduledAt) fd.set("scheduledAt", new Date(scheduledAt).toISOString());
    startTransition(async () => {
      try {
        await savePost(fd);
        const entry: VersionEntry = { savedAt: new Date().toISOString(), type: status === "published" ? "publish" : "autosave" };
        appendVersion(post.slug, entry);
        setVersions(loadVersions(post.slug));
        setLastSaved({ ...form, status, date: saveDate });
        setForm(f => ({ ...f, status, date: saveDate }));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    });
  }, [form, post._id, imageAssetId, imageCaption, imageAlt, scheduledAt]);

  // Auto-save every 5s when dirty
  useEffect(() => {
    if (!isDirty) return;
    setSaveStatus("unsaved");
    const timer = setTimeout(() => {
      doSave(form.status === "published" ? "published" : "draft");
    }, 1500);
    return () => clearTimeout(timer);
  }, [form, imageAssetId, imageCaption, imageAlt]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImagePreview(URL.createObjectURL(file)); setUploadingImage(true);
    try {
      const fd = new FormData(); fd.set("file", file);
      const { assetId } = await uploadImage(fd); setImageAssetId(assetId);
    } catch { /* silent */ }
    finally { setUploadingImage(false); }
  }

  function openImageModal() {
    setImageModalTab("library");
    setSelectedAsset(null);
    setUploadFile(null);
    setUploadPreviewUrl("");
    setUploadCaption(imageCaption);
    setUploadAlt(imageAlt);
    setShowImageModal(true);
    setPhotoPickerLoading(true);
    fetch("/api/media").then(r => r.json()).then(d => { if (Array.isArray(d)) setPhotoPickerAssets(d); }).catch(() => {}).finally(() => setPhotoPickerLoading(false));
  }

  function handleUploadFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUseImage() {
    if (imageModalTab === "library" && selectedAsset) {
      setImageAssetId(selectedAsset._id);
      setImagePreview(selectedAsset.url);
      setImageCaption(uploadCaption);
      setImageAlt(uploadAlt);
      setShowImageModal(false);
    } else if (imageModalTab === "upload" && uploadFile) {
      if (!uploadCaption.trim()) { alert("Please add a caption before using this image."); return; }
      setUploadingNew(true);
      try {
        const fd = new FormData(); fd.set("file", uploadFile);
        const { assetId } = await uploadImage(fd);
        setImageAssetId(assetId);
        setImagePreview(uploadPreviewUrl);
        setImageCaption(uploadCaption);
        setImageAlt(uploadAlt);
        setShowImageModal(false);
      } catch { /* silent */ }
      finally { setUploadingNew(false); }
    }
  }

  function handlePublishClick() {
    // Already published → ask about publish date
    if (initialForm.status === "published") {
      setShowPublishTimeModal(true);
    } else {
      doSave("published", true);
    }
  }

  const statusLabel = saveStatus === "saving" ? "Saving…" : saveStatus === "unsaved" ? "Unsaved" : "Saved";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "white", fontFamily: FONT }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", borderBottom: `1px solid ${BORDER}`, height: 52, boxSizing: "border-box", flexShrink: 0, background: "white" }}>
        <button type="button" onClick={() => router.push("/admin")} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, color: TEXT_MUTED, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Go back
        </button>

        {/* Formatting toolbar — only shown on story content tab */}
        {editorTab === "content" && editor && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
            <div style={{ width: 1, height: 20, background: BORDER, margin: "0 0.5rem" }} />
            {([
              ["B", "Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), { fontWeight: 700 }],
              ["I", "Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), { fontStyle: "italic" }],
            ] as [string, string, boolean, () => void, React.CSSProperties][]).map(([label, title, active, action, style]) => (
              <button key={label} type="button" title={title} onMouseDown={e => { e.preventDefault(); action(); }}
                style={{ background: active ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: active ? CRIMSON : TEXT_MUTED, fontFamily: FONT, fontSize: "0.85rem", ...style }}>
                {label}
              </button>
            ))}
            {/* Quote */}
            <button type="button" title="Blockquote" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
              style={{ background: editor.isActive("blockquote") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: editor.isActive("blockquote") ? CRIMSON : TEXT_MUTED }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
            </button>
            {/* H2 */}
            <button type="button" title="Heading 2" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
              style={{ background: editor.isActive("heading", { level: 2 }) ? "#f0f0f0" : "none", border: "none", borderRadius: 4, padding: "0 6px", height: 28, display: "flex", alignItems: "center", cursor: "pointer", color: editor.isActive("heading", { level: 2 }) ? CRIMSON : TEXT_MUTED, fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700 }}>
              H2
            </button>
            <div style={{ width: 1, height: 20, background: BORDER, margin: "0 0.25rem" }} />
            {/* Bullet list */}
            <button type="button" title="Bullet list" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
              style={{ background: editor.isActive("bulletList") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: editor.isActive("bulletList") ? CRIMSON : TEXT_MUTED }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            {/* Numbered list */}
            <button type="button" title="Numbered list" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
              style={{ background: editor.isActive("orderedList") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: editor.isActive("orderedList") ? CRIMSON : TEXT_MUTED }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
            </button>
            <div style={{ width: 1, height: 20, background: BORDER, margin: "0 0.5rem" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_MUTED }}>{statusLabel}</span>
          <button
            type="button"
            disabled={isPending || uploadingImage}
            onClick={handlePublishClick}
            style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.35rem 1.1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
          >
            Publish
          </button>
          {/* Ellipsis menu */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowEllipsis(v => !v)}
              style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
            </button>
            {showEllipsis && (
              <div style={{ position: "absolute", top: "calc(100% + 0.4rem)", right: 0, zIndex: 100, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden" }} onClick={() => setShowEllipsis(false)}>
                <button type="button" onClick={() => { setShowEllipsis(false); doSave(form.status === "published" ? "published" : "draft"); setTimeout(() => window.open(`/stories/${form.slug}`, "_blank"), 800); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Preview</button>
                <button type="button" onClick={() => { setShowEllipsis(false); setShowScheduler(true); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Schedule</button>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                {post.status !== "trashed" ? (
                  <button type="button" onClick={() => { if (confirm(`Delete this post? This cannot be undone.`)) startTransition(async () => { await deletePost(post._id); router.push("/admin"); }); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete</button>
                ) : (
                  <>
                    <button type="button" onClick={() => startTransition(async () => { await restorePost(post._id); router.push("/admin"); })} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Restore</button>
                    <button type="button" onClick={() => { if (confirm("Delete forever?")) startTransition(async () => { await deletePost(post._id); router.push("/admin"); }); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete forever</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publish time modal */}
      {showPublishTimeModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowPublishTimeModal(false)}>
          <div style={{ background: "white", borderRadius: 10, padding: "1.75rem", width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1rem", margin: "0 0 0.5rem", color: TEXT_DARK }}>Update publish time?</p>
            <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, margin: "0 0 1.5rem", lineHeight: 1.5 }}>This story was originally published on <strong>{form.date}</strong>. Do you want to update the publish date to today?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button type="button" onClick={() => { setShowPublishTimeModal(false); doSave("published", true); }} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>
                Update to today ({new Date().toISOString().slice(0, 10)})
              </button>
              <button type="button" onClick={() => { setShowPublishTimeModal(false); doSave("published", false); }} style={{ background: "white", color: TEXT_DARK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.88rem", cursor: "pointer" }}>
                Keep original ({form.date})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {showScheduler && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowScheduler(false)}>
          <div style={{ background: "white", borderRadius: 8, padding: "1.5rem", width: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: FONT, fontWeight: 700, margin: "0 0 1rem", color: TEXT_DARK }}>Schedule post</p>
            <label style={LABEL}>Publish at</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ ...INPUT, marginBottom: "0.75rem" }} />
            <button type="button" disabled={!scheduledAt || isPending} onClick={() => { setShowScheduler(false); doSave("scheduled"); }} style={{ width: "100%", background: CRIMSON, color: "white", border: "none", borderRadius: 6, padding: "0.5rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Confirm schedule</button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowPreview(false)}>
          <div style={{ background: "white", borderRadius: 8, maxWidth: 680, width: "90%", padding: "2.5rem", maxHeight: "85vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>
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

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }} onClick={() => setShowEllipsis(false)}>
        {/* Left section nav */}
        <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "1.25rem 0 0.5rem" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, margin: "0 0 0.4rem 1rem", opacity: 0.7 }}>Required</p>
            {(["content", "metadata"] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setEditorTab(tab)}
                style={{ display: "block", width: "100%", background: "none", border: "none", borderLeft: `3px solid ${editorTab === tab ? CRIMSON : "transparent"}`, textAlign: "left", padding: "0.5rem 1rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: editorTab === tab ? 600 : 400, color: editorTab === tab ? CRIMSON : TEXT_DARK, cursor: "pointer" }}>
                {tab === "content" ? "Story content" : "Metadata"}
              </button>
            ))}
          </div>
          <div style={{ padding: "1rem 0 0.5rem", borderTop: `1px solid ${BORDER}`, marginTop: "0.75rem" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, margin: "0 0 0.4rem 1rem", opacity: 0.7 }}>History</p>
            <button type="button" onClick={() => setEditorTab("versions")}
              style={{ display: "block", width: "100%", background: "none", border: "none", borderLeft: `3px solid ${editorTab === "versions" ? CRIMSON : "transparent"}`, textAlign: "left", padding: "0.5rem 1rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: editorTab === "versions" ? 600 : 400, color: editorTab === "versions" ? CRIMSON : TEXT_DARK, cursor: "pointer" }}>
              Previous drafts
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "3rem 4rem" }}>
          {editorTab === "content" && (
            <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <input
                  placeholder="Type your headline"
                  style={{ fontFamily: FONT, fontSize: "2rem", fontWeight: 700, color: TEXT_DARK, border: "none", outline: "none", width: "100%", background: "transparent", lineHeight: 1.2, padding: 0, margin: 0 }}
                  value={form.headline}
                  onChange={e => updateForm({ headline: e.target.value, ...(post.slug.startsWith("untitled-") ? { slug: slugify(e.target.value) || post.slug } : {}) })}
                />
                <input
                  placeholder="Type your subheadline"
                  style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 400, color: TEXT_MUTED, border: "none", outline: "none", width: "100%", background: "transparent", lineHeight: 1.4, padding: 0, margin: 0 }}
                  value={form.subheadline}
                  onChange={e => updateForm({ subheadline: e.target.value })}
                />
              </div>
              {!imagePreview ? (
                <button type="button" onClick={openImageModal} style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.4rem 1rem", cursor: "pointer", alignSelf: "flex-start" }}>
                  + Add a featured image
                </button>
              ) : (
                <div>
                  {imagePreview !== "existing" ? <img src={imagePreview} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 6 }} /> : <div style={{ padding: "0.75rem", background: "#f5f8fa", borderRadius: 6, fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED }}>Existing photo attached</div>}
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input placeholder="Caption" style={{ ...INPUT, flex: 1, minWidth: 140 }} value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
                    <input placeholder="Alt text" style={{ ...INPUT, flex: 1, minWidth: 140 }} value={imageAlt} onChange={e => setImageAlt(e.target.value)} />
                    <button type="button" onClick={openImageModal} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", color: TEXT_MUTED }}>Change</button>
                    <button type="button" onClick={() => { setImagePreview(""); setImageAssetId(""); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", color: TEXT_MUTED }}>Remove</button>
                  </div>
                </div>
              )}
              <RichBodyEditor initialContent={form.body} onChange={doc => updateForm({ body: doc })} onEditor={setEditor} />
            </div>
          )}

          {editorTab === "metadata" && (
            <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <label style={LABEL}>Section</label>
                <select style={INPUT} value={form.section} onChange={e => updateForm({ section: e.target.value })}>
                  <option>Micro-Memoir</option>
                  <option>Narratives</option>
                </select>
              </div>
              <div><label style={LABEL}>Author</label><input style={INPUT} value={form.byline} onChange={e => updateForm({ byline: e.target.value })} /></div>
              <div><label style={LABEL}>Slug</label><input style={INPUT} value={form.slug.startsWith("untitled-") && !form.headline ? "" : form.slug} onChange={e => updateForm({ slug: e.target.value })} placeholder="auto-generated from headline" /></div>
            </div>
          )}

          {editorTab === "versions" && (
            <div style={{ maxWidth: 480 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h2 style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Previous drafts</h2>
                {form.status === "published" && (
                  <button type="button" onClick={() => { if (confirm("Revert to draft? This will unpublish the story.")) doSave("draft"); }}
                    style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.8rem", cursor: "pointer", color: TEXT_MUTED }}>
                    Revert to draft
                  </button>
                )}
              </div>
              {versions.length === 0 ? (
                <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: TEXT_MUTED }}>No saves recorded yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {versions.map((v, i) => (
                    <div key={i} onContextMenu={e => { e.preventDefault(); if (confirm("Revert to draft at this point?")) doSave("draft"); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: `1px solid ${BORDER}`, cursor: "context-menu" }}>
                      <div>
                        <p style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600, color: TEXT_DARK, margin: 0 }}>{formatTime(v.savedAt)}</p>
                        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: TEXT_MUTED, margin: "0.1rem 0 0" }}>{v.type === "publish" ? "Published" : "Auto-saved"}</p>
                      </div>
                      <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: 20, background: v.type === "publish" ? "#e8f5e9" : "#f0f4f8", color: v.type === "publish" ? "#2e7d32" : TEXT_MUTED }}>
                        {v.type === "publish" ? "Published" : "Draft"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image modal */}
      {showImageModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowImageModal(false)}>
          <div style={{ background: "white", borderRadius: 10, width: "min(880px, 95vw)", height: "min(600px, 90vh)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1rem", margin: "0 0 0.75rem", color: TEXT_DARK }}>Add featured image</p>
              <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${BORDER}`, marginBottom: -1 }}>
                {(["library", "upload"] as const).map(tab => (
                  <button key={tab} type="button" onClick={() => setImageModalTab(tab)}
                    style={{ background: "none", border: "none", borderBottom: `2px solid ${imageModalTab === tab ? CRIMSON : "transparent"}`, marginBottom: -2, padding: "0.4rem 1rem", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: imageModalTab === tab ? CRIMSON : TEXT_MUTED, cursor: "pointer" }}>
                    {tab === "library" ? "Library" : "Upload new"}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
              {imageModalTab === "library" && (
                <>
                  {/* Grid */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
                    {photoPickerLoading ? (
                      <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p>
                    ) : photoPickerAssets.length === 0 ? (
                      <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>No images in library yet.</p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem" }}>
                        {photoPickerAssets.map(a => (
                          <img key={a._id} src={a.url} alt={a.originalFilename}
                            onClick={() => setSelectedAsset(a)}
                            style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: `2px solid ${selectedAsset?._id === a._id ? CRIMSON : "transparent"}`, boxSizing: "border-box" }} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Preview panel */}
                  {selectedAsset && (
                    <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${BORDER}`, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <img src={selectedAsset.url} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 6 }} />
                      <div><label style={LABEL}>Caption</label><input style={INPUT} value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="Add a caption…" /></div>
                      <div><label style={LABEL}>Alt text</label><input style={INPUT} value={uploadAlt} onChange={e => setUploadAlt(e.target.value)} placeholder="Describe this image…" /></div>
                    </div>
                  )}
                </>
              )}

              {imageModalTab === "upload" && (
                <div style={{ flex: 1, display: "flex", gap: "1.5rem", padding: "1.5rem", overflowY: "auto" }}>
                  {/* Upload area */}
                  <div style={{ flex: 1 }}>
                    {!uploadPreviewUrl ? (
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `2px dashed ${BORDER}`, borderRadius: 8, padding: "2.5rem 1rem", cursor: "pointer", textAlign: "center" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: "0.75rem" }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_DARK, margin: "0 0 0.25rem", fontWeight: 600 }}>Drag image here or <span style={{ color: CRIMSON }}>click to upload</span></p>
                        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_MUTED, margin: 0 }}>JPEG, PNG, GIF, or WEBP</p>
                        <input type="file" accept="image/*" onChange={handleUploadFileSelect} style={{ display: "none" }} />
                      </label>
                    ) : (
                      <div>
                        <img src={uploadPreviewUrl} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 6, marginBottom: "0.5rem" }} />
                        <button type="button" onClick={() => { setUploadFile(null); setUploadPreviewUrl(""); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.8rem", color: TEXT_MUTED, cursor: "pointer", padding: 0 }}>Remove</button>
                      </div>
                    )}
                  </div>
                  {/* Fields */}
                  <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <label style={LABEL}>Caption <span style={{ color: CRIMSON }}>*</span></label>
                      <input style={INPUT} value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="Credit the original source…" />
                      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, margin: "0.3rem 0 0" }}>Required before using this image</p>
                    </div>
                    <div><label style={LABEL}>Alt text</label><input style={INPUT} value={uploadAlt} onChange={e => setUploadAlt(e.target.value)} placeholder="Describe this image…" /></div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "0.85rem 1.5rem", borderTop: `1px solid ${BORDER}`, background: "#fafbfc" }}>
              <button type="button" onClick={() => setShowImageModal(false)} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.4rem 1.1rem", fontFamily: FONT, fontSize: "0.88rem", cursor: "pointer", color: TEXT_DARK }}>Cancel</button>
              <button type="button" onClick={handleUseImage} disabled={uploadingNew || (imageModalTab === "library" && !selectedAsset) || (imageModalTab === "upload" && (!uploadFile || !uploadCaption.trim()))}
                style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.4rem 1.1rem", fontFamily: FONT, fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", opacity: (imageModalTab === "library" && !selectedAsset) || (imageModalTab === "upload" && (!uploadFile || !uploadCaption.trim())) ? 0.5 : 1 }}>
                {uploadingNew ? "Uploading…" : "Use this image"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
