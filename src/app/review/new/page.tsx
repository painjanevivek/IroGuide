import type { Metadata } from "next";
import { ReviewStudio } from "@/features/review/review-studio";

export const metadata: Metadata = { title: "Review a design" };
export default function NewReviewPage() { return <ReviewStudio />; }
