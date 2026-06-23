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
export default function PricingPage() { return <div className="pricing-page"><header className="simple-header"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><Link href="/community">Community</Link><HeaderAuthLinks includeDashboard={false} /></nav></header><main><section className="pricing-hero"><p className="eyebrow"><Sparkles /> Pricing preview</p><h1>More clarity.<br /><span>Less creative doubt.</span></h1><p>Start free. Upgrade when critique becomes part of your practice or delivery workflow.</p><div className="billing-note"><ShieldCheck /><span>Checkout is intentionally disabled until secure billing, tax, webhooks, and persistent accounts are configured.</span></div></section><section className="pricing-grid">{plans.map((plan) => <article key={plan.id} className={plan.highlighted ? "featured" : ""}>{plan.highlighted && <span className="popular">MOST USEFUL FOR REGULAR PRACTICE</span>}<header><span className="mono-label">{plan.audience}</span><h2>{plan.name}</h2><div className="price">{plan.monthlyPrice === null ? <strong>Let&apos;s talk</strong> : <><strong>${plan.monthlyPrice}</strong><span>/ month</span></>}</div></header><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>{plan.id === "free" ? <Link className="button button-dark" href="/auth?mode=sign-up">Sign up free <ArrowRight /></Link> : <button className={`button ${plan.highlighted ? "button-lime" : "button-dark"}`} disabled>Coming after beta</button>}</article>)}</section><section className="pricing-principles"><div><p className="eyebrow light">Billing principles</p><h2>Limits you can<br />actually understand.</h2></div><div><article><span>01</span><h3>No surprise overages</h3><p>Usage limits are visible before the review starts. Paid overages require explicit opt-in.</p></article><article><span>02</span><h3>Your work is not currency</h3><p>Payment does not grant IroGuide rights to publish or train on private uploads.</p></article><article><span>03</span><h3>Export before canceling</h3><p>Paid users receive a clear export and retention window before data removal.</p></article></div></section><section className="pricing-faq section-pad"><div><p className="eyebrow">Before billing exists</p><h2>What is live today?</h2></div><p>The full critique demo, improvement-plan preview, local dashboard, community concept, and portfolio workshop are usable without payment. Prices and limits are product hypotheses until beta validation and are not an offer to purchase.</p></section></main></div>; }
