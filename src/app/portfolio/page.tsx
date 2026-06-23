import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { HeaderAuthLinks } from "@/features/auth/auth-nav";
import { PortfolioWorkshop } from "@/features/portfolio/portfolio-workshop";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "IroGuide Portfolio Workshop - Turn Critique Into Case Studies",
  description: "Use IroGuide critique history to shape clearer portfolio stories, design decisions, and before-after project narratives.",
  alternates: {
    canonical: "/portfolio",
  },
  openGraph: {
    title: "IroGuide Portfolio Workshop - Turn Critique Into Case Studies",
    description: "Use IroGuide critique history to shape clearer portfolio stories, design decisions, and before-after project narratives.",
    url: `${siteConfig.url}/portfolio`,
  },
};
export default function PortfolioPage() { return <div className="portfolio-page"><header className="simple-header portfolio-nav"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><HeaderAuthLinks /></nav></header><PortfolioWorkshop /></div>; }
