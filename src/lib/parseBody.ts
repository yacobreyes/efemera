interface PTSpan {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

interface PTMarkDef {
  _key: string;
  _type: "link";
  href: string;
}

interface PTBlock {
  _type: "block";
  _key: string;
  style: string;
  markDefs: PTMarkDef[];
  children: PTSpan[];
}

// Matches: [text](url) | **_bolditalic_** | **bold** | _italic_
const INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*_(.+?)_\*\*|\*\*(.+?)\*\*|_(.+?)_/g;

function blockStyle(paragraph: string): { style: string; text: string } {
  if (paragraph.startsWith("### ")) return { style: "h3", text: paragraph.slice(4) };
  if (paragraph.startsWith("## ")) return { style: "h2", text: paragraph.slice(3) };
  if (paragraph.startsWith("> ")) {
    return { style: "blockquote", text: paragraph.split("\n").map(l => l.replace(/^> ?/, "")).join("\n") };
  }
  return { style: "normal", text: paragraph };
}

export function parseBody(bodyRaw: string): PTBlock[] {
  return bodyRaw
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map((rawParagraph, blockIndex) => {
      const { style, text: paragraph } = blockStyle(rawParagraph);
      const children: PTSpan[] = [];
      const markDefs: PTMarkDef[] = [];
      const regex = new RegExp(INLINE_RE.source, "g");
      let lastIndex = 0;
      let spanIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(paragraph)) !== null) {
        if (match.index > lastIndex) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: paragraph.slice(lastIndex, match.index), marks: [] });
        }
        if (match[1] !== undefined) {
          // link: text=match[1], href=match[2]
          const key = `lnk${blockIndex}_${spanIndex}`;
          markDefs.push({ _key: key, _type: "link", href: match[2] });
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: match[1], marks: [key] });
        } else if (match[3] !== undefined) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: match[3], marks: ["strong", "em"] });
        } else if (match[4] !== undefined) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: match[4], marks: ["strong"] });
        } else if (match[5] !== undefined) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: match[5], marks: ["em"] });
        }
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < paragraph.length) {
        children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: paragraph.slice(lastIndex), marks: [] });
      }

      if (children.length === 0) {
        children.push({ _type: "span", _key: `b${blockIndex}s0`, text: paragraph.trim(), marks: [] });
      }

      return { _type: "block" as const, _key: `b${blockIndex}`, style, markDefs, children };
    });
}

function blockToMarkdown(b: import("@portabletext/types").PortableTextBlock): string {
  const markDefs = ((b as { markDefs?: { _key: string; _type: string; href?: string }[] }).markDefs) ?? [];
  const text = (b.children as { text: string; marks?: string[] }[]).map(span => {
    let t = span.text || "";
    const marks = span.marks ?? [];
    if (marks.includes("strong") && marks.includes("em")) t = `**_${t}_**`;
    else if (marks.includes("strong")) t = `**${t}**`;
    else if (marks.includes("em")) t = `_${t}_`;
    const linkKey = marks.find(m => markDefs.some(d => d._key === m && d._type === "link"));
    if (linkKey) {
      const def = markDefs.find(d => d._key === linkKey);
      if (def?.href) t = `[${t}](${def.href})`;
    }
    return t;
  }).join("");
  const style = (b as { style?: string }).style ?? "normal";
  if (style === "h2") return `## ${text}`;
  if (style === "h3") return `### ${text}`;
  if (style === "blockquote") return text.split("\n").map(l => `> ${l}`).join("\n");
  return text;
}

export function ptToMarkdown(blocks: import("@portabletext/types").PortableTextBlock[]): string {
  return blocks.filter(b => b._type === "block").map(blockToMarkdown).join("\n\n");
}

// Each block as its own markdown paragraph string (for the About page renderer)
export function ptToParagraphs(blocks: import("@portabletext/types").PortableTextBlock[]): string[] {
  return blocks.filter(b => b._type === "block").map(blockToMarkdown).filter(Boolean);
}
