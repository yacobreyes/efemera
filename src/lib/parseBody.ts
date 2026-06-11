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

export function parseBody(bodyRaw: string): PTBlock[] {
  return bodyRaw
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map((paragraph, blockIndex) => {
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

      return { _type: "block" as const, _key: `b${blockIndex}`, style: "normal", markDefs: [], children };
    });
}

export function ptToMarkdown(blocks: import("@portabletext/types").PortableTextBlock[]): string {
  return blocks
    .filter(b => b._type === "block")
    .map(b => (b.children as { text: string; marks?: string[] }[]).map(span => {
      const text = span.text || "";
      const marks = span.marks ?? [];
      if (marks.includes("strong") && marks.includes("em")) return `**_${text}_**`;
      if (marks.includes("strong")) return `**${text}**`;
      if (marks.includes("em")) return `_${text}_`;
      return text;
    }).join(""))
    .join("\n\n");
}
