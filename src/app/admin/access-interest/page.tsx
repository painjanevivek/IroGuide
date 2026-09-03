import type { Metadata } from "next";
import Link from "next/link";
import { AuthGate } from "@/features/auth/auth-gate";
import { UserMenu } from "@/features/auth/user-menu";
import { AccessOperationsPanel } from "@/features/admin/access-operations-panel";
import "@/app/route-styles.css";

export const metadata: Metadata = { title: "Review Access Operations", robots: { index: false, follow: false, nocache: true } };

export default function AccessOperationsPage() {
  return <div className="simple-page"><header className="simple-header access-operations-header"><Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link><nav><Link href="/admin/insights">Insights</Link><Link href="/admin/bug-reports">Bug reports</Link><UserMenu /></nav></header><AuthGate><AccessOperationsPanel /></AuthGate></div>;
}
