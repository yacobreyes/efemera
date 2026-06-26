"use client";

import { useRouter } from "next/navigation";

// "Back" link on a story page. Returns to wherever the reader came from
// (archive, latest, homepage, search results) instead of always dumping them
// on the homepage. Falls back to a sensible listing when there's no in-app
// history (e.g. the story was opened directly from a shared link).
export default function StoryBackLink({ label, fallbackHref }: { label: string; fallbackHref: string }) {
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    const ref = typeof document !== "undefined" ? document.referrer : "";
    const sameOrigin = ref && typeof window !== "undefined" && ref.startsWith(window.location.origin);
    if (sameOrigin && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <a href={fallbackHref} onClick={onClick} className="story-label">← {label}</a>
  );
}
