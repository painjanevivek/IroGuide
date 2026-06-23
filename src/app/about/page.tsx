import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, ShieldCheck, Sparkles, Target } from "lucide-react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `About ${siteConfig.name}`,
  description:
    "About IroGuide, the official AI design critique workspace for contextual creative feedback and practical design improvement.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><Link href="/projects">Projects</Link><Link href="/contact">Contact</Link></nav>
      </header>
      <main className="official-main">
        <section className="official-hero">
          <p className="eyebrow"><Sparkles /> About IroGuide</p>
          <h1>IroGuide is the official AI critique workspace for better design decisions.</h1>
          <p>IroGuide helps designers, students, creators, and founders understand what is working in a visual design, what is getting in the way, and what to improve next.</p>
          <Link className="button button-dark" href="/review/new">Start a design review <ArrowRight size={18} /></Link>
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
