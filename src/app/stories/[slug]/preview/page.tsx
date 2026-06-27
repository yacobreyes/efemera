import { notFound, redirect } from "next/navigation";
import { isAuthed } from "@/lib/adminAuth";
import { client, urlFor } from "@/lib/sanity";
import type { SanityPost } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import { postReadingTime } from "@/lib/readingTime";

export const dynamic = "force-dynamic";

function sectionLabel(section: string) {
  if (section === "Micro-Memoir") return "Micro-Memoir";
  if (section === "Gangrey Redux") return "The Archive";
  return section;
}

const QUERY = `*[_type == "post" && slug.current == $slug][0]{
  _id, "slug": slug.current, section, headline, subheadline, byline,
  date, body, image { asset, caption, alt }, status, readingTime
}`;

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const authed = await isAuthed();
  if (!authed) redirect("/admin/flatplan");

  const { slug } = await params;
  const post = await client.fetch<SanityPost | null>(QUERY, { slug }, { cache: "no-store" });
  if (!post) notFound();

  return (
    <div className="story-page">
      <style>{`
        .story-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          color: #000000;
        }
        .preview-banner {
          background: #490000;
          color: #fff;
          font-family: var(--font-subhead);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          text-align: center;
          padding: 8px 16px;
        }
        .story-head {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 60px 24px 36px;
          box-sizing: border-box;
          text-align: center;
        }
        .story-label {
          text-decoration: none;
          display: inline-block;
          font-family: var(--font-subhead);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .24em;
          text-transform: uppercase;
          color: #490000;
          margin-bottom: 20px;
        }
        .story-h1 {
          font-family: var(--font-headline);
          font-weight: 700;
          font-size: clamp(42px, 7vw, 74px);
          line-height: 1.0;
          letter-spacing: -.025em;
          margin: 0 auto 22px;
          max-width: 14ch;
        }
        .story-dek {
          font-family: var(--font-body);
          font-style: italic;
          font-size: clamp(20px, 3vw, 27px);
          line-height: 1.35;
          color: #000000;
          margin: 0 auto 28px;
          max-width: 540px;
        }
        .story-meta {
          font-family: var(--font-subhead);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #000000;
          display: inline-flex;
          gap: 12px;
          align-items: center;
        }
        .story-meta .dot { color: #490000; }
        .story-hero {
          width: 100%;
          max-width: 1100px;
          margin: 12px auto 0;
          padding: 0 24px;
          box-sizing: border-box;
        }
        .story-hero img { width: 100%; display: block; }
        .story-hero figcaption {
          font-family: var(--font-subhead);
          font-size: 12px;
          color: #000000;
          font-style: italic;
          margin-top: 10px;
          line-height: 1.5;
          text-align: center;
        }
        .story-article {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          padding: 48px 24px 40px;
          box-sizing: border-box;
        }
        .story-body {
          font-family: var(--font-body);
          font-size: 22px;
          line-height: 1.65;
          color: #000000;
        }
        .story-body > p:first-of-type::first-letter {
          font-weight: 700;
          font-size: 4.4em;
          line-height: .72;
          float: left;
          margin: .06em .1em 0 0;
          color: #490000;
        }
        .story-body p { margin: 1.2rem 0 0; }
        .story-body > p:first-of-type { margin-top: 0; }
        .story-body a { color: #490000; text-decoration: underline; }
        .story-body ul { list-style: disc; padding-left: 1.4em; margin: 1.2rem 0 0; }
        .story-body ol { list-style: decimal; padding-left: 1.4em; margin: 1.2rem 0 0; }
        .story-body li { display: list-item; margin-bottom: .25em; }
        .story-rule { width: 60px; height: 2px; background: #490000; border: 0; margin: 44px auto 0; }
        .story-actions {
          margin-top: 30px;
          display: flex;
          gap: 1.5rem;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }
        .story-comments {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          padding: 8px 24px 56px;
          box-sizing: border-box;
        }
        @media (max-width: 600px) {
          .story-head { padding: 40px 22px 28px; }
          .story-hero { padding: 0; }
          .story-article { padding: 34px 22px 30px; }
          .story-body { font-size: 20px; }
          .story-body > p:first-of-type::first-letter {
            font-size: 3.6em;
            line-height: .76;
            margin: .04em .09em 0 0;
          }
        }
      `}</style>

      <div className="preview-banner">Preview — {post.status ?? "draft"} (not public)</div>

      <MagHeader />

      <header className="story-head">
        <Link href="/" className="story-label">← {sectionLabel(post.section)}</Link>
        <h1 className="story-h1">{post.headline}</h1>
        {post.subheadline && <p className="story-dek">{post.subheadline}</p>}
        <div className="story-meta">
          <span>By {post.byline}</span>
          <span className="dot">·</span>
          <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          <span className="dot">·</span>
          <span>{postReadingTime(post)} Min Read</span>
        </div>
      </header>

      {post.image?.asset && (
        <figure className="story-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlFor(post.image.asset).width(1400).height(788).fit("crop").auto("format").url()}
            alt={post.image.alt ?? post.image.caption ?? ""}
          />
          {post.image.caption && <figcaption>{post.image.caption}</figcaption>}
        </figure>
      )}

      <article className="story-article">
        <div className="story-body">
          <PortableText
            value={post.body}
            components={{
              block: {
                normal: ({ children }) => <p>{children}</p>,
                h2: ({ children }) => (
                  <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: "1.9rem", margin: "2.2rem 0 0", lineHeight: 1.15, letterSpacing: "-.02em" }}>{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: "1.5rem", margin: "1.8rem 0 0", lineHeight: 1.2 }}>{children}</h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote style={{ margin: "1.5rem 0 0", padding: "0.2rem 0 0.2rem 1.2rem", borderLeft: "3px solid #490000", fontStyle: "italic", color: "#000000" }}>{children}</blockquote>
                ),
              },
              list: {
                bullet: ({ children }) => <ul>{children}</ul>,
                number: ({ children }) => <ol>{children}</ol>,
              },
              listItem: {
                bullet: ({ children }) => <li>{children}</li>,
                number: ({ children }) => <li>{children}</li>,
              },
              types: {
                imageEmbed: ({ value }: { value: { src: string; alt?: string } }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={value.src} alt={value.alt ?? ""} style={{ maxWidth: "100%", margin: "1.4rem 0", display: "block" }} />
                ),
                youtubeEmbed: ({ value }: { value: { src: string } }) => (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, margin: "1.4rem 0" }}>
                    <iframe src={value.src.replace("watch?v=", "embed/")} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
                  </div>
                ),
              },
              marks: {
                strong: ({ children }) => <strong>{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
                link: ({ children, value }) => <a href={value?.href} target="_blank" rel="noopener noreferrer">{children}</a>,
              },
            }}
          />
        </div>

        <hr className="story-rule" />
        <div className="story-actions">
          <LikeButton slug={slug} />
          <ShareButton slug={slug} headline={post.headline} />
        </div>
      </article>

      <div className="story-comments">
        <CommentSection slug={slug} />
      </div>

      <MagFooter />
    </div>
  );
}
