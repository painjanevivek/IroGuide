import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { AuthGate } from "@/features/auth/auth-gate";
import { UserMenu } from "@/features/auth/user-menu";
import { ProjectsWorkspace } from "@/features/projects/projects-workspace";

export const metadata: Metadata = {
  title: `${siteConfig.name} Projects`,
  description:
    "Create and organize private design-learning projects, briefs, self-reviews, and future verified critique evidence.",
  alternates: {
    canonical: "/projects",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function ProjectsPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/dashboard">Dashboard</Link><Link href="/learn">Learning</Link><UserMenu /></nav>
      </header>
      <AuthGate><ProjectsWorkspace /></AuthGate>
    </div>
  );
}
