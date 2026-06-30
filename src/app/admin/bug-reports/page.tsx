import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthGate } from "@/features/auth/auth-gate";
import { UserMenu } from "@/features/auth/user-menu";
import { BugReportInbox } from "@/features/admin/bug-report-inbox";

export const metadata: Metadata = {
  title: "Bug Report Inbox",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function BugReportsAdminPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <UserMenu />
          <Link className="button button-small" href="/contact#bug-report">Report bug <ArrowRight /></Link>
        </nav>
      </header>
      <AuthGate>
        <BugReportInbox />
      </AuthGate>
    </div>
  );
}
