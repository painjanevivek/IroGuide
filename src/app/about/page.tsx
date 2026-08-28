import type { Metadata } from "next";
import "@/app/route-styles.css";
import Link from "next/link";
import { Eye, ShieldCheck, Sparkles, Target } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ReviewLaunchLink } from "@/features/capabilities/review-launch-link";

export const metadata: Metadata = {
  title: `About ${siteConfig.name} - Design Critique Learning`,
  description:
    "Learn how IroGuide teaches evidence-based design critique now and gates personalized AI review until it is proven safe and useful.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/docs">Learning guide</Link><Link href="/contact">Contact</Link></nav>
      </header>
      <main className="official-main">
        <section className="official-hero">
          <p className="eyebrow"><Sparkles className="sparkle-blink-glow" /> About IroGuide</p>
          <h1>Learn to turn design evidence into better decisions.</h1>
          <p>IroGuide gives beginner designers, freelancers, and UI/UX designers a structured way to identify what matters, explain why, and choose the first useful fix.</p>
          <ReviewLaunchLink className="button button-dark" enabledLabel="Start a design review" eventName="about_review_click" />
        </section>
        <section className="official-grid" aria-label="IroGuide principles">
          <article><Eye /><h2>Context first</h2><p>Feedback is shaped around the audience, format, goal, and creative intent instead of generic taste.</p></article>
          <article><Target /><h2>Practical next steps</h2><p>Each critique prioritizes the changes most likely to improve clarity, hierarchy, readability, and visual impact.</p></article>
          <article><ShieldCheck /><h2>Private by default</h2><p>Uploads are treated as private work. Public sharing and portfolio publishing are separate, intentional actions.</p></article>
        </section>
      </main>
    </div>
  );
}
