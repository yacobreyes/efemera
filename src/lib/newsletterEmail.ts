// Renders newsletter cards (portable text) into a self-contained HTML email.
// Kept dependency-free: a small serializer for the block types our editor emits.
import type { PortableTextBlock } from "@portabletext/types";

export type NlCard = {
  headline?: string;
  body?: PortableTextBlock[];
  image?: { url?: string; caption?: string; alt?: string } | null;
};

const CRIMSON = "#8B0000";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";

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
      out.push(`<${tag} style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:${TEXT_DARK};margin:0 0 16px;padding-left:22px;">${items.join("")}</${tag}>`);
      continue;
    }

    if (style === "h2") out.push(`<h2 style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${TEXT_DARK};margin:20px 0 8px;">${inline}</h2>`);
    else if (style === "blockquote") out.push(`<blockquote style="border-left:3px solid ${CRIMSON};margin:16px 0;padding:2px 0 2px 16px;font-style:italic;color:${TEXT_MUTED};font-family:Georgia,serif;">${inline}</blockquote>`);
    else out.push(`<p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:${TEXT_DARK};margin:0 0 16px;">${inline}</p>`);
    i++;
  }
  return out.join("");
}

export function renderNewsletterHtml({ subject, preview, author, cards }: { subject: string; preview: string; author?: string; cards: NlCard[] }): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const cardHtml = cards
    .map((card, idx) => {
      const img = card.image?.url
        ? `<img src="${esc(card.image.url)}" alt="${esc(card.image.alt ?? "")}" style="width:100%;border-radius:6px;margin:0 0 12px;" />${card.image.caption ? `<p style="font-family:Arial,sans-serif;font-size:12px;font-style:italic;color:${TEXT_MUTED};margin:0 0 12px;">${esc(card.image.caption)}</p>` : ""}`
        : "";
      const divider = idx > 0 ? `<tr><td style="padding:0 0 24px;"><div style="border-top:1px solid #e1e8ed;"></div></td></tr>` : "";
      return `
      ${divider}
      <tr><td style="padding:0 0 28px;">
        <h1 style="font-family:Georgia,serif;font-size:21px;font-weight:700;color:${TEXT_DARK};margin:0 0 14px;">${esc(card.headline ?? "")}</h1>
        ${img}
        ${renderBody(card.body ?? [])}
      </td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;">
        <tr><td style="padding:0 0 24px;">
          <span style="display:inline-block;background:${CRIMSON};border-radius:3px;padding:6px 10px;">
            <img src="${SITE_URL}/Masthead.webp" alt="efemera" width="100" style="height:18px;width:auto;display:block;" />
          </span>
        </td></tr>
        <tr><td style="padding:0 0 28px;border-bottom:2px solid ${TEXT_DARK};">
          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:700;color:${TEXT_DARK};margin:0 0 10px;line-height:1.25;">${esc(subject)}</h1>
          <div style="font-family:Arial,sans-serif;font-size:13px;color:${TEXT_MUTED};">${author ? `By ${esc(author)} &nbsp;&middot;&nbsp; ` : ""}${date}</div>
        </td></tr>
        <tr><td style="height:24px;"></td></tr>
        <tr><td><table width="100%" cellpadding="0" cellspacing="0">${cardHtml}</table></td></tr>
        <tr><td style="padding:16px 0;text-align:center;border-top:1px solid #e1e8ed;font-family:Arial,sans-serif;font-size:12px;color:${TEXT_MUTED};">
          You're receiving this because you subscribed to efemera.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
