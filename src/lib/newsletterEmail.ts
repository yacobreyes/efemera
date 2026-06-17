// Renders newsletter cards (portable text) into a self-contained HTML email.
// Kept dependency-free: a small serializer for the block types our editor emits.
import type { PortableTextBlock } from "@portabletext/types";

export type NlCard = {
  headline?: string;
  body?: PortableTextBlock[];
  image?: { url?: string; caption?: string; alt?: string } | null;
  cardType?: "feature" | "standard" | "digest";
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
      out.push(`<${tag} style="font-family:${FONT};font-size:16px;line-height:1.7;color:${TEXT_DARK};margin:0 0 16px;padding-left:22px;">${items.join("")}</${tag}>`);
      continue;
    }

    if (style === "h2") out.push(`<h2 style="font-family:${FONT};font-size:20px;font-weight:700;color:${TEXT_DARK};margin:20px 0 8px;">${inline}</h2>`);
    else if (style === "blockquote") out.push(`<blockquote style="border-left:3px solid ${CRIMSON};margin:16px 0;padding:2px 0 2px 16px;font-style:italic;color:${TEXT_MUTED};font-family:${FONT};">${inline}</blockquote>`);
    else out.push(`<p style="font-family:${FONT};font-size:16px;line-height:1.7;color:${TEXT_DARK};margin:0 0 16px;">${inline}</p>`);
    i++;
  }
  return out.join("");
}

const HEADLINE_FONT = "'Georgia', 'Times New Roman', serif";

export function renderNewsletterHtml({ subject, preview, cards }: { subject: string; preview: string; cards: NlCard[] }): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Determine effective card type: first card defaults to "feature" if no type set
  function effectiveType(card: NlCard, idx: number): "feature" | "standard" | "digest" {
    if (card.cardType) return card.cardType;
    if (idx === 0) return "feature";
    return "standard";
  }

  const featureCards = cards.filter((c, i) => effectiveType(c, i) === "feature");
  const standardCards = cards.filter((c, i) => effectiveType(c, i) === "standard");
  const digestCards = cards.filter((c, i) => effectiveType(c, i) === "digest");

  // Render feature cards
  const featureHtml = featureCards.map(card => {
    const img = card.image?.url
      ? `<img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;display:block;margin:0;" />${card.image.caption ? `<p style="font-family:${FONT};font-size:12px;font-style:italic;color:${TEXT_MUTED};margin:0;padding:6px 24px 0;">${esc(card.image.caption)}</p>` : ""}`
      : "";
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;margin:0 0 0;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 0 0;border-top:2px solid ${CRIMSON};"></td></tr>
        </table>
        ${img}
        <div style="padding:20px 24px 24px;">
          <h1 style="font-family:${HEADLINE_FONT};font-size:26px;font-weight:700;color:${CRIMSON};margin:0 0 12px;line-height:1.25;">${esc(card.headline ?? "")}</h1>
          ${renderBody(card.body ?? [])}
        </div>
      </td></tr>
    </table>`;
  }).join("");

  // Render standard cards with sequential numbers
  const standardHtml = standardCards.map((card, num) => {
    const img = card.image?.url
      ? `<img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;max-height:180px;object-fit:cover;display:block;border-radius:4px;margin:0 0 12px;" />${card.image.caption ? `<p style="font-family:${FONT};font-size:12px;font-style:italic;color:${TEXT_MUTED};margin:0 0 12px;">${esc(card.image.caption)}</p>` : ""}`
      : "";
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-top:1px solid #e1e8ed;margin:0;">
      <tr><td style="padding:20px 24px;">
        <h2 style="font-family:${HEADLINE_FONT};font-size:19px;font-weight:700;color:${TEXT_DARK};margin:0 0 12px;line-height:1.3;">
          <span style="color:${CRIMSON};">${num + 1}.</span> ${esc(card.headline ?? "")}
        </h2>
        ${img}
        ${renderBody(card.body ?? [])}
      </td></tr>
    </table>`;
  }).join("");

  // Render digest cards grouped in a "From the editor" block
  const digestHtml = digestCards.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8fa;border-top:1px solid #e1e8ed;margin:0;">
      <tr><td style="padding:20px 24px;">
        <p style="font-family:${FONT};font-size:11px;font-weight:700;color:${TEXT_MUTED};letter-spacing:0.1em;text-transform:uppercase;margin:0 0 14px;">From the editor</p>
        ${digestCards.map(card => `
          <div style="margin-bottom:16px;">
            <p style="font-family:${HEADLINE_FONT};font-size:15px;font-weight:700;color:${TEXT_DARK};margin:0 0 6px;">${esc(card.headline ?? "")}</p>
            ${renderBody(card.body ?? [])}
          </div>`).join("")}
      </td></tr>
    </table>` : "";

  const bodyHtml = featureHtml + standardHtml + digestHtml;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f8fa;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f8fa;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;">
        <tr><td style="background:${CRIMSON};padding:24px;text-align:center;">
          <img src="${SITE_URL}/Masthead.webp" alt="efemera" width="180" style="height:36px;width:auto;display:inline-block;" />
          <div style="font-family:${FONT};font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:0.12em;text-transform:uppercase;margin-top:8px;">${date}</div>
        </td></tr>
        <tr><td>${bodyHtml}</td></tr>
        <tr><td style="padding:20px 24px;text-align:center;font-family:${FONT};font-size:12px;color:${TEXT_MUTED};border-top:1px solid #e1e8ed;">
          You're receiving this because you subscribed to efemera. <a href="{{{UNSUBSCRIBE_URL}}}" style="color:${TEXT_MUTED};">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
