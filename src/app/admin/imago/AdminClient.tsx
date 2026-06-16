"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { savePost, deletePost, trashPost, restorePost, saveAbout, saveLately, saveWelcome, uploadImage, clearCloudDraft, deleteMediaAsset, updateMediaAsset, createDraft } from "../actions";
import { tiptapToPortableText, portableTextToTiptap } from "@/lib/tiptapConvert";
import RichBodyEditor, { type ToolbarHandles } from "@/components/RichBodyEditor";
import ImagePickerModal from "@/components/ImagePickerModal";
import { renderNewsletterHtml } from "@/lib/newsletterEmail";
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

function formatVersionTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) + " ET";
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

type Panel = "dashboard" | "editor" | "welcome" | "about" | "lately" | "media" | "comments" | "newsletter";

export default function AdminClient({ posts: initialPosts, initialAuth = false, initialPanel = "dashboard" }: { posts: SanityPost[]; initialAuth?: boolean; initialPanel?: Panel }) {
  const router = useRouter();
  const [auth] = useState(initialAuth);

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
  type ContextMenuState = { x: number; y: number; kind: "post"; post: SanityPost } | { x: number; y: number; kind: "newsletter"; newsletter: NlListItem };
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorTab, setEditorTab] = useState<"content" | "metadata">("content");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Newsletter state
  const [nlSubject, setNlSubject] = useState("");
  const [nlPreview, setNlPreview] = useState("");
  const [nlAuthor, setNlAuthor] = useState("Yacob Reyes");
  type NlImage = { assetId: string; url: string; caption?: string; alt?: string };
  type NlEditorCard = { id: string; headline: string; doc: JSONContent; image?: NlImage };
  const newNlCard = (): NlEditorCard => ({ id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, headline: "", doc: EMPTY_DOC });
  const [nlImgPickerCard, setNlImgPickerCard] = useState<string | null>(null);
  const [nlCards, setNlCards] = useState<NlEditorCard[]>(() => [newNlCard(), newNlCard()]);
  const [nlSaveStatus, setNlSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [nlLoaded, setNlLoaded] = useState(false);
  const nlLastSaved = useRef<string>("");
  type NlCard = { headline?: string; body?: import("@portabletext/types").PortableTextBlock[]; image?: { assetId: string; url: string } | null };
  type NlVersion = { id: string; createdAt: string; author?: string; subject?: string; preview?: string; wordCount?: number; cards?: NlCard[]; card1?: NlCard; card2?: NlCard };
  const [nlVersions, setNlVersions] = useState<NlVersion[]>([]);
  const [nlVersionMenu, setNlVersionMenu] = useState<string | null>(null);
  // Shared toolbar drives whichever card is focused (like the story editor)
  const [nlActiveEditor, setNlActiveEditor] = useState<Editor | null>(null);
  const [nlActiveToolbar, setNlActiveToolbar] = useState<ToolbarHandles | null>(null);
  const nlEditors = useRef<Record<string, Editor | null>>({});
  const nlToolbars = useRef<Record<string, ToolbarHandles | null>>({});
  // Newsletter lifecycle (each newsletter is now its own document)
  type NlListItem = { _id: string; subject?: string; preview?: string; author?: string; status?: "draft" | "published" | "scheduled"; createdAt?: string; updatedAt?: string };
  const [nlId, setNlId] = useState<string | null>(null);
  const [nlStatus, setNlStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [nlScheduledAt, setNlScheduledAt] = useState("");
  const [newsletters, setNewsletters] = useState<NlListItem[]>([]);
  const [showNlEllipsis, setShowNlEllipsis] = useState(false);
  const [showNlScheduler, setShowNlScheduler] = useState(false);
  const [showNlPreview, setShowNlPreview] = useState(false);
  const [nlSending, setNlSending] = useState(false);

  function nlUpdateCard(id: string, patch: Partial<NlEditorCard>) {
    setNlCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  function nlAddCardAfter(index: number) {
    setNlCards(prev => { const next = [...prev]; next.splice(index + 1, 0, newNlCard()); return next; });
  }
  function nlRemoveCard(id: string) {
    setNlCards(prev => prev.length <= 1 ? prev : prev.filter(c => c.id !== id));
    delete nlEditors.current[id];
    delete nlToolbars.current[id];
  }
  function nlMoveCard(from: number, to: number) {
    setNlCards(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!showCreateMenu) return;
    const handler = (e: MouseEvent) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCreateMenu]);

  useEffect(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    clearCloudDraft().catch(() => {});
  }, []);

  function refreshPosts() {
    fetch("/api/posts-admin").then(r => r.json()).then(data => { if (Array.isArray(data)) setPosts(data); }).catch(() => {});
  }

  useEffect(() => {
    refreshPosts();
    refreshNewsletters();
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
        if (!isMobile && data.length > 0) { setInspectAsset(prev => prev ?? data[0]); setInspectAltText(data[0].altText ?? ""); }
      }
    }).catch(() => {});
    return () => clearTimeout(retryTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsDirty(JSON.stringify(form) !== JSON.stringify(savedForm));
  }, [form, savedForm]);

  // Build the serializable newsletter payload (cards bodies → portable text)
  const nlPayload = () => ({
    id: nlId, status: nlStatus, scheduledAt: nlScheduledAt || undefined,
    subject: nlSubject, preview: nlPreview, author: nlAuthor,
    wordCount: nlCards.flatMap(card => (card.doc.content ?? []).flatMap((n: JSONContent) => (n.content ?? []).map((c: JSONContent) => c.text ?? ""))).join(" ").trim().split(/\s+/).filter(Boolean).length,
    cards: nlCards.map(card => ({ headline: card.headline, body: tiptapToPortableText(card.doc), image: card.image ?? null })),
  });

  const refreshNewsletters = useCallback(() => {
    fetch("/api/newsletter").then(r => r.json()).then(d => { if (Array.isArray(d?.newsletters)) setNewsletters(d.newsletters); }).catch(() => {});
  }, []);

  const nlSave = useCallback(async (payload: { id: string | null } & Record<string, unknown>): Promise<string | undefined> => {
    setNlSaveStatus("saving");
    try {
      const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      const savedId = data?.id as string | undefined;
      if (savedId) setNlId(prev => prev ?? savedId);
      if (Array.isArray(data?.versions)) setNlVersions(data.versions);
      nlLastSaved.current = JSON.stringify(savedId ? { ...payload, id: savedId } : payload);
      setNlSaveStatus("saved");
      refreshNewsletters();
      return savedId;
    } catch { setNlSaveStatus("unsaved"); return undefined; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNewsletters]);

  function resetNlState() {
    setNlSubject(""); setNlPreview(""); setNlAuthor("Yacob Reyes");
    setNlCards([newNlCard(), newNlCard()]); setNlVersions([]);
    setNlStatus("draft"); setNlScheduledAt(""); setNlSaveStatus("saved");
    nlLastSaved.current = "";
  }

  // Start a brand-new newsletter (created lazily on first autosave)
  function createNewNewsletter() {
    resetNlState();
    setNlId(null);
    setNlLoaded(true);
    setActivePanel("newsletter");
  }

  // Open an existing newsletter document for editing
  function openNewsletter(item: NlListItem) {
    resetNlState();
    setNlId(item._id);
    setNlLoaded(true);
    setActivePanel("newsletter");
    fetch(`/api/newsletter?id=${encodeURIComponent(item._id)}`).then(r => r.json()).then(d => {
      if (Array.isArray(d?.versions)) setNlVersions(d.versions);
      const draft = d?.draft;
      if (!draft) return;
      setNlSubject(draft.subject ?? "");
      setNlPreview(draft.preview ?? "");
      setNlAuthor(draft.author ?? "Yacob Reyes");
      setNlStatus(draft.status ?? "draft");
      setNlScheduledAt(draft.scheduledAt ? String(draft.scheduledAt).slice(0, 16) : "");
      if (Array.isArray(draft.cards) && draft.cards.length) {
        setNlCards(draft.cards.map((c: NlCard) => ({ ...newNlCard(), headline: c.headline ?? "", doc: c.body?.length ? portableTextToTiptap(c.body) : EMPTY_DOC, image: c.image ?? undefined })));
      }
      nlLastSaved.current = JSON.stringify({
        id: item._id, status: draft.status ?? "draft",
        scheduledAt: draft.scheduledAt ? String(draft.scheduledAt).slice(0, 16) : undefined,
        subject: draft.subject ?? "", preview: draft.preview ?? "", author: draft.author ?? "Yacob Reyes",
        wordCount: draft.wordCount ?? 0,
        cards: (draft.cards ?? []).map((c: NlCard) => ({ headline: c.headline ?? "", body: c.body ?? [], image: c.image ?? null })),
      });
    }).catch(() => {});
  }

  async function publishNewsletter() {
    if (!nlSubject.trim()) { alert("Add a subject line before publishing."); return; }
    setNlStatus("published");
    const savedId = await nlSave({ ...nlPayload(), status: "published" });
    const sendId = savedId ?? nlId;
    if (sendId && confirm("Send this newsletter to all subscribers now?")) {
      setNlSending(true);
      try {
        const res = await fetch("/api/newsletter/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sendId }) });
        const d = await res.json();
        if (!res.ok) alert(d.error || "Send failed.");
        else alert(`Sent to ${d.sent} subscriber${d.sent === 1 ? "" : "s"}.${d.failed ? ` ${d.failed} failed.` : ""}`);
      } catch { alert("Send failed."); }
      finally { setNlSending(false); }
    }
  }

  async function unpublishNewsletter() {
    setNlStatus("draft");
    await nlSave({ ...nlPayload(), status: "draft" });
  }

  async function scheduleNewsletter() {
    if (!nlScheduledAt) return;
    setNlStatus("scheduled");
    await nlSave({ ...nlPayload(), status: "scheduled", scheduledAt: nlScheduledAt });
    setShowNlScheduler(false);
  }

  async function removeNewsletterById(id: string) {
    try { await fetch(`/api/newsletter?id=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch {}
    refreshNewsletters();
  }

  async function deleteNewsletter() {
    if (!confirm("Delete this newsletter? This cannot be undone.")) return;
    if (nlId) await removeNewsletterById(nlId);
    refreshNewsletters();
    setActivePanel("dashboard");
    router.push("/admin/imago");
  }

  // Auto-save every 3s when dirty (matches the story editor)
  useEffect(() => {
    if (activePanel !== "newsletter" || !nlLoaded) return;
    const payload = nlPayload();
    if (JSON.stringify(payload) === nlLastSaved.current) return;
    setNlSaveStatus("unsaved");
    const timer = setTimeout(() => { nlSave(payload); }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nlSubject, nlPreview, nlAuthor, nlCards, nlStatus, nlScheduledAt, activePanel, nlLoaded]);

  function restoreNlVersion(v: NlVersion) {
    if (!confirm("Restore this version? Your current text will be replaced.")) return;
    setNlSubject(v.subject ?? "");
    setNlPreview(v.preview ?? "");
    setNlAuthor(v.author ?? "Yacob Reyes");
    const srcCards: NlCard[] = v.cards?.length ? v.cards : [v.card1, v.card2].filter(Boolean) as NlCard[];
    const restored: NlEditorCard[] = (srcCards.length ? srcCards : [{}]).map(c => ({
      ...newNlCard(),
      headline: c.headline ?? "",
      doc: c.body?.length ? portableTextToTiptap(c.body) : EMPTY_DOC,
      image: c.image ?? undefined,
    }));
    setNlCards(restored);
  }

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
          if (!isMobile && data.length > 0) { setInspectAsset(data[0]); setInspectAltText(data[0].altText ?? ""); setUrlCopied(false); }
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
          display: ${activePanel === "newsletter" ? "none" : "flex"};
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
            style={{ position: "absolute", left: -14, top: 26, transform: "translateY(-50%)", background: "white", border: `1px solid ${BORDER}`, borderRadius: "50%", width: 28, height: 28, display: isMobile || activePanel === "newsletter" ? "none" : "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED, zIndex: 250, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>
          {/* Top bar — desktop */}
          {!isMobile && activePanel !== "newsletter" && (
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
                  <div ref={createMenuRef} style={{ position: "relative" }}>
                    <button onClick={() => setShowCreateMenu(v => !v)}
                      style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.4rem 0.9rem", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      + Create new
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: "transform 0.15s", transform: showCreateMenu ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {showCreateMenu && (
                      <div style={{ position: "absolute", top: "calc(100% + 0.4rem)", right: 0, background: "white", border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 150, zIndex: 100, overflow: "hidden" }}>
                        <button onClick={() => { setShowCreateMenu(false); if (isDirty && !confirm("Discard unsaved changes?")) return; startNew(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, background: "none", border: "none", cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#f5f8fa"; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>Story</button>
                        <button onClick={() => { setShowCreateMenu(false); if (isDirty && !confirm("Discard unsaved changes?")) return; createNewNewsletter(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, background: "none", border: "none", cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#f5f8fa"; }} onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>Newsletter</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: TEXT_DARK }}>
                    {activePanel === "media" ? "Media Library" : activePanel === "comments" ? "Comments" : activePanel === "welcome" ? "Welcome Note" : activePanel === "about" ? "About" : activePanel === "lately" ? "Lately" : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Top bar — mobile */}
          {isMobile && activePanel !== "newsletter" && (
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
                  <div ref={!createMenuRef.current ? createMenuRef : undefined} style={{ position: "relative" }}>
                    <button onClick={() => setShowCreateMenu(v => !v)}
                      style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.35rem 0.85rem", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      + New
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: showCreateMenu ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {showCreateMenu && (
                      <div style={{ position: "absolute", top: "calc(100% + 0.4rem)", right: 0, background: "white", border: `1px solid ${BORDER}`, borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 140, zIndex: 300, overflow: "hidden" }}>
                        <button onClick={() => { setShowCreateMenu(false); if (isDirty && !confirm("Discard?")) return; startNew(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, background: "none", border: "none", cursor: "pointer" }}>Story</button>
                        <button onClick={() => { setShowCreateMenu(false); if (isDirty && !confirm("Discard?")) return; createNewNewsletter(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, background: "none", border: "none", cursor: "pointer" }}>Newsletter</button>
                      </div>
                    )}
                  </div>
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
                const nlStatusKey = postTab === "drafts" ? "draft" : postTab === "scheduled" ? "scheduled" : "published";
                const nlList = newsletters.filter(n => (n.status ?? "draft") === nlStatusKey);
                const nlFiltered = query.trim() ? nlList.filter(n => (n.subject ?? "").toLowerCase().includes(query.toLowerCase())) : nlList;
                const total = filtered.length + nlFiltered.length;
                const label = postTab === "drafts" ? "draft" : postTab === "scheduled" ? "scheduled item" : "published item";
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, margin: 0, paddingLeft: "1rem" }}>{total} {total === 1 ? label : label + "s"}</p>
                    </div>
                    {/* Table header */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px", padding: "0.4rem 1rem" }}>
                      {["Name", "Type", "Date"].map(h => (
                        <span key={h} style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_MUTED }}>{h}</span>
                      ))}
                    </div>
                    {/* Rows */}
                    {total === 0 ? (
                      <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "3rem", textAlign: "center", marginTop: "0.25rem" }}>
                        <p style={{ fontFamily: FONT, color: TEXT_MUTED, margin: 0 }}>{query ? `No results for "${query}"` : `No ${label}s yet.`}</p>
                      </div>
                    ) : (
                      <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden", marginTop: "0.25rem" }}>
                        {nlFiltered.map(n => (
                          <div key={n._id}
                            onClick={() => openNewsletter(n)}
                            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, kind: "newsletter", newsletter: n }); }}
                            style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 100px 80px" : "1fr 140px 120px", gap: isMobile ? "0 0.5rem" : "0 1rem", padding: "0.85rem 1rem", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", alignItems: "center" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                            onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, color: TEXT_DARK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.subject || <em style={{ color: TEXT_MUTED, fontWeight: 400 }}>Untitled newsletter</em>}</p>
                                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, margin: 0 }}>{n.author || "Yacob Reyes"}</p>
                              </div>
                            </div>
                            <span style={{ fontFamily: FONT, fontSize: isMobile ? "0.7rem" : "0.8rem", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Newsletter</span>
                            <span style={{ fontFamily: FONT, fontSize: isMobile ? "0.7rem" : "0.8rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>{(n.createdAt ?? n.updatedAt ?? "").slice(0, 10) || "—"}</span>
                          </div>
                        ))}
                        {filtered.map(post => (
                          <div key={post._id}
                            onClick={() => { if (isDirty && !confirm("Discard?")) return; startEdit(post); }}
                            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, kind: "post", post }); }}
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

          {/* NEWSLETTER */}
          {activePanel === "newsletter" && (
            <div style={{ margin: "-2rem", maxWidth: "none", width: "auto", minHeight: "100%", display: "flex", flexDirection: "column", background: "white" }}>
              <style>{`
                .nl-tb-btn { position: relative; }
                /* Add-card divider: hidden until the row is hovered */
                .nl-add-zone .nl-add-line, .nl-add-zone .nl-add-label { opacity: 0; transition: opacity 0.12s; }
                .nl-add-zone:hover .nl-add-line, .nl-add-zone:hover .nl-add-label { opacity: 1; }
                /* Side controls: hidden until the card is hovered */
                .nl-card-controls { opacity: 0; transition: opacity 0.12s; pointer-events: none; }
                .nl-card:hover .nl-card-controls, .nl-card-controls:hover { opacity: 1; pointer-events: auto; }
              `}</style>
              {nlImgPickerCard && (
                <ImagePickerModal
                  isMobile={isMobile}
                  onClose={() => setNlImgPickerCard(null)}
                  onSelect={img => nlUpdateCard(nlImgPickerCard, { image: img })}
                />
              )}

              {/* Schedule modal */}
              {showNlScheduler && (
                <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNlScheduler(false)}>
                  <div style={{ background: "white", borderRadius: 8, padding: "1.5rem", width: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
                    <p style={{ fontFamily: FONT, fontWeight: 700, margin: "0 0 1rem", color: TEXT_DARK }}>Schedule newsletter</p>
                    <label style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "0.3rem" }}>Send at</label>
                    <input type="datetime-local" value={nlScheduledAt} onChange={e => setNlScheduledAt(e.target.value)} style={{ ...INPUT, marginBottom: "0.75rem" }} />
                    <button type="button" disabled={!nlScheduledAt} onClick={scheduleNewsletter} style={{ width: "100%", background: CRIMSON, color: "white", border: "none", borderRadius: 6, padding: "0.5rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", opacity: nlScheduledAt ? 1 : 0.5 }}>Confirm schedule</button>
                  </div>
                </div>
              )}

              {/* Preview modal — renders the actual email HTML */}
              {showNlPreview && (
                <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }} onClick={() => setShowNlPreview(false)}>
                  <div style={{ background: "white", borderRadius: 8, width: "min(680px, 100%)", height: "90vh", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.25rem", borderBottom: `1px solid ${BORDER}` }}>
                      <span style={{ fontFamily: FONT, fontWeight: 700, color: TEXT_DARK }}>Email preview</span>
                      <button type="button" onClick={() => setShowNlPreview(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: TEXT_MUTED }}>×</button>
                    </div>
                    <iframe title="Newsletter preview" style={{ flex: 1, border: "none", width: "100%" }}
                      srcDoc={renderNewsletterHtml({
                        subject: nlSubject, preview: nlPreview,
                        cards: nlCards.map(c => ({ headline: c.headline, body: tiptapToPortableText(c.doc), image: c.image ? { url: c.image.url, caption: c.image.caption, alt: c.image.alt } : null })),
                      })} />
                  </div>
                </div>
              )}
              {/* Top bar — matches story editor */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", borderBottom: `1px solid ${BORDER}`, height: 52, boxSizing: "border-box", flexShrink: 0, background: "white", position: "sticky", top: 0, zIndex: 10 }}>
                <button onClick={async () => { await nlSave(nlPayload()); setActivePanel("dashboard"); router.push("/admin/imago"); }} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, color: TEXT_MUTED, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Save &amp; Exit
                </button>

                {/* Formatting toolbar — drives the focused card editor */}
                {!isMobile && nlActiveEditor && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    {([
                      ["B", nlActiveEditor.isActive("bold"), () => nlActiveEditor.chain().focus().toggleBold().run(), { fontWeight: 700 }],
                      ["I", nlActiveEditor.isActive("italic"), () => nlActiveEditor.chain().focus().toggleItalic().run(), { fontStyle: "italic" }],
                    ] as [string, boolean, () => void, React.CSSProperties][]).map(([label, active, action, style]) => (
                      <button key={label} type="button" onMouseDown={e => { e.preventDefault(); action(); }}
                        style={{ background: active ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: active ? CRIMSON : TEXT_MUTED, fontFamily: FONT, fontSize: "1.15rem", ...style }}>
                        {label}
                      </button>
                    ))}
                    <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveEditor.chain().focus().toggleBlockquote().run(); }}
                      style={{ background: nlActiveEditor.isActive("blockquote") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveEditor.isActive("blockquote") ? CRIMSON : TEXT_MUTED }}>
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveEditor.chain().focus().toggleHeading({ level: 2 }).run(); }}
                      style={{ background: nlActiveEditor.isActive("heading", { level: 2 }) ? "#f0f0f0" : "none", border: "none", borderRadius: 4, padding: "0 8px", height: 38, display: "flex", alignItems: "center", cursor: "pointer", color: nlActiveEditor.isActive("heading", { level: 2 }) ? CRIMSON : TEXT_MUTED, fontFamily: FONT, fontSize: "1rem", fontWeight: 700 }}>
                      H2
                    </button>
                    <div style={{ width: 1, height: 22, background: BORDER, margin: "0 0.3rem" }} />
                    <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveEditor.chain().focus().toggleBulletList().run(); }}
                      style={{ background: nlActiveEditor.isActive("bulletList") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveEditor.isActive("bulletList") ? CRIMSON : TEXT_MUTED }}>
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveEditor.chain().focus().toggleOrderedList().run(); }}
                      style={{ background: nlActiveEditor.isActive("orderedList") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveEditor.isActive("orderedList") ? CRIMSON : TEXT_MUTED }}>
                      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                    </button>
                    <div style={{ width: 1, height: 22, background: BORDER, margin: "0 0.3rem" }} />
                    <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveToolbar?.openLink(); }}
                      style={{ background: nlActiveEditor.isActive("link") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveEditor.isActive("link") ? CRIMSON : TEXT_MUTED }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveToolbar?.openImage(); }}
                      style={{ background: "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                    <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveToolbar?.openEmbed(); }}
                      style={{ background: "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_MUTED }}>{nlSending ? "Sending…" : nlSaveStatus === "saving" ? "Saving…" : nlSaveStatus === "unsaved" ? "Unsaved" : "Saved"}</span>
                  <button
                    disabled={!nlSubject || nlSending}
                    onClick={publishNewsletter}
                    style={{ background: CRIMSON, color: "white", border: "none", borderRadius: 20, padding: "0.35rem 1.1rem", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, cursor: !nlSubject ? "not-allowed" : "pointer", opacity: !nlSubject || nlSending ? 0.5 : 1 }}>
                    {nlStatus === "published" ? "Update & Send" : "Publish"}
                  </button>
                  {/* Ellipsis menu */}
                  <div style={{ position: "relative" }}>
                    <button type="button" onClick={() => setShowNlEllipsis(v => !v)}
                      style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
                    </button>
                    {showNlEllipsis && (
                      <div style={{ position: "absolute", top: "calc(100% + 0.4rem)", right: 0, zIndex: 100, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden" }} onClick={() => setShowNlEllipsis(false)}>
                        <button type="button" onClick={() => setShowNlPreview(true)} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Preview</button>
                        <button type="button" onClick={() => setShowNlScheduler(true)} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Schedule</button>
                        {nlStatus === "published" && (
                          <button type="button" onClick={unpublishNewsletter} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Unpublish</button>
                        )}
                        <div style={{ borderTop: `1px solid ${BORDER}` }} />
                        <button type="button" onClick={deleteNewsletter} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: "auto", background: "#f5f8fa", padding: "2rem" }}>
                <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {/* Wordmark header card */}
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ background: CRIMSON, padding: "1.5rem", textAlign: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/Masthead.webp" alt="efemera" style={{ height: 36, width: "auto", display: "inline-block" }} />
                      <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", margin: "0.5rem 0 0", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Cards */}
                  {nlCards.map((card, i) => (
                    <div key={card.id} style={{ display: "flex", flexDirection: "column" }}>
                      {/* Hover add divider (above each card) */}
                      <div className="nl-add-zone" onClick={() => nlAddCardAfter(i - 1)}
                        style={{ display: "flex", alignItems: "center", gap: "0.6rem", height: 26, cursor: "pointer" }}>
                        <div className="nl-add-line" style={{ flex: 1, height: 1, background: BORDER }} />
                        <span className="nl-add-label" style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>+ Add a new card</span>
                        <div className="nl-add-line" style={{ flex: 1, height: 1, background: BORDER }} />
                      </div>

                      <div className="nl-card" onFocusCapture={() => { setNlActiveEditor(nlEditors.current[card.id] ?? null); setNlActiveToolbar(nlToolbars.current[card.id] ?? null); }}
                        style={{ position: "relative", background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.25rem" }}>
                        {/* Hover-side controls */}
                        <div className="nl-card-controls" style={{ position: "absolute", top: 0, left: "100%", paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                          <button type="button" title="Delete card" onClick={() => { if (nlCards.length > 1 && confirm("Delete this card?")) nlRemoveCard(card.id); }}
                            style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: nlCards.length > 1 ? "pointer" : "not-allowed", color: TEXT_MUTED, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", opacity: nlCards.length > 1 ? 1 : 0.4 }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            <button type="button" title="Move up" disabled={i === 0} onClick={() => nlMoveCard(i, i - 1)}
                              style={{ width: 36, height: 30, borderRadius: "8px 8px 0 0", background: "white", border: `1px solid ${BORDER}`, borderBottom: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: i === 0 ? "not-allowed" : "pointer", color: TEXT_MUTED, opacity: i === 0 ? 0.4 : 1 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                            <button type="button" title="Move down" disabled={i === nlCards.length - 1} onClick={() => nlMoveCard(i, i + 1)}
                              style={{ width: 36, height: 30, borderRadius: "0 0 8px 8px", background: "white", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: i === nlCards.length - 1 ? "not-allowed" : "pointer", color: TEXT_MUTED, opacity: i === nlCards.length - 1 ? 0.4 : 1 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.75rem" }}>
                          <span style={{ fontFamily: FONT, fontSize: "1.25rem", fontWeight: 700, color: i === 0 ? CRIMSON : TEXT_DARK, flexShrink: 0 }}>{i + 1}.</span>
                          <input value={card.headline} onChange={e => nlUpdateCard(card.id, { headline: e.target.value })} placeholder="Type your headline" style={{ ...INPUT, flex: 1, fontSize: "1.25rem", fontWeight: 700, border: "none", padding: 0, background: "transparent" }} />
                        </div>
                        {card.image ? (
                          <div style={{ marginBottom: "0.85rem" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={card.image.url} alt={card.image.alt ?? ""} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 6, display: "block" }} />
                            {card.image.caption && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, fontStyle: "italic", margin: "0.4rem 0 0" }}>{card.image.caption}</p>}
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.4rem" }}>
                              <button type="button" onClick={() => setNlImgPickerCard(card.id)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "0.25rem 0.7rem", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: TEXT_MUTED }}>Change</button>
                              <button type="button" onClick={() => nlUpdateCard(card.id, { image: undefined })} style={{ background: "none", border: "none", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer", color: TEXT_MUTED }}>Remove</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setNlImgPickerCard(card.id)}
                            style={{ fontFamily: FONT, fontSize: "0.85rem", color: CRIMSON, background: "none", border: `1px solid ${CRIMSON}`, borderRadius: 20, padding: "0.4rem 1rem", cursor: "pointer", alignSelf: "flex-start", marginBottom: "0.85rem", display: "inline-block" }}>
                            Add a featured image
                          </button>
                        )}
                        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "0.75rem" }}>
                          <RichBodyEditor initialContent={card.doc} minHeight={70} placeholder="Type your item"
                            onChange={doc => nlUpdateCard(card.id, { doc })}
                            onEditor={ed => { nlEditors.current[card.id] = ed; if (ed && i === 0) setNlActiveEditor(prev => prev ?? ed); }}
                            onToolbar={tb => { nlToolbars.current[card.id] = tb; if (tb && i === 0) setNlActiveToolbar(prev => prev ?? tb); }} />
                        </div>
                      </div>

                      {/* Hover add divider after the last card */}
                      {i === nlCards.length - 1 && (
                        <div className="nl-add-zone" onClick={() => nlAddCardAfter(i)}
                          style={{ display: "flex", alignItems: "center", gap: "0.6rem", height: 26, cursor: "pointer" }}>
                          <div className="nl-add-line" style={{ flex: 1, height: 1, background: BORDER }} />
                          <span className="nl-add-label" style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>+ Add a new card</span>
                          <div className="nl-add-line" style={{ flex: 1, height: 1, background: BORDER }} />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Newsletter info */}
                  <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <h3 style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: TEXT_DARK, margin: 0 }}>Newsletter info</h3>
                    <div>
                      <label style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600, color: TEXT_MUTED, display: "block", marginBottom: "0.3rem" }}>Author</label>
                      <input value={nlAuthor} onChange={e => setNlAuthor(e.target.value)} style={INPUT} />
                    </div>
                    <div>
                      <label style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600, color: TEXT_MUTED, display: "block", marginBottom: "0.3rem" }}>Subject line<span style={{ color: CRIMSON }}>*</span></label>
                      <input value={nlSubject} onChange={e => setNlSubject(e.target.value)} placeholder="Add a subject line" style={INPUT} />
                    </div>
                    <div>
                      <label style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 600, color: TEXT_MUTED, display: "block", marginBottom: "0.3rem" }}>Preview text</label>
                      <input value={nlPreview} onChange={e => setNlPreview(e.target.value)} placeholder="Add preview text" style={INPUT} />
                    </div>
                  </div>

                  {/* Divider + Version history */}
                  <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "1rem 0 0.5rem" }} />
                  <div>
                    <h3 style={{ fontFamily: FONT, fontSize: "1.4rem", fontWeight: 700, color: TEXT_DARK, margin: "0 0 1rem" }}>Version history</h3>
                    {nlVersions.length === 0 ? (
                      <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: TEXT_MUTED }}>No saves recorded yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {nlVersions.map(v => (
                          <div key={v.id} style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", minWidth: 0 }}>
                              <span style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: TEXT_DARK, whiteSpace: "nowrap" }}>{v.author || "Yacob Reyes"}</span>
                              <span style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_MUTED }}>{formatVersionTime(v.createdAt)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                              <span style={{ fontFamily: FONT, fontSize: "0.88rem", color: TEXT_MUTED, whiteSpace: "nowrap" }}>{v.wordCount ?? 0} words</span>
                              <div style={{ position: "relative", flexShrink: 0 }}>
                                <button type="button" onClick={() => setNlVersionMenu(nlVersionMenu === v.id ? null : v.id)}
                                  style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 20, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT_MUTED }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
                                </button>
                                {nlVersionMenu === v.id && (
                                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 50, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden" }}>
                                    <button type="button" onClick={() => { setNlVersionMenu(null); restoreNlVersion(v); }}
                                      style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.6rem 1rem", fontFamily: FONT, fontSize: "0.85rem", color: TEXT_DARK, cursor: "pointer" }}>
                                      Restore this version
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
            {contextMenu.kind === "post" ? (
              contextMenu.post.status === "draft" ? (
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
              )
            ) : contextMenu.newsletter.status === "draft" ? (
              <>
                <button onClick={() => { const n = contextMenu.newsletter; setContextMenu(null); openNewsletter(n); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Open</button>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <button onClick={() => { const n = contextMenu.newsletter; setContextMenu(null); if (confirm(`Delete "${n.subject || "this draft"}"?`)) removeNewsletterById(n._id); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete draft</button>
              </>
            ) : (
              <>
                <button onClick={() => { const n = contextMenu.newsletter; setContextMenu(null); openNewsletter(n); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Open</button>
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <button onClick={() => { const n = contextMenu.newsletter; setContextMenu(null); if (confirm(`Delete "${n.subject || "this newsletter"}"? This cannot be undone.`)) removeNewsletterById(n._id); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete</button>
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
