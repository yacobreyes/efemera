// Convert curly / "smart" quotes to straight quotes. Scoped to quotes and
// apostrophes only (per house style) — dashes and ellipses are left alone.
export function straightenQuotes(input: string): string {
  return input
    // Single: curly ‘ ’, low-9 ‚, high-reversed-9 ‛, prime ′ ‵, modifier
    // apostrophe/turned-comma ʼ ʻ ʽ, fullwidth ＇, ornamental ❛ ❜
    .replace(/[‘’‚‛′‵ʼʻʽ＇❛❜]/g, "'")
    // Double: curly “ ”, low-9 „, high-reversed-9 ‟, double-prime ″ ‶,
    // fullwidth ＂, ornamental ❝ ❞
    .replace(/[“”„‟″‶＂❝❞]/g, '"');
}

// Recursively straighten the text of every span in a portable-text block array.
// Returns a new array; input is not mutated.
export function straightenBlocks<T>(blocks: T): T {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map(block => {
    if (block && typeof block === "object" && Array.isArray((block as { children?: unknown }).children)) {
      const b = block as { children: { text?: string }[] };
      return {
        ...b,
        children: b.children.map(child =>
          child && typeof child === "object" && typeof child.text === "string"
            ? { ...child, text: straightenQuotes(child.text) }
            : child
        ),
      };
    }
    return block;
  }) as T;
}
