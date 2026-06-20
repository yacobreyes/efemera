import type { Metadata } from "next";
import { PortableText } from "@portabletext/react";
import { getAboutPage } from "@/lib/sanity";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About — Efemera",
  description: "About Efemera, a literary collective by Yacob Reyes.",
};

export default async function AboutPage() {
  let about = null as Awaited<ReturnType<typeof getAboutPage>>;
  try { about = await getAboutPage(); } catch {}
  const body = about?.body ?? [];

  return (
    <div className="about-page">
      <style>{`
        .about-page { min-height: 100vh; display: flex; flex-direction: column; background: #f5efe4; color: #171412; }
        .about-main { flex: 1; width: 100%; max-width: 680px; margin: 0 auto; padding: 64px 24px 64px; box-sizing: border-box; }
        .about-title {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: clamp(44px, 7vw, 72px); line-height: .98; letter-spacing: -.03em;
          margin: 0 0 40px; padding-bottom: 24px; border-bottom: 1px solid #171412;
        }
        .about-body { font-family: "Cormorant Garamond", Georgia, serif; font-size: 22px; line-height: 1.62; color: #211c17; }
        .about-body p { margin: 1.2rem 0 0; }
        .about-body p:first-child { margin-top: 0; }
        .about-body a { color: #8e0d0d; text-decoration: underline; }
        .about-empty { font-family: "Cormorant Garamond", Georgia, serif; font-size: 22px; font-style: italic; color: #6f655b; }
        @media (max-width: 900px) { .about-main { padding: 40px 24px 48px; } }
      `}</style>
      <MagHeader />
      <main className="about-main">
        <h1 className="about-title">About</h1>
        {body.length > 0 ? (
          <div className="about-body">
            <PortableText
              value={body}
              components={{
                block: {
                  normal: ({ children }) => <p>{children}</p>,
                  h2: ({ children }) => <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700, fontSize: "1.9rem", margin: "2rem 0 0", letterSpacing: "-.02em" }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 700, fontSize: "1.5rem", margin: "1.7rem 0 0" }}>{children}</h3>,
                  blockquote: ({ children }) => <blockquote style={{ margin: "1.5rem 0 0", padding: "0.2rem 0 0.2rem 1.2rem", borderLeft: "3px solid #8e0d0d", fontStyle: "italic", color: "#463f37" }}>{children}</blockquote>,
                },
                marks: {
                  strong: ({ children }) => <strong>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                  link: ({ children, value }) => <a href={value?.href} target="_blank" rel="noopener noreferrer">{children}</a>,
                },
              }}
            />
          </div>
        ) : (
          <p className="about-empty">Coming soon.</p>
        )}
      </main>
      <MagFooter />
    </div>
  );
}
