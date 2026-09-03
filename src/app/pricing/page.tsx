import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Pricing Research — No Checkout",
  description: "IroGuide pricing is research only. Checkout, subscriptions, and paid critique remain disabled.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "IroGuide Pricing Research — No Checkout",
    description: "IroGuide remains free while product value, provider economics, billing safety, tax, and support are proven.",
    url: `${siteConfig.url}/pricing`,
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function PricingPage() {
  return (
    <div className="gated-destination">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/docs">Learning guide</Link></nav>
      </header>
      <main>
        <p className="eyebrow"><LockKeyhole /> Pricing research only</p>
        <h1>No checkout.<br /><span>No paid plan yet.</span></h1>
        <p>IroGuide remains free while usefulness, provider quality, bounded cost, tax, refunds, support, and reconciliation are proven.</p>
        <div className="billing-note">
          <ShieldCheck />
          <span><strong>Billing is closed.</strong> Payment can never bypass provider, privacy, or Community safety gates.</span>
        </div>
        <Link className="button button-dark" href="/#critique-preview">Explore an example critique <ArrowRight size={17} /></Link>
      </main>
    </div>
  );
}
