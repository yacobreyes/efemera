import type { JSONContent } from "@tiptap/react";
import type { PortableTextBlock } from "@portabletext/types";

// Tiptap JSON → Portable Text blocks
export function tiptapToPortableText(doc: JSONContent): PortableTextBlock[] {
  const blocks: PortableTextBlock[] = [];
  let blockIndex = 0;

  for (const node of doc.content ?? []) {
    const style = nodeStyle(node);
    const children = inlineChildren(node, blockIndex);
    if (children.length === 0) {
      children.push({ _type: "span", _key: `b${blockIndex}s0`, text: "", marks: [] });
    }
    blocks.push({ _type: "block", _key: `b${blockIndex}`, style, markDefs: [], children });
    blockIndex++;
  }

  return blocks;
}

function nodeStyle(node: JSONContent): string {
  if (node.type === "heading") {
    return node.attrs?.level === 2 ? "h2" : node.attrs?.level === 3 ? "h3" : "normal";
  }
  if (node.type === "blockquote") return "blockquote";
  return "normal";
}

function inlineChildren(node: JSONContent, blockIndex: number) {
  const source =
    node.type === "blockquote"
      ? (node.content?.[0]?.content ?? [])
      : (node.content ?? []);

  return source.flatMap((child, i) => {
    if (child.type !== "text") return [];
    const marks: string[] = (child.marks ?? []).map((m: { type: string }) => {
      if (m.type === "bold") return "strong";
      if (m.type === "italic") return "em";
      return m.type;
    });
    return [{ _type: "span", _key: `b${blockIndex}s${i}`, text: child.text ?? "", marks }];
  });
}

// Portable Text blocks → Tiptap JSON
export function portableTextToTiptap(blocks: PortableTextBlock[]): JSONContent {
  return {
    type: "doc",
    content: blocks
      .filter(b => b._type === "block")
      .map(b => {
        const style = (b as { style?: string }).style ?? "normal";
        const spans = b.children as { text: string; marks?: string[] }[];

        const inlineContent = spans.map(span => ({
          type: "text",
          text: span.text,
          marks: (span.marks ?? []).map(m => ({
            type: m === "strong" ? "bold" : m === "em" ? "italic" : m,
          })),
        }));

        if (style === "h2") return { type: "heading", attrs: { level: 2 }, content: inlineContent };
        if (style === "h3") return { type: "heading", attrs: { level: 3 }, content: inlineContent };
        if (style === "blockquote") return { type: "blockquote", content: [{ type: "paragraph", content: inlineContent }] };
        return { type: "paragraph", content: inlineContent };
      }),
  };
}
