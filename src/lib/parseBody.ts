interface PTSpan {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
}

interface PTBlock {
  _type: "block";
  _key: string;
  style: string;
  markDefs: unknown[];
  children: PTSpan[];
}

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
      const regex = /(\*\*_(.+?)_\*\*|\*\*(.+?)\*\*|_(.+?)_)/g;
      let lastIndex = 0;
      let spanIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(paragraph)) !== null) {
        if (match.index > lastIndex) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: paragraph.slice(lastIndex, match.index), marks: [] });
        }
        if (match[2] !== undefined) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: match[2], marks: ["strong", "em"] });
        } else if (match[3] !== undefined) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: match[3], marks: ["strong"] });
        } else if (match[4] !== undefined) {
          children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: match[4], marks: ["em"] });
        }
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < paragraph.length) {
        children.push({ _type: "span", _key: `b${blockIndex}s${spanIndex++}`, text: paragraph.slice(lastIndex), marks: [] });
      }

      if (children.length === 0) {
        children.push({ _type: "span", _key: `b${blockIndex}s0`, text: paragraph.trim(), marks: [] });
      }

      return { _type: "block" as const, _key: `b${blockIndex}`, style, markDefs: [], children };
    });
}

export function ptToMarkdown(blocks: import("@portabletext/types").PortableTextBlock[]): string {
  return blocks
    .filter(b => b._type === "block")
    .map(b => {
      const text = (b.children as { text: string; marks?: string[] }[]).map(span => {
        const t = span.text || "";
        const marks = span.marks ?? [];
        if (marks.includes("strong") && marks.includes("em")) return `**_${t}_**`;
        if (marks.includes("strong")) return `**${t}**`;
        if (marks.includes("em")) return `_${t}_`;
        return t;
      }).join("");
      const style = (b as { style?: string }).style ?? "normal";
      if (style === "h2") return `## ${text}`;
      if (style === "h3") return `### ${text}`;
      if (style === "blockquote") return text.split("\n").map(l => `> ${l}`).join("\n");
      return text;
    })
    .join("\n\n");
}
