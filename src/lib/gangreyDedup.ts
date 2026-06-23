// Shared headline normalization for collapsing duplicate Gangrey imports.
// The same story can be captured twice (old div.post theme vs 2016 <article>),
// producing headlines that differ only by punctuation — curly vs straight
// quotes, em-dash vs hyphen, stray entities. Normalize aggressively so those
// collapse to the same key.
export function normalizeHeadline(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")   // curly single quotes
    .replace(/[“”„‟]/g, '"')   // curly double quotes
    .replace(/[–—―]/g, "-")          // en/em dashes
    .replace(/&#?\w+;/g, " ")                        // leftover HTML entities
    .replace(/[^a-z0-9]+/g, " ")                     // strip all punctuation
    .replace(/\s+/g, " ")
    .trim();
}
