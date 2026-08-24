import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { HeaderAuthLinks } from "@/features/auth/auth-nav";
import { plans } from "@/domain/plans";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "IroGuide Pricing - AI Design Critique Plans",
  description: "Preview IroGuide pricing for AI design critique, creative feedback, portfolio review, and regular design practice.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "IroGuide Pricing - AI Design Critique Plans",
    description: "Preview IroGuide pricing for AI design critique, creative feedback, portfolio review, and regular design practice.",
    url: `${siteConfig.url}/pricing`,
  },
};
export default function PricingPage() { return <div className="pricing-page"><header className="simple-header"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><HeaderAuthLinks includeDashboard={false} /></nav></header><main><section className="pricing-hero"><p className="eyebrow"><Sparkles className="sparkle-blink-glow" /> Pricing research</p><h1>More clarity.<br /><span>Less creative doubt.</span></h1><p>These plan shapes are hypotheses for later validation, not a live offer or an available review quota.</p><div className="billing-note"><ShieldCheck /><span>Checkout and paid critique are intentionally disabled. The current free profile provides account workspace and data controls while provider value, cost, tax, webhooks, and support are proven.</span></div></section><section className="pricing-grid">{plans.map((plan) => <article key={plan.id} className={plan.highlighted ? "featured" : ""}>{plan.highlighted && <span className="popular">PLAN HYPOTHESIS</span>}<header><span className="mono-label">{plan.audience}</span><h2>{plan.name}</h2><div className="price">{plan.monthlyPrice === null ? <strong>Research</strong> : <><strong>${plan.monthlyPrice}</strong><span>/ month concept</span></>}</div></header><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>{plan.id === "free" ? <Link className="button button-dark" href="/auth?mode=sign-up">Create a workspace <ArrowRight /></Link> : <button className={`button ${plan.highlighted ? "button-lime" : "button-dark"}`} disabled>Not available</button>}</article>)}</section><section className="pricing-principles"><div><p className="eyebrow light">Billing principles</p><h2>Limits you can<br />actually understand.</h2></div><div><article><span>01</span><h3>No surprise overages</h3><p>Usage limits must be visible before a paid review starts. Overage billing requires explicit opt-in.</p></article><article><span>02</span><h3>Your work is not currency</h3><p>Payment will never grant IroGuide rights to publish or train on private uploads.</p></article><article><span>03</span><h3>Exit stays clear</h3><p>Any future paid plan requires an explicit export, cancellation, retention, and deletion contract.</p></article></div></section><section className="pricing-faq section-pad"><div><p className="eyebrow">Current free profile</p><h2>What is available now?</h2></div><p>Account access, owned critique text and drafts, compatible progress, profile controls, deletion, documentation, and stored bug reports remain available. New AI critique, source-image storage, Community, checkout, and paid plans are gated.</p></section></main></div>; }
