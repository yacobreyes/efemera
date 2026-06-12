"use client";

// Tortoiseshell cat pixel art — 8×13 grid, PX css-pixels per art-pixel
const PX = 5;

const C: Record<string, string> = {
  K: "#111111", // black
  R: "#c0571a", // orange
  T: "#e09a3a", // tan / light orange
  G: "#72a824", // eye green
  P: "#cc6060", // nose pink
};

function shadow(rows: string[]): string {
  return rows
    .flatMap((row, y) =>
      [...row].flatMap((ch, x) =>
        C[ch] ? [`${x * PX}px ${y * PX}px 0 0 ${C[ch]}`] : []
      )
    )
    .join(",");
}

// Frame 1 — sitting, looking up
const SITTING = shadow([
  ".KK..KK.",
  "KTTRRTTK",
  "KTGKKTGK",
  ".KTPPTK.",
  ".KTTTK..",
  ".KRKRTK.",
  "KRTRTKRK",
  "KTRTRKRK",
  "KRTRTRTK",
  ".KRKRK..",
  "..KKKK..",
  "..K..K..",
  ".KK..KK.",
]);

// Frame 2 — crouching, about to spring
const CROUCH = shadow([
  ".KK..KK.",
  "KTTRRTTK",
  "KTGKKTGK",
  ".KTPPTK.",
  "..KKKK..",
  "KRTRTRTK",
  "KRTRTKRK",
  "KRTRTKRK",
  "KKKKKKK.",
  "K.....K.",
  "K.....K.",
  "KK...KK.",
  "........",
]);

// Frame 3 — mid-jump, both paws reaching up at the mayfly
const JUMP = shadow([
  ".K....K.",
  "KKK..KKK",
  ".KK..KK.",
  "KTTRRTTK",
  "KTGKKTGK",
  ".KTPPTK.",
  ".KRTRTK.",
  "KRTRTKRK",
  "KRTRTRTK",
  "..KKKK..",
  "........",
  "........",
  "........",
]);

const W = 8 * PX;
const H = 13 * PX;

export default function PixelCat() {
  return (
    <>
      <style>{`
        @keyframes pixel-cat {
          0%,   39.9% { box-shadow: ${SITTING}; }
          40%,  49.9% { box-shadow: ${CROUCH};  }
          50%,  84.9% { box-shadow: ${JUMP};    }
          85%,  89.9% { box-shadow: ${CROUCH};  }
          90%,  100%  { box-shadow: ${SITTING}; }
        }
        .pixel-cat-sprite {
          width: ${PX}px;
          height: ${PX}px;
          background: transparent;
          box-shadow: ${SITTING};
          animation: pixel-cat 3s linear infinite;
          image-rendering: pixelated;
        }
      `}</style>
      <div style={{ width: W, height: H, position: "relative", flexShrink: 0 }}>
        <div className="pixel-cat-sprite" style={{ position: "absolute", top: 0, left: 0 }} />
      </div>
    </>
  );
}
