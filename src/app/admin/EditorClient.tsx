"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { savePost, deletePost, trashPost, restorePost, uploadImage } from "./actions";
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

type MediaAsset = { _id: string; url: string; originalFilename?: string };

export default function EditorClient({ post }: { post?: SanityPost }) {
  const router = useRouter();

  const initialForm: FormState = post ? {
    headline: post.headline,
    subheadline: post.subheadline ?? "",
    byline: post.byline ?? "Yacob Reyes",
    slug: post.slug,
    section: post.section,
    date: post.date,
    body: portableTextToTiptap(post.body),
    status: post.status === "published" || !post.status ? "published" : post.status === "scheduled" ? "scheduled" : "draft",
    pinned: post.pinned ?? false,
  } : { ...DEFAULT_FORM, date: new Date().toISOString().slice(0, 10) };

  const [form, setForm] = useState<FormState>(initialForm);
  const [savedForm, setSavedForm] = useState<FormState>(initialForm);
  const [editorTab, setEditorTab] = useState<"content" | "metadata">("content");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const submitStatusRef = useRef<"draft" | "published" | "scheduled">("draft");
  const [scheduledAt, setScheduledAt] = useState(post?.scheduledAt?.slice(0, 16) ?? "");
  const [showScheduler, setShowScheduler] = useState(false);

  const [imageCaption, setImageCaption] = useState(post?.image?.caption ?? "");
  const [imageAlt, setImageAlt] = useState(post?.image?.alt ?? "");
  const [imagePreview, setImagePreview] = useState(post?.image?.asset ? "existing" : "");
  const [imageAssetId, setImageAssetId] = useState(post?.image?.asset?._ref ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [photoPickerAssets, setPhotoPickerAssets] = useState<MediaAsset[]>([]);
  const [photoPickerLoading, setPhotoPickerLoading] = useState(false);

  function updateForm(patch: Partial<FormState>) { setForm(prev => ({ ...prev, ...patch })); }

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  function goBack() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    router.push("/admin");
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    const fd = new FormData();
    const { body, ...rest } = form;
    Object.entries({ ...rest, status: submitStatusRef.current }).forEach(([k, v]) => fd.set(k, String(v)));
    fd.set("body", JSON.stringify(tiptapToPortableText(body)));
    if (post) fd.set("id", post._id);
    if (imageAssetId) fd.set("imageAssetId", imageAssetId);
    if (imageCaption) fd.set("imageCaption", imageCaption);
    if (imageAlt) fd.set("imageAlt", imageAlt);
    if (submitStatusRef.current === "scheduled" && scheduledAt) fd.set("scheduledAt", new Date(scheduledAt).toISOString());
    startTransition(async () => {
      try {
        const { slug } = await savePost(fd);
        const s = submitStatusRef.current;
        setSuccess(`Saved!`);
        setSavedForm({ ...form, status: s });
        setForm(f => ({ ...f, status: s }));
        if (!post) router.replace(`/admin/posts/${slug}`);
      } catch (err: any) { setError(err.message); }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "white", fontFamily: FONT }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", borderBottom: `1px solid ${BORDER}`, height: 52, boxSizing: "border-box", flexShrink: 0, background: "white" }}>
        <button type="button" onClick={goBack} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, color: TEXT_MUTED, cursor: "pointer", padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Go back
        </button>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {post && post.status !== "trashed" && (
            <button type="button" onClick={() => { if (confirm("Move to trash?")) startTransition(async () => { await trashPost(post._id); router.push("/admin"); }); }} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: TEXT_MUTED }}>Trash</button>
          )}
          {post && post.status === "trashed" && (
            <>
              <button type="button" onClick={() => startTransition(async () => { await restorePost(post._id); router.push("/admin"); })} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: TEXT_DARK }}>Restore</button>
              <button type="button" onClick={() => { if (confirm("Delete FOREVER?")) startTransition(async () => { await deletePost(post._id); router.push("/admin"); }); }} style={{ background: "none", border: "1px solid #f5a5a5", borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: CRIMSON }}>Delete forever</button>
            </>
          )}
          <button type="button" onClick={() => updateForm({ pinned: !form.pinned })} style={{ fontFamily: FONT, fontSize: "0.82rem", padding: "0.3rem 0.75rem", borderRadius: 20, cursor: "pointer", border: `1px solid ${form.pinned ? CRIMSON : BORDER}`, background: form.pinned ? "#fff0f0" : "white", color: form.pinned ? CRIMSON : TEXT_MUTED }}>📌 Pin</button>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setShowScheduler(s => !s)} style={{ background: "white", border: `1px solid ${showScheduler ? CRIMSON : BORDER}`, borderRadius: 20, padding: "0.3rem 0.75rem", fontFamily: FONT, fontSize: "0.82rem", cursor: "pointer", color: showScheduler ? CRIMSON : TEXT_MUTED }}>Schedule</button>
            {showScheduler && (
              <div style={{ position: "absolute", top: "calc(100% + 0.4rem)", right: 0, zIndex: 20, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.75rem", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 240 }}>
                <label style={{ ...LABEL, marginBottom: "0.4rem" }}>Publish at</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ ...INPUT, marginBottom: "0.5rem" }} />
                <button type="button" disabled={!scheduledAt || isPending} onClick={() => { submitStatusRef.current = "scheduled"; setShowScheduler(false); document.querySelector("form")?.requestSubmit(); }} style={{ width: "100%", background: "#1565c0", color: "white", border: "none", borderRadius: 4, padding: "0.45rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer" }}>Confirm schedule</button>
              </div>
            )}
          </div>
          <button type="button" disabled={isPending || uploadingImage} onClick={() => { submitStatusRef.current = "draft"; document.querySelector("form")?.requestSubmit(); }} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.3rem 0.85rem", fontFamily: FONT, fontSize: "0.85rem", cursor: "pointer", color: TEXT_MUTED }}>{isPending ? "Saving…" : "Save draft"}</button>
          <button type="button" disabled={isPending || uploadingImage} onClick={() => { submitStatusRef.current = "published"; document.querySelector("form")?.requestSubmit(); }} style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.3rem 1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Publish</button>
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left section nav */}
        <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${BORDER}`, padding: "1.5rem 0", display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, margin: "0 0 0.5rem 1rem", opacity: 0.7 }}>Required</p>
          {(["content", "metadata"] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setEditorTab(tab)}
              style={{ display: "block", width: "100%", background: "none", border: "none", borderLeft: `3px solid ${editorTab === tab ? CRIMSON : "transparent"}`, textAlign: "left", padding: "0.5rem 1rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: editorTab === tab ? 600 : 400, color: editorTab === tab ? CRIMSON : TEXT_DARK, cursor: "pointer" }}>
              {tab === "content" ? "Story content" : "Metadata"}
            </button>
          ))}
          {success && <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#2e7d32", margin: "1.5rem 1rem 0", lineHeight: 1.4 }}>{success}</p>}
          {error && <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: CRIMSON, margin: "1.5rem 1rem 0", lineHeight: 1.4 }}>{error}</p>}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "3rem 4rem", maxWidth: 800 }}>
          {editorTab === "content" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <input
                placeholder="Type your headline"
                style={{ fontFamily: FONT, fontSize: "2rem", fontWeight: 700, color: TEXT_DARK, border: "none", outline: "none", width: "100%", background: "transparent", lineHeight: 1.2 }}
                value={form.headline}
                onChange={e => updateForm({ headline: e.target.value, ...(!post ? { slug: slugify(e.target.value) } : {}) })}
                required
              />
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
              <RichBodyEditor initialContent={form.body} onChange={doc => updateForm({ body: doc })} />
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
            </div>
          )}
        </div>
      </form>

      {/* Photo picker modal */}
      {showPhotoPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowPhotoPicker(false)}>
          <div style={{ background: "white", borderRadius: 8, padding: "1.5rem", maxWidth: 700, width: "90%", maxHeight: "80vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: FONT, fontWeight: 700, margin: "0 0 1rem", color: TEXT_DARK }}>Choose from library</p>
            {photoPickerLoading ? <p style={{ fontFamily: FONT, color: TEXT_MUTED }}>Loading…</p> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem" }}>
                {photoPickerAssets.map(a => (
                  <img key={a._id} src={a.url} alt={a.originalFilename} onClick={() => { setImageAssetId(a._id); setImagePreview(a.url); setShowPhotoPicker(false); }} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 4, cursor: "pointer", border: `2px solid ${imageAssetId === a._id ? CRIMSON : "transparent"}` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
