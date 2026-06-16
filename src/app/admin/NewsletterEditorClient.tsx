"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { tiptapToPortableText, portableTextToTiptap } from "@/lib/tiptapConvert";
import RichBodyEditor, { type ToolbarHandles } from "@/components/RichBodyEditor";
import ImagePickerModal from "@/components/ImagePickerModal";
import { renderNewsletterHtml } from "@/lib/newsletterEmail";
import { saveNewsletter, deleteNewsletter, sendNewsletter, getPostsForNewsletter, type NlVersion, type NlPickablePost } from "./newsletterActions";
import type { JSONContent, Editor } from "@tiptap/react";
import type { PortableTextBlock } from "@portabletext/types";

const CRIMSON = "#8B0000";
const BORDER = "#e1e8ed";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";
const FONT = "var(--font-inter), sans-serif";

const INPUT: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.9rem", padding: "0.5rem 0.7rem",
  border: `1px solid ${BORDER}`, borderRadius: 4, width: "100%",
  boxSizing: "border-box", color: TEXT_DARK, outline: "none", background: "white",
};

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

function ptPlainText(blocks?: { _type?: string; children?: { text?: string }[] }[]): string {
  if (!blocks?.length) return "";
  return blocks
    .filter(b => b._type === "block")
    .flatMap(b => (b.children ?? []).map(c => c.text ?? ""))
    .join(" ");
}

function formatVersionTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function formatFindContentDate(date?: string) {
  if (!date) return "";
  const d = date.length === 10 ? new Date(`${date}T12:00:00`) : new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type NlImage = { assetId: string; url: string; caption?: string; alt?: string };
type NlEditorCard = { id: string; headline: string; doc: JSONContent; image?: NlImage };
type StoredCard = { headline?: string; body?: PortableTextBlock[]; image?: NlImage | null };

export type InitialNewsletter = {
  subject: string;
  preview: string;
  author: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt: string;
  cards: StoredCard[];
} | null;

const newNlCard = (): NlEditorCard => ({ id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, headline: "", doc: EMPTY_DOC });

function cardsFromStored(cards: StoredCard[]): NlEditorCard[] {
  if (!cards.length) return [newNlCard(), newNlCard(), newNlCard()];
  return cards.map(c => ({
    ...newNlCard(),
    headline: c.headline ?? "",
    doc: c.body?.length ? portableTextToTiptap(c.body) : EMPTY_DOC,
    image: c.image ?? undefined,
  }));
}

export default function NewsletterEditorClient({
  newsletterId, initial, initialVersions,
}: { newsletterId: string; initial: InitialNewsletter; initialVersions: NlVersion[] }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 700);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [nlSubject, setNlSubject] = useState(initial?.subject ?? "");
  const [nlPreview, setNlPreview] = useState(initial?.preview ?? "");
  const [nlAuthor, setNlAuthor] = useState(initial?.author ?? "Yacob Reyes");
  const [nlStatus, setNlStatus] = useState<"draft" | "published" | "scheduled">(initial?.status ?? "draft");
  const [nlScheduledAt, setNlScheduledAt] = useState(initial?.scheduledAt ?? "");
  const [nlCards, setNlCards] = useState<NlEditorCard[]>(() => cardsFromStored(initial?.cards ?? []));
  const [nlVersions, setNlVersions] = useState<NlVersion[]>(initialVersions);
  const [nlVersionMenu, setNlVersionMenu] = useState<string | null>(null);
  const [nlSaveStatus, setNlSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [nlSending, setNlSending] = useState(false);
  const [nlImgPickerCard, setNlImgPickerCard] = useState<string | null>(null);
  const [showNlEllipsis, setShowNlEllipsis] = useState(false);
  const [showNlScheduler, setShowNlScheduler] = useState(false);
  const [showNlPreview, setShowNlPreview] = useState(false);

  const [showFindContent, setShowFindContent] = useState(false);
  const [findPosts, setFindPosts] = useState<NlPickablePost[]>([]);
  const [findLoading, setFindLoading] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findShowDraftScheduled, setFindShowDraftScheduled] = useState(false);
  const [nlInsertingPost, setNlInsertingPost] = useState<NlPickablePost | null>(null);
  const nlInsertChipRef = useRef<HTMLDivElement | null>(null);
  const nlInsertStartRef = useRef({ x: 0, y: 0 });
  const nlInsertAtRef = useRef(0);

  const nlLastSaved = useRef<string>("");
  const nlDeleting = useRef(false);
  const [nlMovingId, setNlMovingId] = useState<string | null>(null);
  const nlMoveChipRef = useRef<HTMLDivElement | null>(null);
  const nlMoveRectRef = useRef<{ left: number; width: number }>({ left: 0, width: 0 });
  const nlMoveStartYRef = useRef(0);
  const nlCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nlPrevTops = useRef<Record<string, number> | null>(null);
  const nlCardsRef = useRef<NlEditorCard[]>([]);
  nlCardsRef.current = nlCards;

  const [nlActiveEditor, setNlActiveEditor] = useState<Editor | null>(null);
  const [nlActiveToolbar, setNlActiveToolbar] = useState<ToolbarHandles | null>(null);
  const nlEditors = useRef<Record<string, Editor | null>>({});
  const nlToolbars = useRef<Record<string, ToolbarHandles | null>>({});

  // While a card is "picked up", a click anywhere drops it; Escape cancels.
  // The effect runs after the pick-up click has finished bubbling, so the
  // starting click won't immediately drop it.
  useEffect(() => {
    if (!nlMovingId) return;
    if (nlMoveChipRef.current) nlMoveChipRef.current.style.top = `${nlMoveStartYRef.current - 18}px`;
    const drop = () => setNlMovingId(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNlMovingId(null); };
    // Position the floating card via direct DOM writes (not React state) so
    // it tracks the cursor every frame without re-rendering the whole list.
    // Reorder is recomputed from cursor Y on every move (not mouseenter),
    // so cards swap the instant the cursor crosses a neighbor's midpoint —
    // even if that neighbor just slid out from under a stationary cursor.
    let lastTo: number | null = null;
    const onMove = (e: MouseEvent) => {
      const el = nlMoveChipRef.current;
      if (el) el.style.top = `${e.clientY - 18}px`;

      const cards = nlCardsRef.current;
      const from = cards.findIndex(c => c.id === nlMovingId);
      if (from === -1) return;
      let to = 0;
      for (let idx = 0; idx < cards.length; idx++) {
        if (idx === from) continue;
        const cardEl = nlCardRefs.current[cards[idx].id];
        if (!cardEl) continue;
        const rect = cardEl.getBoundingClientRect();
        if (rect.top + rect.height / 2 < e.clientY) to++;
      }
      if (to === from || to === lastTo) return;
      lastTo = to;
      const tops: Record<string, number> = {};
      for (const c of cards) { const ce = nlCardRefs.current[c.id]; if (ce) tops[c.id] = ce.getBoundingClientRect().top; }
      nlPrevTops.current = tops;
      nlMoveCard(from, to);
    };
    window.addEventListener("mouseup", drop);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mouseup", drop); window.removeEventListener("keydown", onKey); window.removeEventListener("mousemove", onMove); };
  }, [nlMovingId]);

  // FLIP-animate the non-moving cards sliding into their new slots whenever
  // the card order changes mid-drag. nlPrevTops is populated right before
  // nlMoveCard runs (see the onMouseEnter handler below).
  useLayoutEffect(() => {
    const prev = nlPrevTops.current;
    if (!prev) return;
    nlPrevTops.current = null;
    for (const card of nlCards) {
      if (card.id === nlMovingId) continue;
      const el = nlCardRefs.current[card.id];
      const before = prev[card.id];
      if (!el || before === undefined) continue;
      const after = el.getBoundingClientRect().top;
      const delta = before - after;
      if (!delta) continue;
      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.15s ease";
        el.style.transform = "";
      });
    }
  }, [nlCards, nlMovingId]);

  // Load pickable posts whenever the "Find content" panel opens.
  useEffect(() => {
    if (!showFindContent) return;
    setFindLoading(true);
    getPostsForNewsletter().then(setFindPosts).catch(() => setFindPosts([])).finally(() => setFindLoading(false));
  }, [showFindContent]);

  // Press-and-drag a story out of the find-content panel into the card list.
  // Mirrors the card-reorder drag above: a floating chip follows the cursor,
  // and the drop index is recomputed from cursor Y on every move.
  function startInsertPost(e: React.MouseEvent, post: NlPickablePost) {
    e.preventDefault();
    nlInsertStartRef.current = { x: e.clientX, y: e.clientY };
    setShowFindContent(false);
    setNlInsertingPost(post);
  }

  useEffect(() => {
    if (!nlInsertingPost) return;
    if (nlInsertChipRef.current) {
      nlInsertChipRef.current.style.top = `${nlInsertStartRef.current.y - 18}px`;
      nlInsertChipRef.current.style.left = `${nlInsertStartRef.current.x - 18}px`;
    }
    nlInsertAtRef.current = nlCardsRef.current.length;
    const onMove = (e: MouseEvent) => {
      const el = nlInsertChipRef.current;
      if (el) { el.style.top = `${e.clientY - 18}px`; el.style.left = `${e.clientX - 18}px`; }
      const cards = nlCardsRef.current;
      let to = cards.length;
      for (let idx = 0; idx < cards.length; idx++) {
        const cardEl = nlCardRefs.current[cards[idx].id];
        if (!cardEl) continue;
        if (e.clientY < cardEl.getBoundingClientRect().top + cardEl.getBoundingClientRect().height / 2) { to = idx; break; }
      }
      nlInsertAtRef.current = to;
    };
    const onUp = () => { insertPostAsCard(nlInsertingPost, nlInsertAtRef.current); setNlInsertingPost(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNlInsertingPost(null); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nlInsertingPost]);

  // Only headline/body/image carry over — story-only fields like subheadline
  // have no equivalent on a newsletter card, so they're dropped here.
  function insertPostAsCard(post: NlPickablePost, at: number) {
    const card: NlEditorCard = {
      ...newNlCard(),
      headline: post.headline ?? "",
      doc: post.body?.length ? portableTextToTiptap(post.body) : EMPTY_DOC,
      image: post.image ?? undefined,
    };
    setNlCards(prev => { const next = [...prev]; next.splice(at, 0, card); return next; });
  }

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

  // Build the serializable newsletter payload (card bodies → portable text).
  // Expensive (converts every card's doc), so only call this right before
  // an actual save — not on every render just to check if something changed.
  const nlPayload = useCallback(() => ({
    id: newsletterId,
    status: nlStatus,
    scheduledAt: nlScheduledAt || undefined,
    subject: nlSubject,
    preview: nlPreview,
    author: nlAuthor,
    wordCount: nlCards.flatMap(card => (card.doc.content ?? []).flatMap((n: JSONContent) => (n.content ?? []).map((c: JSONContent) => c.text ?? ""))).join(" ").trim().split(/\s+/).filter(Boolean).length,
    cards: nlCards.map(card => ({ headline: card.headline, body: tiptapToPortableText(card.doc), image: card.image ?? null })),
  }), [newsletterId, nlStatus, nlScheduledAt, nlSubject, nlPreview, nlAuthor, nlCards]);

  // Cheap dirty-check signature (raw tiptap docs, no portable-text conversion)
  // so typing doesn't re-run the expensive conversion above on every keystroke.
  const nlSignature = useCallback(() => JSON.stringify({
    status: nlStatus, scheduledAt: nlScheduledAt, subject: nlSubject, preview: nlPreview, author: nlAuthor,
    cards: nlCards.map(c => ({ headline: c.headline, doc: c.doc, image: c.image ?? null })),
  }), [nlStatus, nlScheduledAt, nlSubject, nlPreview, nlAuthor, nlCards]);

  const nlSave = useCallback(async (payload: ReturnType<typeof nlPayload>, signature?: string) => {
    if (nlDeleting.current) return;
    setNlSaveStatus("saving");
    try {
      const data = await saveNewsletter(payload);
      if (Array.isArray(data?.versions)) setNlVersions(data.versions);
      nlLastSaved.current = signature ?? JSON.stringify(payload);
      setNlSaveStatus("saved");
    } catch { setNlSaveStatus("unsaved"); }
  }, []);

  // Seed the dedupe baseline so opening an existing newsletter doesn't immediately re-save.
  useEffect(() => {
    nlLastSaved.current = nlSignature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save every 3s when dirty (matches the story editor). Uses the cheap
  // signature to detect changes on every render, and only pays for the
  // expensive portable-text conversion once the debounce actually fires.
  useEffect(() => {
    const signature = nlSignature();
    if (signature === nlLastSaved.current) return;
    setNlSaveStatus("unsaved");
    const timer = setTimeout(() => { nlSave(nlPayload(), signature); }, 3000);
    return () => clearTimeout(timer);
  }, [nlSignature, nlPayload, nlSave]);

  function exit() { window.location.href = "/admin/imago"; }

  function saveAndExit() {
    const payload = nlPayload();
    if (payload.subject || payload.cards.some(c => c.headline || (c.body && c.body.length))) nlSave(payload);
    exit();
  }

  async function publishNewsletter() {
    if (!nlSubject.trim()) { alert("Add a subject line before publishing."); return; }
    setNlStatus("published");
    await nlSave({ ...nlPayload(), status: "published" });
    if (confirm("Send this newsletter to all subscribers now?")) {
      setNlSending(true);
      try {
        const d = await sendNewsletter(newsletterId);
        if (!d.ok) alert(d.error || "Send failed.");
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

  async function removeNewsletter() {
    if (!confirm("Delete this newsletter? This cannot be undone.")) return;
    nlDeleting.current = true;
    try { await deleteNewsletter(newsletterId); } catch {}
    exit();
  }

  function restoreNlVersion(v: NlVersion) {
    if (!confirm("Restore this version? Your current text will be replaced.")) return;
    setNlSubject(v.subject ?? "");
    setNlPreview(v.preview ?? "");
    setNlAuthor(v.author ?? "Yacob Reyes");
    const srcCards = (v.cards ?? []) as StoredCard[];
    setNlCards((srcCards.length ? srcCards : [{}]).map(c => ({
      ...newNlCard(),
      headline: c.headline ?? "",
      doc: c.body?.length ? portableTextToTiptap(c.body) : EMPTY_DOC,
      image: c.image ?? undefined,
    })));
  }

  const nlActiveE = nlActiveEditor;
  const findFiltered = findPosts.filter(p => {
    const isDraftOrScheduled = p.status === "draft" || p.status === "scheduled";
    if (findShowDraftScheduled ? !isDraftOrScheduled : isDraftOrScheduled) return false;
    const q = findQuery.trim().toLowerCase();
    if (!q) return true;
    const bodyText = ptPlainText(p.body as { _type?: string; children?: { text?: string }[] }[]).toLowerCase();
    return p.headline.toLowerCase().includes(q) || p.byline?.toLowerCase().includes(q) || p.section?.toLowerCase().includes(q) || bodyText.includes(q);
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "white" }}>
      <style>{`
        .nl-tb-btn { position: relative; }
        .nl-add-zone .nl-add-line, .nl-add-zone .nl-add-label { opacity: 0; transition: opacity 0.12s; }
        .nl-add-zone:hover .nl-add-line, .nl-add-zone:hover .nl-add-label { opacity: 1; }
        .nl-card-controls { opacity: 0; transition: opacity 0.12s; pointer-events: none; }
        .nl-card:hover .nl-card-controls, .nl-card-controls:hover { opacity: 1; pointer-events: auto; }
        .nl-find-panel { scrollbar-width: thin; scrollbar-color: ${BORDER} transparent; }
        .nl-find-panel::-webkit-scrollbar { width: 8px; }
        .nl-find-panel::-webkit-scrollbar-track { background: transparent; }
        .nl-find-panel::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 4px; }
        .nl-find-panel::-webkit-scrollbar-thumb:hover { background: ${TEXT_MUTED}; }
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

      {/* Floating "find content" trigger — fixed to the left edge, hidden while the panel is open */}
      {!isMobile && !showFindContent && (
        <button type="button" title="Find content" onClick={() => setShowFindContent(true)}
          style={{ position: "fixed", top: 80, left: 24, zIndex: 50, width: 44, height: 44, borderRadius: "50%", background: CRIMSON, color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </button>
      )}

      {/* Find content panel — pull a story in as a new card */}
      {showFindContent && (
        <div className="nl-find-panel" style={{ position: "fixed", top: 64, left: 12, height: "calc(100% - 76px)", width: 296, maxWidth: "88vw", zIndex: 400, background: "white", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "4px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontFamily: FONT, fontWeight: 700, color: TEXT_DARK }}>Find content</span>
              <button type="button" title="Close" onClick={() => setShowFindContent(false)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: TEXT_MUTED, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", borderBottom: `1px solid ${BORDER}` }}>
              <input value={findQuery} onChange={e => setFindQuery(e.target.value)} placeholder="Search by headline, byline, or content" style={INPUT} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }} onClick={() => setFindShowDraftScheduled(v => !v)}>
                <span style={{ width: 32, height: 18, borderRadius: 10, background: findShowDraftScheduled ? CRIMSON : "#ccd3d8", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 2, left: findShowDraftScheduled ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.15s" }} />
                </span>
                <span style={{ fontFamily: FONT, fontSize: "0.82rem", color: TEXT_MUTED }}>Only draft and scheduled</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {findLoading ? (
                <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, padding: "1rem 1.25rem" }}>Loading…</p>
              ) : findFiltered.length === 0 ? (
                <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: TEXT_MUTED, padding: "1rem 1.25rem" }}>No stories found.</p>
              ) : findFiltered.map(p => (
                <div key={p.id} onMouseDown={e => startInsertPost(e, p)}
                  style={{ padding: "0.85rem 1.25rem", borderBottom: `1px solid ${BORDER}`, cursor: "grab", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.byline || "Unknown"}{p.section ? ` · ${p.section}` : ""}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: TEXT_MUTED, marginLeft: "0.5rem" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 600, color: TEXT_DARK, margin: 0 }}>{p.headline || "Untitled"}</p>
                  <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, margin: "0.3rem 0 0" }}>
                    {p.status === "draft" ? "Draft" : p.status === "scheduled" ? `Scheduled for ${formatFindContentDate(p.date)}` : `Published on ${formatFindContentDate(p.date)}`}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ padding: "0.75rem 1.25rem", borderTop: `1px solid ${BORDER}` }}>
              <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: TEXT_MUTED, margin: 0 }}>Press and drag a story into the newsletter to add it as a card.</p>
            </div>
        </div>
      )}

      {/* Floating chip for a story being dragged in from the find-content panel */}
      {nlInsertingPost && (
        <div ref={nlInsertChipRef} style={{ position: "fixed", top: 0, left: 0, zIndex: 1000, pointerEvents: "none", background: "white", border: `1px solid ${CRIMSON}`, borderRadius: 4, padding: "0.65rem 1rem", boxShadow: "0 10px 30px rgba(0,0,0,0.22)", maxWidth: 260 }}>
          <span style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: TEXT_DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{nlInsertingPost.headline || "Untitled story"}</span>
        </div>
      )}

      {/* Top bar — matches story editor */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.5rem", borderBottom: `1px solid ${BORDER}`, height: 52, boxSizing: "border-box", flexShrink: 0, background: "white", position: "fixed", top: 0, left: 0, right: 0, zIndex: 410 }}>
        <button onClick={saveAndExit} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, color: TEXT_MUTED, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Save &amp; Exit
        </button>

        {/* Formatting toolbar — drives the focused card editor */}
        {!isMobile && nlActiveE && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
            <button type="button" title="Undo" disabled={!nlActiveE.can().undo()} onMouseDown={e => { e.preventDefault(); nlActiveE.chain().focus().undo().run(); }}
              style={{ background: "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: nlActiveE.can().undo() ? "pointer" : "default", color: TEXT_MUTED, opacity: nlActiveE.can().undo() ? 1 : 0.4 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
            </button>
            <button type="button" title="Redo" disabled={!nlActiveE.can().redo()} onMouseDown={e => { e.preventDefault(); nlActiveE.chain().focus().redo().run(); }}
              style={{ background: "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: nlActiveE.can().redo() ? "pointer" : "default", color: TEXT_MUTED, opacity: nlActiveE.can().redo() ? 1 : 0.4 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>
            </button>
            <div style={{ width: 1, height: 22, background: BORDER, margin: "0 0.3rem" }} />
            {([
              ["B", nlActiveE.isActive("bold"), () => nlActiveE.chain().focus().toggleBold().run(), { fontWeight: 700 }],
              ["I", nlActiveE.isActive("italic"), () => nlActiveE.chain().focus().toggleItalic().run(), { fontStyle: "italic" }],
            ] as [string, boolean, () => void, React.CSSProperties][]).map(([label, active, action, style]) => (
              <button key={label} type="button" onMouseDown={e => { e.preventDefault(); action(); }}
                style={{ background: active ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: active ? CRIMSON : TEXT_MUTED, fontFamily: FONT, fontSize: "1.15rem", ...style }}>
                {label}
              </button>
            ))}
            <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveE.chain().focus().toggleBlockquote().run(); }}
              style={{ background: nlActiveE.isActive("blockquote") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveE.isActive("blockquote") ? CRIMSON : TEXT_MUTED }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveE.chain().focus().toggleHeading({ level: 2 }).run(); }}
              style={{ background: nlActiveE.isActive("heading", { level: 2 }) ? "#f0f0f0" : "none", border: "none", borderRadius: 4, padding: "0 8px", height: 38, display: "flex", alignItems: "center", cursor: "pointer", color: nlActiveE.isActive("heading", { level: 2 }) ? CRIMSON : TEXT_MUTED, fontFamily: FONT, fontSize: "1rem", fontWeight: 700 }}>
              H2
            </button>
            <div style={{ width: 1, height: 22, background: BORDER, margin: "0 0.3rem" }} />
            <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveE.chain().focus().toggleBulletList().run(); }}
              style={{ background: nlActiveE.isActive("bulletList") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveE.isActive("bulletList") ? CRIMSON : TEXT_MUTED }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveE.chain().focus().toggleOrderedList().run(); }}
              style={{ background: nlActiveE.isActive("orderedList") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveE.isActive("orderedList") ? CRIMSON : TEXT_MUTED }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
            </button>
            <div style={{ width: 1, height: 22, background: BORDER, margin: "0 0.3rem" }} />
            <button type="button" onMouseDown={e => { e.preventDefault(); nlActiveToolbar?.openLink(); }}
              style={{ background: nlActiveE.isActive("link") ? "#f0f0f0" : "none", border: "none", borderRadius: 4, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: nlActiveE.isActive("link") ? CRIMSON : TEXT_MUTED }}>
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
                <button type="button" onClick={() => { if (!nlScheduledAt) { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); setNlScheduledAt(d.toISOString().slice(0, 16)); } setShowNlScheduler(true); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Schedule</button>
                {nlStatus === "published" && (
                  <button type="button" onClick={unpublishNewsletter} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: TEXT_DARK, cursor: "pointer" }}>Unpublish</button>
                )}
                <div style={{ borderTop: `1px solid ${BORDER}` }} />
                <button type="button" onClick={removeNewsletter} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "0.65rem 1rem", fontFamily: FONT, fontSize: "0.88rem", color: CRIMSON, cursor: "pointer" }}>Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#f5f8fa", padding: "2rem", marginTop: 52 }}>
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

          {/* The picked-up card itself follows the cursor (full-width card bar).
              Position is written directly to the DOM node (see mousemove handler
              above), not via React state, so it tracks the cursor with no lag. */}
          {nlMovingId && (() => {
            const mc = nlCards.find(c => c.id === nlMovingId);
            const idx = nlCards.findIndex(c => c.id === nlMovingId);
            if (!mc) return null;
            return (
              <div ref={nlMoveChipRef} style={{ position: "fixed", left: nlMoveRectRef.current.left, top: 0, width: nlMoveRectRef.current.width, zIndex: 1000, pointerEvents: "none", background: "white", border: `1px solid ${CRIMSON}`, borderRadius: 4, padding: "1.25rem", boxShadow: "0 10px 30px rgba(0,0,0,0.22)", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span style={{ fontFamily: FONT, fontSize: "1.25rem", fontWeight: 700, color: CRIMSON, flexShrink: 0 }}>{idx + 1}.</span>
                <span style={{ fontFamily: FONT, fontSize: "1.25rem", fontWeight: 700, color: TEXT_DARK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mc.headline?.trim() || "Type your headline"}</span>
              </div>
            );
          })()}

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

              <div className="nl-card" draggable={false}
                ref={el => { nlCardRefs.current[card.id] = el; }}
                onFocusCapture={() => { setNlActiveEditor(nlEditors.current[card.id] ?? null); setNlActiveToolbar(nlToolbars.current[card.id] ?? null); }}
                style={nlMovingId === card.id
                  ? { height: 0, padding: 0, margin: 0, border: "none", overflow: "hidden", transition: "height 0.12s ease" }
                  : { position: "relative", background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.25rem", cursor: nlMovingId ? "pointer" : undefined }}>
                {/* Hover-side controls — hidden while a card is picked up */}
                {!nlMovingId && (
                <div className="nl-card-controls" style={{ position: "absolute", top: 0, left: "100%", paddingLeft: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <button type="button" title="Hold and drag to move" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); const r = (e.currentTarget as HTMLElement).closest(".nl-card")?.getBoundingClientRect(); if (r) nlMoveRectRef.current = { left: r.left, width: r.width }; nlMoveStartYRef.current = e.clientY; setNlMovingId(card.id); }}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", color: TEXT_MUTED, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                  </button>
                  <button type="button" title="Delete card" onClick={() => { if (nlCards.length > 1 && confirm("Delete this card?")) nlRemoveCard(card.id); }}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: nlCards.length > 1 ? "pointer" : "not-allowed", color: TEXT_MUTED, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", opacity: nlCards.length > 1 ? 1 : 0.4 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                )}
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: nlMovingId ? 0 : "0.75rem", visibility: nlMovingId === card.id ? "hidden" : "visible" }}>
                  <span style={{ fontFamily: FONT, fontSize: "1.25rem", fontWeight: 700, color: i === 0 ? CRIMSON : TEXT_DARK, flexShrink: 0 }}>{i + 1}.</span>
                  <input value={card.headline} onChange={e => nlUpdateCard(card.id, { headline: e.target.value })} placeholder="Type your headline" style={{ ...INPUT, flex: 1, fontSize: "1.25rem", fontWeight: 700, border: "none", padding: 0, background: "transparent" }} />
                </div>
                {/* Body (image + editor) collapses while dragging so the list
                    condenses to headline bars — kept mounted via display:none. */}
                <div style={{ display: nlMovingId ? "none" : "block" }}>
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

          {/* Divider + Previous versions — matches story editor's list */}
          <hr style={{ border: "none", borderTop: `1px solid ${BORDER}`, margin: "1rem 0 0.5rem" }} />
          <div>
            <h3 style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: TEXT_DARK, margin: "0 0 1rem" }}>Previous versions</h3>
            {nlVersions.length === 0 ? (
              <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: TEXT_MUTED }}>No saves recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {nlVersions.map(v => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: `1px solid ${BORDER}`, gap: "0.75rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600, color: TEXT_DARK, margin: 0 }}>{formatVersionTime(v.createdAt)}</p>
                      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, margin: "0.15rem 0 0" }}>
                        {v.type === "publish" ? "Published" : "Auto-saved"}
                        {v.wordCount ? ` · ${v.wordCount} words` : ""}
                      </p>
                    </div>
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
