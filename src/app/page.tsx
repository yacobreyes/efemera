"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });
const Feed = dynamic(() => import("@/components/Newspaper"), { ssr: false });

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip animation if user has already entered before
    if (localStorage.getItem("efemera_entered") === "1") {
      setEntered(true);
    }
    setChecked(true);
  }, []);

  function handleEnter() {
    localStorage.setItem("efemera_entered", "1");
    setEntered(true);
  }

  if (!checked) return null;

  return (
    <>
      {!entered && <IntroAnimation onEnter={handleEnter} />}
      {entered && <Feed />}
    </>
  );
}
