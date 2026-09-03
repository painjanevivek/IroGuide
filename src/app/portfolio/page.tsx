import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Private Portfolio Workshop — Gated",
  description: "Portfolio case studies remain private and gated until they can be grounded in owned, verified critique and revision evidence.",
  alternates: { canonical: "/portfolio" },
  openGraph: {
    title: "Private Portfolio Workshop — Gated",
    description: "Portfolio case studies remain private and gated until verified critique and revision evidence exists.",
    url: `${siteConfig.url}/portfolio`,
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function PortfolioPage() {
  return (
    <div className="gated-destination gated-destination-violet">
      <header className="simple-header portfolio-nav">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/docs">Learning guide</Link></nav>
      </header>
      <main>
        <p className="eyebrow light"><LockKeyhole /> Private Portfolio is gated</p>
        <h1>Evidence first.<br /><span>Publishing later.</span></h1>
        <p>Portfolio case studies will be built only from owned, verified critique and revision evidence. Public publishing remains disabled.</p>
        <div className="preview-notice">
          <ShieldCheck />
          <span><strong>An intentional boundary</strong> A polished story must never invent design outcomes or expose private client work.</span>
        </div>
        <Link className="button button-lime" href="/#critique-preview">Explore an example critique <ArrowRight size={17} /></Link>
      </main>
    </div>
  );
}
