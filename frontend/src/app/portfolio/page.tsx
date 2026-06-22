import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PortfolioWorkshop } from "@/features/portfolio/portfolio-workshop";

export const metadata: Metadata = { title: "Portfolio workshop" };
export default function PortfolioPage() { return <div className="portfolio-page"><header className="simple-header portfolio-nav"><Link href="/" className="wordmark"><span className="wordmark-mark">D</span>DinoDesign</Link><nav><Link href="/dashboard">Dashboard</Link><Link className="button button-small" href="/review/new">New review <ArrowRight /></Link></nav></header><PortfolioWorkshop /></div>; }
