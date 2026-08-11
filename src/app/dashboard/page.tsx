import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { AuthGate } from "@/features/auth/auth-gate";
import { UserMenu } from "@/features/auth/user-menu";
import { ReviewLaunchLink } from "@/features/capabilities/review-launch-link";
import { Dashboard } from "@/features/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};
export default function DashboardPage() { return <div className="simple-page"><header className="simple-header"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><Link href="/">Home</Link><UserMenu /><ReviewLaunchLink className="button button-small" enabledLabel="New review" /></nav></header><AuthGate><Dashboard /></AuthGate></div>; }
