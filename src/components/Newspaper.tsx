"use client";

import MayflyIcon from "./MayflyIcon";
import { posts, Post } from "@/lib/posts";

function ArticleLead({ post }: { post: Post }) {
  return (
    <div className="article-lead">
      <div>
        <div className="article-kicker">{post.kicker}</div>
        <h1 className={`article-headline large`}>{post.headline}</h1>
        {post.subheadline && (
          <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "1rem", color: "var(--ink)", marginBottom: "0.6rem", lineHeight: 1.4 }}>
            {post.subheadline}
          </p>
        )}
        <div className="article-byline">By {post.byline} &bull; {post.date}</div>
        <div className="article-body">
          <p>{post.body[0]}</p>
        </div>
      </div>
      <div>
        {post.pullQuote && <div className="pull-quote">{post.pullQuote}</div>}
        <div className="article-body">
          {post.body.slice(1).map((p, i) => <p key={i} style={{ marginTop: "0.8rem" }}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ post }: { post: Post }) {
  return (
    <div className="article-card">
      <div className="article-kicker">{post.kicker}</div>
      <h2 className={`article-headline ${post.size}`}>{post.headline}</h2>
      <div className="article-byline">By {post.byline} &bull; {post.date}</div>
      <div className="article-body">
        {post.body.map((p, i) => <p key={i} style={{ marginTop: i > 0 ? "0.6rem" : 0 }}>{p}</p>)}
      </div>
    </div>
  );
}

export default function Newspaper() {
  const leadPost = posts.find(p => p.lead);
  const columnPosts = posts.filter(p => !p.lead);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="newspaper-bg page-enter">
      {/* Nav */}
      <nav className="nav-bar">
        {["Essays", "Memory", "Nature", "Place", "Photography", "Urban Life"].map(s => (
          <a key={s} href="#">{s}</a>
        ))}
      </nav>

      {/* Masthead */}
      <header className="newspaper-header">
        <div style={{ position: "relative", display: "inline-block" }}>
          <div style={{ position: "absolute", top: "-1.4rem", left: "50%", transform: "translateX(-50%)" }}>
            <MayflyIcon size={24} color="var(--crimson)" />
          </div>
          <div className="newspaper-masthead">efemera</div>
        </div>
        <div className="newspaper-tagline">Life, in Brief.</div>
        <div className="newspaper-meta">
          <span>Vol. I &nbsp;&bull;&nbsp; No. 1</span>
          <span>{dateStr}</span>
          <span>Est. 2026</span>
        </div>
      </header>

      {/* Section label */}
      <div style={{ paddingTop: "1rem" }}>
        <div className="section-rule" />
        <span className="section-label">Today&rsquo;s Edition</span>
      </div>

      {/* Lead article */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 2rem 0" }}>
        {leadPost && <ArticleLead post={leadPost} />}
      </div>

      {/* Section label */}
      <div>
        <div className="section-rule" />
        <span className="section-label">Further Reading</span>
      </div>

      {/* Columns */}
      <div className={`newspaper-columns col-divider`}>
        {columnPosts.map(post => (
          <ArticleCard key={post.slug} post={post} />
        ))}
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "3px double var(--rule)",
        padding: "1.5rem 2rem",
        textAlign: "center",
        background: "var(--cream)",
        fontFamily: "'Libre Baskerville', serif",
        fontSize: "0.65rem",
        letterSpacing: "0.15em",
        color: "var(--rule)",
      }}>
        <MayflyIcon size={16} color="var(--crimson)" />
        <div style={{ marginTop: "0.5rem" }}>EFEMERA &mdash; LIFE, IN BRIEF. &mdash; EST. 2026</div>
        <div style={{ marginTop: "0.25rem", opacity: 0.6 }}>
          &ldquo;Everything passes. Everything perishes. Everything palls.&rdquo; &mdash; André Gide
        </div>
      </footer>
    </div>
  );
}
