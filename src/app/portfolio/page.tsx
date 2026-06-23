import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { HeaderAuthLinks } from "@/features/auth/auth-nav";
import { PortfolioWorkshop } from "@/features/portfolio/portfolio-workshop";

export const metadata: Metadata = { title: "Portfolio workshop" };
export default function PortfolioPage() { return <div className="portfolio-page"><header className="simple-header portfolio-nav"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><HeaderAuthLinks /></nav></header><PortfolioWorkshop /></div>; }
