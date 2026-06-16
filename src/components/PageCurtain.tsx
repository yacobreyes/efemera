"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function PageCurtain() {
  const pathname = usePathname();
  const [opacity, setOpacity] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    // Drop the curtain instantly, then lift it
    setOpacity(1);
    const t = setTimeout(() => setOpacity(0), 40);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        background: "#8B0000",
        zIndex: 9999,
        pointerEvents: "none",
        opacity,
        transition: opacity === 1 ? "none" : "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
}
