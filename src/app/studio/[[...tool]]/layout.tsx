import { metadata, viewport, NextStudioLayout } from "next-sanity/studio";
export { metadata, viewport };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <NextStudioLayout>{children}</NextStudioLayout>;
}
