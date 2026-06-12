import type { SanityLately } from "@/lib/sanity";

const FONT = "'Inter', sans-serif";
const BORDER = "#e1e8ed";
const CRIMSON = "#8B0000";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";

const ROW_LABEL: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED,
  paddingTop: "0.1rem", minWidth: 68,
};
const ROW_VALUE: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.85rem", color: TEXT_DARK, lineHeight: 1.4,
};

export default function Lately({ data }: { data: SanityLately | null }) {
  if (!data || (!data.reading && !data.listening && !data.watching)) return null;

  return (
    <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "0.5rem 0.85rem", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: CRIMSON }}>Lately</span>
      </div>

      <div style={{ padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {data.reading && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
            <span style={ROW_LABEL}>Reading</span>
            <span style={ROW_VALUE}>
              &ldquo;{data.reading}&rdquo;{data.readingAuthor ? `, ${data.readingAuthor}` : ""}
            </span>
          </div>
        )}

        {data.listening && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
            <span style={ROW_LABEL}>Listening</span>
            <span style={ROW_VALUE}>{data.listening}</span>
          </div>
        )}

        {data.watching && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
            <span style={ROW_LABEL}>Watching</span>
            <span style={ROW_VALUE}>{data.watching}</span>
          </div>
        )}
      </div>
    </div>
  );
}
