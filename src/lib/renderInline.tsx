import React from "react";

// Renders inline markdown: [text](url) links, **bold**, _italic_, **_both_**
const INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*_(.+?)_\*\*|\*\*(.+?)\*\*|_(.+?)_/g;

export function renderInline(text: string, linkColor = "#8B0000"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = new RegExp(INLINE_RE.source, "g");
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer" style={{ color: linkColor, textDecoration: "underline" }}>{m[1]}</a>
      );
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={key++}><em>{m[3]}</em></strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<strong key={key++}>{m[4]}</strong>);
    } else if (m[5] !== undefined) {
      nodes.push(<em key={key++}>{m[5]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
