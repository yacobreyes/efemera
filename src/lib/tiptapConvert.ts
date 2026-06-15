import type { JSONContent } from "@tiptap/react";
import type { PortableTextBlock } from "@portabletext/types";

// Tiptap JSON → Portable Text blocks
export function tiptapToPortableText(doc: JSONContent): PortableTextBlock[] {
  const blocks: PortableTextBlock[] = [];
  let blockIndex = 0;

  function pushBlock(node: JSONContent) {
    const style = nodeStyle(node);
    const children = inlineChildren(node, blockIndex);
    if (children.length === 0) {
      children.push({ _type: "span", _key: `b${blockIndex}s0`, text: "", marks: [] });
    }
    blocks.push({ _type: "block", _key: `b${blockIndex}`, style, markDefs: [], children });
    blockIndex++;
  }

  for (const node of doc.content ?? []) {
    if (node.type === "bulletList") {
      for (const item of node.content ?? []) {
        // listItem → paragraph inside
        const para = item.content?.[0] ?? item;
        const children = inlineChildren(para, blockIndex);
        if (children.length === 0) children.push({ _type: "span", _key: `b${blockIndex}s0`, text: "", marks: [] });
        blocks.push({ _type: "block", _key: `b${blockIndex}`, style: "normal", listItem: "bullet", level: 1, markDefs: [], children } as PortableTextBlock);
        blockIndex++;
      }
    } else if (node.type === "orderedList") {
      for (const item of node.content ?? []) {
        const para = item.content?.[0] ?? item;
        const children = inlineChildren(para, blockIndex);
        if (children.length === 0) children.push({ _type: "span", _key: `b${blockIndex}s0`, text: "", marks: [] });
        blocks.push({ _type: "block", _key: `b${blockIndex}`, style: "normal", listItem: "number", level: 1, markDefs: [], children } as PortableTextBlock);
        blockIndex++;
      }
    } else {
      pushBlock(node);
    }
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
  const nodes: JSONContent[] = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i] as PortableTextBlock & { style?: string; listItem?: string };
    if (b._type !== "block") { i++; continue; }

    const style = b.style ?? "normal";
    const spans = b.children as { text: string; marks?: string[] }[];

    const inlineContent = spans.map(span => ({
      type: "text",
      text: span.text,
      marks: (span.marks ?? []).map(m => ({
        type: m === "strong" ? "bold" : m === "em" ? "italic" : m,
      })),
    }));

    if (b.listItem === "bullet") {
      // Collect consecutive bullet items into one bulletList node
      const items: JSONContent[] = [];
      while (i < blocks.length) {
        const bi = blocks[i] as PortableTextBlock & { listItem?: string };
        if (bi._type !== "block" || bi.listItem !== "bullet") break;
        const s = bi.children as { text: string; marks?: string[] }[];
        items.push({ type: "listItem", content: [{ type: "paragraph", content: s.map(sp => ({ type: "text", text: sp.text, marks: (sp.marks ?? []).map(m => ({ type: m === "strong" ? "bold" : m === "em" ? "italic" : m })) })) }] });
        i++;
      }
      nodes.push({ type: "bulletList", content: items });
      continue;
    }

    if (b.listItem === "number") {
      const items: JSONContent[] = [];
      while (i < blocks.length) {
        const bi = blocks[i] as PortableTextBlock & { listItem?: string };
        if (bi._type !== "block" || bi.listItem !== "number") break;
        const s = bi.children as { text: string; marks?: string[] }[];
        items.push({ type: "listItem", content: [{ type: "paragraph", content: s.map(sp => ({ type: "text", text: sp.text, marks: (sp.marks ?? []).map(m => ({ type: m === "strong" ? "bold" : m === "em" ? "italic" : m })) })) }] });
        i++;
      }
      nodes.push({ type: "orderedList", content: items });
      continue;
    }

    if (style === "h2") nodes.push({ type: "heading", attrs: { level: 2 }, content: inlineContent });
    else if (style === "h3") nodes.push({ type: "heading", attrs: { level: 3 }, content: inlineContent });
    else if (style === "blockquote") nodes.push({ type: "blockquote", content: [{ type: "paragraph", content: inlineContent }] });
    else nodes.push({ type: "paragraph", content: inlineContent });
    i++;
  }

  return { type: "doc", content: nodes };
}
