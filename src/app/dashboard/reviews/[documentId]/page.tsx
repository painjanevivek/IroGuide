import type { Metadata } from "next";
import "@/app/route-styles.css";
import { AuthGate } from "@/features/auth/auth-gate";
import { DashboardReviewDetail } from "@/features/dashboard/dashboard-review-detail";

export const metadata: Metadata = {
  title: "Saved Review",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function DashboardReviewPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;

  return (
    <AuthGate>
      <DashboardReviewDetail documentId={decodeURIComponent(documentId)} />
    </AuthGate>
  );
}
