import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthGate } from "@/features/auth/auth-gate";
import { UserMenu } from "@/features/auth/user-menu";
import { Dashboard } from "@/features/dashboard/dashboard";

export const metadata: Metadata = { title: "Dashboard" };
export default function DashboardPage() { return <div className="simple-page"><header className="simple-header"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><Link href="/">Home</Link><UserMenu /><Link className="button button-small" href="/review/new">New review <ArrowRight /></Link></nav></header><AuthGate><Dashboard /></AuthGate></div>; }
