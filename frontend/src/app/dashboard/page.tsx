import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Dashboard } from "@/features/dashboard/dashboard";

export const metadata: Metadata = { title: "Dashboard" };
export default function DashboardPage() { return <div className="simple-page"><header className="simple-header"><Link href="/" className="wordmark"><span className="wordmark-mark">D</span>DinoDesign</Link><nav><Link href="/">Home</Link><Link className="button button-small" href="/review/new">New review <ArrowRight /></Link></nav></header><Dashboard /></div>; }
