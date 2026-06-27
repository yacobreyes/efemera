import { redirect } from "next/navigation";

// /brief now lives at clean path URLs (/brief/1, /brief/3, /brief/5).
// Redirect the bare path to the one-minute reads.
export default function BriefIndexPage() {
  redirect("/brief/1");
}
