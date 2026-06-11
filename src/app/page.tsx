"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });
const Newspaper = dynamic(() => import("@/components/Newspaper"), { ssr: false });

export default function Home() {
  const [entered, setEntered] = useState(false);

  return (
    <>
      {!entered && <IntroAnimation onEnter={() => setEntered(true)} />}
      {entered && <Newspaper />}
    </>
  );
}
