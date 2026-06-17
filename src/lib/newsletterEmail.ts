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

const CRIMSON = "#8B0000";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";
// Matches the Inter used everywhere else on the site (CMS, story page, feed);
// most email clients can't load web fonts, so this falls back to the same
// system-sans stack as globals.css.
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
      out.push(`<${tag} style="font-family:${FONT};font-size:16px;line-height:1.8;color:${TEXT_DARK};margin:0 0 16px;padding-left:22px;">${items.join("")}</${tag}>`);
      continue;
    }

    if (style === "h2") out.push(`<h2 style="font-family:${FONT};font-size:20px;font-weight:700;color:${TEXT_DARK};margin:28px 0 6px;">${inline}</h2>`);
    else if (style === "blockquote") out.push(`<blockquote style="border-left:3px solid ${CRIMSON};margin:16px 0;padding:2px 0 2px 16px;font-style:italic;color:${TEXT_MUTED};font-family:${FONT};">${inline}</blockquote>`);
    else out.push(`<p style="font-family:${FONT};font-size:16px;line-height:1.8;color:${TEXT_DARK};margin:0 0 16px;">${inline}</p>`);
    i++;
  }
  return out.join("");
}

const HEADLINE_FONT = "'Georgia', 'Times New Roman', serif";

// Layout constants mirror the in-app editor (NewsletterEditorClient) so the
// sent email looks identical to the preview the author sees in Imago.
const PAGE_W = 600;       // email-safe width (editor page is 680; narrowed for inboxes)
const PAD = 36;           // page horizontal padding
const BORDER = "#e1e8ed";

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
    `<div style="font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${CRIMSON};padding-top:20px;margin-bottom:6px;">${name}</div>`;

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
      return `
    ${sectionLabel(sectionName)}
    <div style="padding-top:16px;padding-bottom:32px;">
      ${img}
      <h1 style="font-family:${HEADLINE_FONT};font-size:30px;font-weight:700;color:${CRIMSON};line-height:1.15;text-align:center;margin:0 0 16px;">${esc(card.headline ?? "")}</h1>
      ${card.byline ? `<p style="font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.02em;color:${TEXT_DARK};text-align:center;margin:0 0 16px;">By ${esc(card.byline)}</p>` : ""}
      ${renderBody(card.body ?? [])}
    </div>`;
    }

    if (type === "essays") {
      const img = card.image?.url
        ? `<div style="margin:0 0 14px;">
             <img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;max-height:240px;object-fit:cover;display:block;" />
             ${card.image.caption ? `<p style="font-family:${FONT};font-size:11px;font-style:italic;color:${TEXT_MUTED};margin:6px 0 0;">${esc(card.image.caption)}</p>` : ""}
           </div>`
        : "";
      return `
    ${sectionLabel(sectionName)}
    <div style="padding-top:16px;padding-bottom:28px;">
      <div style="border-top:2px solid ${CRIMSON};padding-top:14px;margin-bottom:14px;">
        <h2 style="font-family:${HEADLINE_FONT};font-size:24px;font-weight:400;color:${CRIMSON};line-height:1.25;text-align:left;margin:0;">${esc(card.headline ?? "")}</h2>
      </div>
      ${card.byline ? `<p style="font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.02em;color:${TEXT_DARK};text-align:left;margin:0 0 14px;">By ${esc(card.byline)}</p>` : ""}
      ${img}
      ${renderBody(card.body ?? [])}
    </div>`;
    }

    // micro-memoir: literary magazine style — beige inset box
    return `
    ${sectionLabel(sectionName)}
    <div style="background:#faf9f6;border-top:1px solid #e8e3d8;border-bottom:1px solid #e8e3d8;padding:32px;text-align:center;margin-top:6px;">
      <img src="${SITE_URL}/Flying%20Mayfly%20Kicker.webp" alt="" style="height:200px;width:auto;display:block;margin:-35px auto -60px;" />
      <p style="font-family:${HEADLINE_FONT};font-size:27px;font-weight:400;line-height:1.2;letter-spacing:0.02em;color:${TEXT_DARK};text-align:center;margin:0 0 6px;">${esc(card.headline ?? "")}</p>
      <p style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${TEXT_MUTED};text-align:center;margin:0 0 24px;">A Micro-Memoir${card.byline ? ` by ${esc(card.byline)}` : ""}</p>
      <div style="width:32px;height:1px;background:#c8c0b0;margin:0 auto 24px;"></div>
      <div style="text-align:center;">${renderBody(card.body ?? [])}</div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e8e8e4;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8e8e4;padding:32px 0;">
    <tr><td align="center">
      <table width="${PAGE_W}" cellpadding="0" cellspacing="0" style="width:${PAGE_W}px;max-width:100%;background:#ffffff;">
        <tr><td style="background:${CRIMSON};padding:24px ${PAD}px;">
          <img src="${SITE_URL}/Masthead.webp" alt="efemera" style="width:100%;height:auto;display:block;" />
        </td></tr>
        <tr><td style="border-top:3px solid ${CRIMSON};border-bottom:1px solid #d0d0cc;padding:8px ${PAD}px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:${FONT};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${TEXT_MUTED};">${date}</td>
            <td style="font-family:${FONT};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${TEXT_MUTED};text-align:right;">${volume ? `Vol. ${esc(volume)}` : ""}${volume && issue ? " &nbsp;·&nbsp; " : ""}${issue ? `No. ${esc(issue)}` : ""}</td>
          </tr></table>
        </td></tr>
        ${intro ? `<tr><td style="padding:20px ${PAD}px;border-bottom:1px solid ${BORDER};text-align:center;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="440" cellpadding="0" cellspacing="0" style="max-width:440px;"><tr><td style="text-align:center;"><p style="font-family:${HEADLINE_FONT};font-size:15px;line-height:1.55;color:${TEXT_DARK};margin:0;white-space:pre-line;">${esc(intro)}</p>${author ? `<p style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.02em;color:${TEXT_DARK};margin:12px 0 0;">By ${esc(author)}</p>` : ""}</td></tr></table></td></tr></table></td></tr>` : ""}
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
