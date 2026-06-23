import type { Metadata } from "next";
import "@/app/route-styles.css";
import { AuthGate } from "@/features/auth/auth-gate";
import { ReviewStudio } from "@/features/review/review-studio";

export const metadata: Metadata = {
  title: "Review a design",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};
export default function NewReviewPage() { return <AuthGate><ReviewStudio /></AuthGate>; }
