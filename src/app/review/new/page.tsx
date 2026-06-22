import type { Metadata } from "next";
import { AuthGate } from "@/features/auth/auth-gate";
import { ReviewStudio } from "@/features/review/review-studio";

export const metadata: Metadata = { title: "Review a design" };
export default function NewReviewPage() { return <AuthGate><ReviewStudio /></AuthGate>; }
