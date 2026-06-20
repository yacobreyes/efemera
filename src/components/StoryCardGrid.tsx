import Link from "next/link";
import type { SanityPost } from "@/lib/sanity";
import { urlFor } from "@/lib/sanityImage";
import { plainTextFromBlocks, postReadingTime } from "@/lib/readingTime";

const plainText = plainTextFromBlocks;
function truncate(text: string, max = 150) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}
function sectionLabel(section: string) {
  return section;
}

export default function StoryCardGrid({ posts }: { posts: SanityPost[] }) {
  return (
    <div className="sg-grid">
      <style>{`
        .sg-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 44px 34px;
        }
        .sg-card { display: flex; flex-direction: column; }
        .sg-thumb {
          aspect-ratio: 1.35 / 1;
          margin-bottom: 20px;
          background: #dfd4c4;
          overflow: hidden;
          display: block;
        }
        .sg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
        .sg-thumb:hover img { transform: scale(1.03); }
        .sg-label {
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .22em;
          color: #8e0d0d;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sg-card h3 {
          margin: 0 0 10px;
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: -.025em;
          transition: color .15s;
        }
        .sg-card a.sg-headline { text-decoration: none; color: #171412; }
        .sg-card a.sg-headline:hover h3 { color: #8e0d0d; }
        .sg-byline {
          font-family: "Cormorant Garamond", Georgia, serif;
          margin-bottom: 12px;
          font-size: 19px;
          font-style: italic;
          color: #463f37;
        }
        .sg-excerpt {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 18px;
          line-height: 1.45;
          color: #211c17;
          margin-bottom: 12px;
        }
        .sg-time {
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #8e0d0d;
          margin-top: auto;
        }
        @media (max-width: 900px) {
          .sg-grid { grid-template-columns: 1fr; gap: 0; }
          .sg-card { border-bottom: 1px solid #cfc3b3; padding: 28px 0; }
          .sg-card:first-child { padding-top: 0; }
        }
      `}</style>
      {posts.map(post => {
        const plain = plainText(post.body);
        const imgSrc = post.image?.asset
          ? urlFor(post.image.asset).width(600).height(445).fit("crop").auto("format").url()
          : null;
        return (
          <article key={post._id} className="sg-card">
            <Link href={`/stories/${post.slug}`} className="sg-thumb">
              {imgSrc
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={imgSrc} alt={post.image?.alt ?? post.headline} />
                : <div style={{ width: "100%", height: "100%", background: "#dfd4c4" }} />
              }
            </Link>
            <div className="sg-label">{sectionLabel(post.section)}</div>
            <Link href={`/stories/${post.slug}`} className="sg-headline"><h3>{post.headline}</h3></Link>
            {post.byline && <div className="sg-byline">By {post.byline}</div>}
            {plain && <p className="sg-excerpt">{truncate(plain)}</p>}
            <div className="sg-time">{postReadingTime(post)} Min Read</div>
          </article>
        );
      })}
    </div>
  );
}
