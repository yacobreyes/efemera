import type { SanityLately } from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";

const FONT = "'Inter', sans-serif";
const BORDER = "#e1e8ed";
const CRIMSON = "#8B0000";
const TEXT_DARK = "#1c2938";
const TEXT_MUTED = "#526270";

export default function Lately({ data }: { data: SanityLately | null }) {
  if (!data || (!data.reading && !data.listening && !data.obsessed && !data.photo?.asset)) return null;

  return (
    <div style={{ maxWidth: 600, margin: "0.75rem auto 0", width: "100%", background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "0.6rem 1rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: CRIMSON }}>Lately</span>
      </div>

      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {data.reading && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, paddingTop: "0.15rem", minWidth: 80 }}>Reading</span>
            <span style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_DARK, lineHeight: 1.4 }}>
              <em>{data.reading}</em>{data.readingAuthor ? ` — ${data.readingAuthor}` : ""}
            </span>
          </div>
        )}

        {data.listening && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, paddingTop: "0.15rem", minWidth: 80 }}>Listening</span>
            <span style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_DARK, lineHeight: 1.4 }}>{data.listening}</span>
          </div>
        )}

        {data.obsessed && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, paddingTop: "0.15rem", minWidth: 80 }}>Obsessed</span>
            <span style={{ fontFamily: FONT, fontSize: "0.9rem", color: TEXT_DARK, lineHeight: 1.4 }}>{data.obsessed}</span>
          </div>
        )}

        {data.photo?.asset && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlFor(data.photo.asset).width(600).auto("format").url()}
              alt={data.photo.caption ?? ""}
              style={{ width: "100%", display: "block", borderRadius: 4, maxHeight: 340, objectFit: "cover" }}
            />
            {data.photo.caption && (
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: TEXT_MUTED, fontStyle: "italic", margin: "0.4rem 0 0", lineHeight: 1.4 }}>
                {data.photo.caption}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
