"use client";

import { useEffect } from "react";
import { recordStoryVisit } from "@/components/ArcadeUnlockPopup";

export default function StoryVisitTracker() {
  useEffect(() => { recordStoryVisit(); }, []);
  return null;
}
