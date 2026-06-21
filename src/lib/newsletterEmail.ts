// Renders newsletter cards (portable text) into a self-contained HTML email.
// Kept dependency-free: a small serializer for the block types our editor emits.
import type { PortableTextBlock } from "@portabletext/types";

export type NlCard = {
  headline?: string;
  body?: PortableTextBlock[];
  image?: { url?: string; caption?: string; alt?: string } | null;
  cardType?: "narratives" | "essays" | "micro-memoir" | "feature" | "standard" | "digest";
  byline?: string;
};

const CRIMSON = "#8e0d0d";
const INK = "#171412";
const TEXT_MUTED = "#463f37";
const CREAM = "#fbf6ee";
const PAPER_DARK = "#f5efe4";
const LINE = "#cfc3b3";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";

// Email clients (and the preview iframe) can't load a relative path, so the
// masthead image needs an absolute URL to match the in-app editor's wordmark.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app").replace(/\/$/, "");

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

// Layout constants — matched to the editor canvas (PAD = 2.5rem at 16px base).
const PAGE_W = 600;
const PAD = 40;

// Web reader version — div-based, matches the editor canvas exactly.
// Used on /issues/[slug]; the email table version above is for actual email delivery.
export function renderNewsletterPageHtml({ subject, preview, intro, author, volume, issue, cards }: { subject: string; preview: string; intro?: string; author?: string; volume?: string; issue?: string; cards: NlCard[] }): string {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const PAD_CSS = "0 2.5rem";

  function effectiveType(card: NlCard, idx: number): "narratives" | "essays" | "micro-memoir" {
    const t = card.cardType;
    if (t === "narratives" || t === "feature") return "narratives";
    if (t === "essays" || t === "standard") return "essays";
    if (t === "micro-memoir" || t === "digest") return "micro-memoir";
    if (idx === 0) return "narratives";
    return "essays";
  }

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
        <div style="padding-bottom:2rem;">
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
      <div style="background:${PAPER_DARK};border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};padding:2rem 2rem 2.5rem;text-align:center;margin:0.375rem -2.5rem 0;">
        <img src="${SITE_URL}/Flying%20Mayfly%20Kicker.webp" alt="" style="display:block;height:200px;width:auto;margin:-35px auto -60px;" />
        <p style="font-family:${SERIF};font-size:1.7rem;font-weight:400;line-height:1.2;letter-spacing:0.02em;color:${INK};margin:0 0 0.35rem;">${esc(card.headline ?? "")}</p>
        <p style="font-family:${FONT};font-size:0.7rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${CRIMSON};margin:0 0 1.5rem;">A Micro-Memoir${card.byline ? ` by ${esc(card.byline)}` : ""}</p>
        <div style="width:32px;height:1px;background:${LINE};margin:0 auto 1.5rem;"></div>
        <div>${renderBody(card.body ?? [])}</div>
      </div>
    </div>`;
  }).join("");

  return `<div style="max-width:600px;margin:0 auto;background:${CREAM};box-shadow:0 4px 32px rgba(0,0,0,0.18);">
    <div style="background:${CREAM};padding:1.25rem 0;text-align:center;border-bottom:1px solid ${LINE};">
      <img src="${SITE_URL}/Crimson%20Wordmark.png" alt="efemera" style="height:58px;width:auto;display:inline-block;" />
    </div>
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
    <div style="padding:${PAD_CSS} 2.5rem;">
      ${cardsHtml}
    </div>
  </div>`;
}

export function renderNewsletterHtml({ subject, preview, intro, author, volume, issue, cards }: { subject: string; preview: string; intro?: string; author?: string; volume?: string; issue?: string; cards: NlCard[] }): string {
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Determine effective card type, mapping old names forward
  function effectiveType(card: NlCard, idx: number): "narratives" | "essays" | "micro-memoir" {
    const t = card.cardType;
    if (t === "narratives" || t === "feature") return "narratives";
    if (t === "essays" || t === "standard") return "essays";
    if (t === "micro-memoir" || t === "digest") return "micro-memoir";
    // no type set: first card defaults to narratives
    if (idx === 0) return "narratives";
    return "essays";
  }

  // Section flag — small-caps crimson label above every card (matches editor).
  const sectionLabel = (name: string) =>
    `<div style="font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${CRIMSON};margin-bottom:6px;">${name}</div>`;

  // Wrapper adds uniform top spacing between cards.
  const cardWrap = (idx: number, inner: string) =>
    `<div style="margin-top:${idx === 0 ? 20 : 32}px;">${inner}</div>`;

  // Render cards IN ORDER, each with its own template — div-based to mirror the editor.
  const bodyHtml = cards.map((card, idx) => {
    const type = effectiveType(card, idx);
    const sectionName = type === "narratives" ? "NARRATIVES" : type === "essays" ? "ESSAYS" : "MICRO-MEMOIR";

    if (type === "narratives") {
      const img = card.image?.url
        ? `<div style="margin:0 -${PAD}px 28px;">
             <img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;max-height:400px;object-fit:cover;display:block;" />
             ${card.image.caption ? `<p style="font-family:${FONT};font-size:11px;font-style:italic;color:${TEXT_MUTED};margin:6px 16px 0;">${esc(card.image.caption)}</p>` : ""}
           </div>`
        : "";
      return cardWrap(idx, `
    ${sectionLabel(sectionName)}
    <div style="padding-bottom:32px;">
      ${img}
      <h1 style="font-family:${HEADLINE_FONT};font-size:30px;font-weight:700;color:${CRIMSON};line-height:1.15;text-align:center;margin:0 0 16px;">${esc(card.headline ?? "")}</h1>
      ${card.byline ? `<p style="font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.02em;color:${INK};text-align:center;margin:0 0 16px;">By ${esc(card.byline)}</p>` : ""}
      ${renderBody(card.body ?? [])}
    </div>`);
    }

    if (type === "essays") {
      const img = card.image?.url
        ? `<div style="margin:0 0 14px;">
             <img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;max-height:240px;object-fit:cover;display:block;" />
             ${card.image.caption ? `<p style="font-family:${FONT};font-size:11px;font-style:italic;color:${TEXT_MUTED};margin:6px 0 0;">${esc(card.image.caption)}</p>` : ""}
           </div>`
        : "";
      return cardWrap(idx, `
    ${sectionLabel(sectionName)}
    <div style="padding-bottom:32px;">
      <div style="border-top:2px solid ${CRIMSON};padding-top:14px;margin-bottom:14px;">
        <h2 style="font-family:${HEADLINE_FONT};font-size:24px;font-weight:400;color:${CRIMSON};line-height:1.25;text-align:left;margin:0;">${esc(card.headline ?? "")}</h2>
      </div>
      ${card.byline ? `<p style="font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.02em;color:${INK};text-align:left;margin:0 0 14px;">By ${esc(card.byline)}</p>` : ""}
      ${img}
      ${renderBody(card.body ?? [])}
    </div>`);
    }

    // micro-memoir: literary magazine style — beige inset box
    return cardWrap(idx, `
    ${sectionLabel(sectionName)}
    <div style="background:${PAPER_DARK};border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};padding:32px 32px 40px;text-align:center;margin:6px -${PAD}px 0;">
      <img src="${SITE_URL}/Flying%20Mayfly%20Kicker.webp" alt="" style="height:200px;width:auto;display:block;margin:-35px auto -60px;" />
      <p style="font-family:${HEADLINE_FONT};font-size:27px;font-weight:400;line-height:1.2;letter-spacing:0.02em;color:${INK};text-align:center;margin:0 0 6px;">${esc(card.headline ?? "")}</p>
      <p style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${CRIMSON};text-align:center;margin:0 0 24px;">A Micro-Memoir${card.byline ? ` by ${esc(card.byline)}` : ""}</p>
      <div style="width:32px;height:1px;background:${LINE};margin:0 auto 24px;"></div>
      <div style="text-align:center;">${renderBody(card.body ?? [])}</div>
    </div>`);
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${CREAM};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:0;">
    <tr><td align="center">
      <table width="${PAGE_W}" cellpadding="0" cellspacing="0" style="width:${PAGE_W}px;max-width:100%;background:${CREAM};">
        <tr><td style="background:${CREAM};padding:20px 0;text-align:center;border-bottom:1px solid ${LINE};">
          <img src="${SITE_URL}/Crimson%20Wordmark.png" alt="efemera" style="height:58px;width:auto;display:inline-block;" />
        </td></tr>
        <tr><td style="background:${CRIMSON};padding:10px ${PAD}px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
            <td style="font-family:${FONT};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${CREAM};">${date}</td>
            <td style="font-family:${FONT};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${CREAM};text-align:right;">${volume ? `Vol. ${esc(volume)}` : ""}${volume && issue ? " &nbsp;·&nbsp; " : ""}${issue ? `No. ${esc(issue)}` : ""}</td>
          </tr></table>
          ${intro ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="440" cellpadding="0" cellspacing="0" style="max-width:440px;"><tr><td style="text-align:center;"><p style="font-family:${HEADLINE_FONT};font-size:16px;line-height:1.6;color:${CREAM};margin:0;white-space:pre-line;">${esc(intro)}</p>${author ? `<p style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${CREAM};opacity:0.8;margin:10px 0 0;">By ${esc(author)}</p>` : ""}</td></tr></table></td></tr></table>` : ""}
        </td></tr>
        <tr><td style="padding:0 ${PAD}px 40px;">${bodyHtml}</td></tr>
        <tr><td style="background:${CRIMSON};padding:20px ${PAD}px;text-align:center;">
          <p style="font-family:${FONT};font-size:10px;color:#ffffff;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px;">You're receiving this because you subscribed to efemera</p>
          <a href="{{{UNSUBSCRIBE_URL}}}" style="font-family:${FONT};font-size:10px;font-weight:600;color:#ffffff;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
