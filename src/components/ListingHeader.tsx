import type { ReactNode, CSSProperties } from "react";

// Shared header for listing/landing pages (About, The Latest, The Archive,
// Issues, Shop). Centralizes the kicker/title/subtitle typography so the sizes
// can't drift apart across pages. Tweak it here and every page follows.
const HEADLINE = "var(--font-headline)";
const SUBHEAD = "var(--font-subhead)";

const KICKER: CSSProperties = {
  fontFamily: SUBHEAD, fontSize: 12, fontWeight: 800, letterSpacing: ".22em",
  textTransform: "uppercase", color: "#490000", marginBottom: 14,
};
const TITLE: CSSProperties = {
  fontFamily: HEADLINE, fontSize: "clamp(44px, 7vw, 72px)", lineHeight: 0.98,
  letterSpacing: "-.03em", margin: 0, color: "#000000",
};
const SUB: CSSProperties = {
  fontFamily: SUBHEAD, fontSize: "clamp(20px, 3vw, 28px)", color: "#000000",
  lineHeight: 1.4, margin: "14px 0 0",
};

export default function ListingHeader({
  title,
  kicker,
  sub,
  children,
  align = "left",
  bordered = true,
  marginBottom = 40,
}: {
  title: string;
  kicker?: string;
  sub?: string;
  children?: ReactNode;
  align?: "left" | "center";
  bordered?: boolean;
  marginBottom?: number;
}) {
  const centered = align === "center";
  return (
    <div
      style={{
        marginBottom,
        textAlign: align,
        ...(bordered ? { borderBottom: "1px solid #000000", paddingBottom: 24 } : {}),
      }}
    >
      {kicker && <div style={KICKER}>{kicker}</div>}
      <h1 style={TITLE}>{title}</h1>
      {sub && (
        <p
          style={{
            ...SUB,
            maxWidth: centered ? undefined : 560,
            ...(centered ? { marginLeft: "auto", marginRight: "auto" } : {}),
          }}
        >
          {sub}
        </p>
      )}
      {children}
    </div>
  );
}
