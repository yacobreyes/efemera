import { Fragment } from "react";
import type { Metadata } from "next";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import SubscribeButton from "@/components/SubscribeButton";

export const metadata: Metadata = {
  title: "Gangrey | Subscribe",
  description: "Become a free or paid member of Gangrey, a literary magazine.",
};

const PAID_TIERS = [
  {
    name: "Monthly Member",
    price: "$8",
    per: "/mo",
    desc: "Get three issues a year, full access to the archive while subscribed, and discounted tickets to workshops with guest editors and contributors.",
  },
  {
    name: "Annual Member",
    price: "$80",
    per: "/yr",
    desc: "Get three issues a year, full access to the archive, a limited-edition bookmark, and discounted tickets to workshops with guest editors and contributors. Annual members save $16.",
  },
  {
    name: "Founding Member",
    price: "$100",
    per: "/yr",
    desc: "Everything in Annual, plus a Gangrey tote, early access to the first issue, and your name on the founding members page.",
  },
];

export default function SubscribePage() {
  return (
    <div className="subscribe-page">
      <style>{`
        .subscribe-page { min-height: 100vh; display: flex; flex-direction: column; background: #ffffff; color: #000000; }
        .subscribe-main { flex: 1; width: 100%; padding: 36px 76px 42px; box-sizing: border-box; }
        .subscribe-header { border-bottom: 1px solid #000000; padding-bottom: 16px; margin-bottom: 32px; }
        .subscribe-h1 {
          margin: 0;
          font-family: var(--font-headline);
          font-size: clamp(30px, 4.2vw, 40px);
          line-height: 1.02; letter-spacing: -.03em; font-weight: 800;
        }
        .subscribe-dek {
          margin: 14px 0 0;
          font-family: var(--font-body);
          font-size: clamp(18px, 2.4vw, 22px);
          line-height: 1.4; color: #000000; max-width: 640px;
        }
        .tiers-grid {
          display: grid;
          grid-template-columns: 1fr 1px 1fr 1px 1fr 1px 1fr;
          column-gap: 32px;
        }
        .tier { display: flex; flex-direction: column; height: 100%; }
        .tier-divider { border-left: 1px dotted #8a8a8c; }
        .tier-name {
          margin: 0 0 6px;
          font-family: var(--font-headline);
          font-size: 23px; font-weight: 800; letter-spacing: -.02em;
        }
        .tier-price {
          font-family: var(--font-headline);
          font-weight: 800; font-size: 28px; letter-spacing: -.02em;
          color: #490000; margin-bottom: 18px;
        }
        .tier-price .per { font-size: 13px; font-weight: 700; letter-spacing: .05em; }
        .tier-desc {
          margin: 0 0 22px;
          font-family: var(--font-body);
          font-size: 15.5px; line-height: 1.55; color: #392a22;
        }
        .tier-join,
        .tier .tier-join-btn {
          margin-top: auto;
          align-self: flex-start;
          background: none; border: 0; padding: 0; cursor: pointer;
          color: #490000;
          font-family: var(--font-subhead);
          font-weight: 700; font-size: 11px; letter-spacing: .16em; text-transform: uppercase;
          text-decoration: none;
          text-align: left;
        }
        .founding {
          margin-top: 60px;
          border-top: 3px solid #000000;
          padding-top: 24px;
          text-align: center;
        }
        .founding h2 {
          margin: 0 0 22px;
          font-family: var(--font-headline);
          font-size: 26px; font-weight: 800; letter-spacing: -.02em;
        }
        .founding-placeholder {
          margin: 0;
          font-family: var(--font-body);
          font-size: 17px; font-style: italic; color: #392a22;
        }
        @media (max-width: 900px) {
          .subscribe-main { padding: 40px 20px 48px; }
          .tiers-grid { grid-template-columns: 1fr 1fr; gap: 36px 28px; }
          .tier-divider { display: none; }
        }
        @media (max-width: 520px) {
          .tiers-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <MagHeader />
      <main className="subscribe-main">
        <div className="subscribe-header">
          <h1 className="subscribe-h1">Subscribe</h1>
          <p className="subscribe-dek">Gangrey is a reader-supported publication. To receive new issues and support the work, consider becoming a free or paid member.</p>
        </div>

        <div className="tiers-grid">
          <div className="tier">
            <h2 className="tier-name">Free Reader</h2>
            <div className="tier-price">$0</div>
            <p className="tier-desc">Get announcements, select posts, calls for submissions, and our monthly Gangrey Classics newsletter.</p>
            <SubscribeButton className="tier-join-btn">Join →</SubscribeButton>
          </div>
          {PAID_TIERS.map(tier => (
            <Fragment key={tier.name}>
              <div className="tier-divider" />
              <div className="tier">
                <h2 className="tier-name">{tier.name}</h2>
                <div className="tier-price">{tier.price}<span className="per">{tier.per}</span></div>
                <p className="tier-desc">{tier.desc}</p>
                <a className="tier-join" href="mailto:subscriptions@gangrey.org">Join →</a>
              </div>
            </Fragment>
          ))}
        </div>

        <div className="founding">
          <h2>Our Founding Members</h2>
          <p className="founding-placeholder">Founding members will be recognized here.</p>
        </div>
      </main>
      <MagFooter />
    </div>
  );
}
