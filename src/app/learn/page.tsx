import type { Metadata } from "next";
import { LearningPage } from "@/features/learning/learning-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Design Critique Learning",
  description: "Practice evidence-based design critique with owned examples, a self-review rubric, and an image-free brief builder.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Free Design Critique Learning | IroGuide",
    description: "Learn what to inspect, why it matters, and what to fix first without uploading your work.",
    url: `${siteConfig.url}/learn`,
  },
};

export default function LearnPage() { return <LearningPage />; }
