import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthGate } from "@/features/auth/auth-gate";
import { UserMenu } from "@/features/auth/user-menu";
import { ProductInsightsReport } from "@/features/admin/product-insights-report";
import "@/app/route-styles.css";

export const metadata: Metadata = {
  title: "Product Insights",
  robots: { index: false, follow: false, nocache: true },
};

export default function ProductInsightsAdminPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav>
          <Link href="/admin/access-interest">Review access</Link>
          <Link href="/admin/bug-reports">Bug reports</Link>
          <UserMenu />
          <Link className="button button-small" href="/research">Research form <ArrowRight /></Link>
        </nav>
      </header>
      <AuthGate><ProductInsightsReport /></AuthGate>
    </div>
  );
}
