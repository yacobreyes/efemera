// Renders newsletter cards (portable text) into a self-contained HTML email.
// Kept dependency-free: a small serializer for the block types our editor emits.
import type { PortableTextBlock } from "@portabletext/types";
import { straightenQuotes, straightenBlocks } from "./straighten";

export type NlCard = {
  headline?: string;
  body?: PortableTextBlock[];
  image?: { url?: string; caption?: string; alt?: string } | null;
  cardType?: "narratives" | "essays" | "micro-memoir" | "feature" | "standard" | "digest";
  byline?: string;
};

const CRIMSON = "#490000";
const INK = "#000000";
const TEXT_MUTED = "#392a22";
const CREAM = "#ffffff";
const PAPER_DARK = "#ffffff";
const LINE = "#b8b8ba";
// Match the editor/site typography. Browser-based renders (the preview iframe
// and the /issues web reader) load Astoria via the Adobe Typekit link injected
// below; email clients that can't load it fall back to the listed system fonts.
const FONT = "'astoria', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'astoria', Georgia, 'Times New Roman', serif";

// Email clients (and the preview iframe) can't load a relative path, so the
// masthead image needs an absolute URL to match the in-app editor's wordmark.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://gangrey.org").replace(/\/$/, "");

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Span = { text?: string; marks?: string[] };
type MarkDef = { _key: string; _type: string; href?: string };

function renderSpans(spans: Span[], markDefs: MarkDef[]): string {
  return spans
    .map(span => {
      let html = esc(span.text ?? "");
      for (const m of span.marks ?? []) {
        if (m === "strong") html = `<strong>${html}</strong>`;
        else if (m === "em") html = `<em>${html}</em>`;
        else {
          const def = markDefs.find(d => d._key === m);
          if (def?._type === "link" && def.href) html = `<a href="${esc(def.href)}" style="color:${CRIMSON};">${html}</a>`;
        }
      }
      return html;
    })
    .join("");
}

function renderBody(blocks: PortableTextBlock[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i] as PortableTextBlock & { style?: string; listItem?: string; markDefs?: MarkDef[]; children?: Span[]; src?: string; alt?: string };

    if (b._type === "imageEmbed") {
      out.push(`<img src="${esc(b.src ?? "")}" alt="${esc(b.alt ?? "")}" style="width:100%;border-radius:6px;margin:0 0 16px;" />`);
      i++; continue;
    }
    if (b._type !== "block") { i++; continue; }

    const spans = (b.children ?? []) as Span[];
    const inline = renderSpans(spans, b.markDefs ?? []);
    const style = b.style ?? "normal";

    if (b.listItem === "bullet" || b.listItem === "number") {
      const tag = b.listItem === "bullet" ? "ul" : "ol";
      const items: string[] = [];
      while (i < blocks.length) {
        const bi = blocks[i] as PortableTextBlock & { listItem?: string; children?: Span[]; markDefs?: MarkDef[] };
        if (bi._type !== "block" || bi.listItem !== b.listItem) break;
        items.push(`<li style="margin:0 0 6px;">${renderSpans((bi.children ?? []) as Span[], bi.markDefs ?? [])}</li>`);
        i++;
      }
      out.push(`<${tag} style="font-family:${HEADLINE_FONT};font-size:18px;line-height:1.7;color:${INK};margin:0 0 16px;padding-left:22px;">${items.join("")}</${tag}>`);
      continue;
    }

    if (style === "h2") out.push(`<h2 style="font-family:${HEADLINE_FONT};font-size:24px;font-weight:700;color:${INK};margin:28px 0 6px;">${inline}</h2>`);
    else if (style === "blockquote") out.push(`<blockquote style="border-left:3px solid ${CRIMSON};margin:16px 0;padding:2px 0 2px 16px;font-style:italic;color:${TEXT_MUTED};font-family:${HEADLINE_FONT};font-size:18px;">${inline}</blockquote>`);
    else out.push(`<p style="font-family:${HEADLINE_FONT};font-size:18px;line-height:1.7;color:${INK};margin:0 0 16px;">${inline}</p>`);
    i++;
  }
  return out.join("");
}

const HEADLINE_FONT = SERIF;

function effectiveType(card: NlCard, idx: number): "narratives" | "essays" | "micro-memoir" {
  const t = card.cardType;
  if (t === "narratives" || t === "feature") return "narratives";
  if (t === "essays" || t === "standard") return "essays";
  if (t === "micro-memoir" || t === "digest") return "micro-memoir";
  if (idx === 0) return "narratives";
  return "essays";
}

type NlOpts = { subject: string; preview: string; intro?: string; author?: string; volume?: string; issue?: string; cards: NlCard[]; baseUrl?: string };

// Single source of truth — produces the exact markup the admin editor canvas
// renders. Both the web reader (/issues/[slug]) and the email reuse this so the
// preview, the sent email, and the editor all look identical. The only knob is
// whether to include the cream wordmark masthead (the web reader omits it
// because MagHeader already shows the wordmark above it).
function renderNewsletterContent(raw: NlOpts, opts: { masthead: boolean }): string {
  // Enforce straight quotes across all newsletter text (matches site house style).
  const intro = raw.intro ? straightenQuotes(raw.intro) : raw.intro;
  const author = raw.author ? straightenQuotes(raw.author) : raw.author;
  const { volume, issue } = raw;
  const cards = raw.cards.map(c => ({
    ...c,
    headline: c.headline ? straightenQuotes(c.headline) : c.headline,
    byline: c.byline ? straightenQuotes(c.byline) : c.byline,
    body: c.body ? straightenBlocks(c.body) : c.body,
    image: c.image ? { ...c.image, caption: c.image.caption ? straightenQuotes(c.image.caption) : c.image.caption } : c.image,
  }));
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const sectionLabel = (name: string) =>
    `<div style="padding-top:1.25rem;font-family:${FONT};font-size:0.65rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${CRIMSON};margin-bottom:0.4rem;">${name}</div>`;

  const cardsHtml = cards.map((card, idx) => {
    const type = effectiveType(card, idx);
    const sectionName = type === "narratives" ? "NARRATIVES" : type === "essays" ? "ESSAYS" : "MICRO-MEMOIR";

    if (type === "narratives") {
      const img = card.image?.url
        ? `<div style="margin:0 -2.5rem 1.75rem;">
             <img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;max-height:400px;object-fit:cover;display:block;" />
             ${card.image.caption ? `<p style="font-family:${FONT};font-size:0.7rem;font-style:italic;color:${TEXT_MUTED};margin:0.4rem 1rem 0;">${esc(card.image.caption)}</p>` : ""}
           </div>`
        : "";
      return `<div>
        ${sectionLabel(sectionName)}
        <div style="padding-top:1rem;padding-bottom:2rem;">
          ${img}
          <h1 style="font-family:${SERIF};font-size:1.9rem;font-weight:700;line-height:1.15;color:${CRIMSON};text-align:center;margin:0 0 1rem;">${esc(card.headline ?? "")}</h1>
          ${card.byline ? `<p style="font-family:${FONT};font-size:0.8rem;font-weight:700;letter-spacing:0.02em;color:${INK};text-align:center;margin:0 0 1rem;">By ${esc(card.byline)}</p>` : ""}
          ${renderBody(card.body ?? [])}
        </div>
      </div>`;
    }

    if (type === "essays") {
      const img = card.image?.url
        ? `<div style="margin:0 0 0.85rem;">
             <img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;max-height:240px;object-fit:cover;display:block;" />
             ${card.image.caption ? `<p style="font-family:${FONT};font-size:0.7rem;font-style:italic;color:${TEXT_MUTED};margin:0.4rem 0 0;">${esc(card.image.caption)}</p>` : ""}
           </div>`
        : "";
      return `<div>
        ${sectionLabel(sectionName)}
        <div style="padding-bottom:1.75rem;">
          <div style="border-top:2px solid ${CRIMSON};padding-top:0.85rem;margin-bottom:0.85rem;">
            <h2 style="font-family:${SERIF};font-size:1.5rem;font-weight:400;line-height:1.25;color:${CRIMSON};margin:0;">${esc(card.headline ?? "")}</h2>
          </div>
          ${card.byline ? `<p style="font-family:${FONT};font-size:0.8rem;font-weight:700;letter-spacing:0.02em;color:${INK};margin:0 0 0.85rem;">By ${esc(card.byline)}</p>` : ""}
          ${img}
          ${renderBody(card.body ?? [])}
        </div>
      </div>`;
    }

    return `<div>
      ${sectionLabel(sectionName)}
      <div style="background:#b8b8ba;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};padding:2rem 2rem 2.5rem;text-align:center;margin:0.375rem -2.5rem 0;">
        <p style="font-family:${SERIF};font-size:1.7rem;font-weight:400;line-height:1.2;letter-spacing:0.02em;color:${INK};margin:0 0 0.35rem;">${esc(card.headline ?? "")}</p>
        <p style="font-family:${FONT};font-size:0.7rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${CRIMSON};margin:0 0 1.5rem;">A Micro-Memoir${card.byline ? ` by ${esc(card.byline)}` : ""}</p>
        <div style="width:32px;height:1px;background:${LINE};margin:0 auto 1.5rem;"></div>
        <div>${renderBody(card.body ?? [])}</div>
      </div>
    </div>`;
  }).join("");

  const masthead = opts.masthead
    ? `<div style="background:${CREAM};padding:28px 24px 22px;text-align:center;border-bottom:1px solid ${LINE};">
         <span style="font-family:${SERIF};font-size:46px;line-height:1;font-weight:700;letter-spacing:-0.02em;color:${CRIMSON};">Gangrey</span>
       </div>`
    : "";

  return `${masthead}
    <div style="background:${CRIMSON};padding:0.6rem 2.5rem 1.5rem;text-align:center;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;">
        <span style="font-family:${FONT};font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:${CREAM};">${date}</span>
        <span style="font-family:${FONT};font-size:0.6rem;letter-spacing:0.18em;text-transform:uppercase;color:${CREAM};">${volume ? `Vol. ${esc(volume)}` : ""}${volume && issue ? " · " : ""}${issue ? `No. ${esc(issue)}` : ""}</span>
      </div>
      ${intro ? `<div style="max-width:440px;margin:0 auto;">
        <p style="font-family:${SERIF};font-size:1rem;line-height:1.6;color:${CREAM};margin:0;white-space:pre-line;">${esc(intro)}</p>
        ${author ? `<p style="font-family:${FONT};font-size:0.72rem;font-weight:700;color:${CREAM};opacity:0.8;margin:0.6rem 0 0;letter-spacing:0.08em;text-transform:uppercase;">By ${esc(author)}</p>` : ""}
      </div>` : ""}
    </div>
    <div style="padding:0 2.5rem 2.5rem;">
      ${cardsHtml}
    </div>`;
}

// The full newsletter sheet — masthead, content, and unsubscribe footer.
// Shared by the email and the web reader so both look identical.
function renderNewsletterSheet(opts: NlOpts): string {
  return `<div style="width:100%;max-width:600px;margin:0 auto;background:${CREAM};">
    ${renderNewsletterContent(opts, { masthead: true })}
    <div style="background:${CRIMSON};padding:20px 2.5rem;text-align:center;">
      <p style="font-family:${FONT};font-size:10px;color:#ffffff;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px;">You're receiving this because you subscribed to Gangrey</p>
      <a href="${SITE_URL}/unsubscribe" target="_blank" rel="noopener" style="font-family:${FONT};font-size:10px;font-weight:600;color:#ffffff;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;">Unsubscribe</a>
    </div>
  </div>`;
}

// Web reader version — used on /issues/[slug]. Renders the same masthead +
// footer sheet as the sent email so the on-site render matches the inbox.
export function renderNewsletterPageHtml(opts: NlOpts): string {
  return renderNewsletterSheet(opts);
}

// Email version — same sheet, wrapped with the email document shell (preview
// text, light color-scheme lock).
export function renderNewsletterHtml(opts: NlOpts): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<link rel="stylesheet" href="https://use.typekit.net/umi3ufr.css">
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  /* Keep brand colors fixed in clients that force dark mode. */
  u + .body .force-light { background-color: inherit !important; }
  [data-ogsc] .force-light, [data-ogsb] .force-light { background-color: inherit !important; }
</style></head>
<body style="margin:0;padding:0;background:${CREAM};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preview)}</span>
  ${renderNewsletterSheet(opts)}
</body></html>`;
}
