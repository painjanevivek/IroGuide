import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Compass,
  FileText,
  Gauge,
  Layers3,
  Lightbulb,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UsersRound,
} from "lucide-react";
import "@/app/route-styles.css";
import { siteConfig } from "@/config/site";
import styles from "./docs-page.module.css";

export const metadata: Metadata = {
  title: "IroGuide Docs - Product Guide for New and Advanced Learners",
  description:
    "Learn how IroGuide works, how to prepare design reviews, how feedback modes differ, and how to use critique results responsibly.",
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    title: "IroGuide Docs - Product Guide for New and Advanced Learners",
    description:
      "A practical IroGuide documentation hub for beginners, creators, students, teams, and advanced design learners.",
    url: `${siteConfig.url}/docs`,
  },
};

const quickStartSteps = [
  {
    icon: Upload,
    title: "Upload clear work",
    text: "Use a focused image of the logo, poster, UI screen, package, or layout you want reviewed.",
  },
  {
    icon: Target,
    title: "Add useful context",
    text: "Tell IroGuide the audience, goal, format, tone, and any constraints that should shape the critique.",
  },
  {
    icon: MessageSquareText,
    title: "Choose critique tone",
    text: "Select friendly, mentor, or direct depending on whether you need encouragement, coaching, or sharp prioritization.",
  },
  {
    icon: CheckCircle2,
    title: "Act on the first fix",
    text: "Start with the highest-impact recommendation before polishing secondary details.",
  },
] as const;

const learningPaths = [
  {
    label: "New users",
    title: "Understand what to submit",
    items: ["Pick one design problem", "Write a short brief", "Review the top issue first"],
  },
  {
    label: "Beginners",
    title: "Build critique habits",
    items: ["Compare hierarchy and spacing", "Track repeated comments", "Save before and after versions"],
  },
  {
    label: "Advanced learners",
    title: "Pressure-test decisions",
    items: ["Use stricter context", "Ask follow-up questions", "Convert critique into a design rationale"],
  },
] as const;

const conceptCards = [
  {
    icon: Compass,
    title: "Context controls the answer",
    text: "A portfolio cover, ad creative, app screen, and event poster should not be judged with the same criteria.",
  },
  {
    icon: Gauge,
    title: "Scores are directional",
    text: "Use score changes to spot movement, but rely on the written priorities when choosing what to fix next.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    text: "Saved reviews stay in your signed-in workspace unless you intentionally share or publish a critique.",
  },
  {
    icon: UsersRound,
    title: "Audience matters",
    text: "Stronger prompts describe who must understand, trust, click, buy, attend, or remember the design.",
  },
] as const;

const advancedPractices = [
  "Submit one design direction at a time so feedback stays specific.",
  "Name the constraint that matters most, such as conversion, readability, premium tone, or brand recall.",
  "Use follow-up chat to clarify tradeoffs instead of asking for a full second review immediately.",
  "Treat every recommendation as a design hypothesis, then validate it against the audience and format.",
] as const;

export default function DocsPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark">
          <span className="wordmark-mark">I</span>
          IroGuide
        </Link>
        <nav>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link className="button button-small" href="/review/new">
            Start review <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <main className={styles.docsMain}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className="eyebrow">
              <Sparkles className="sparkle-blink-glow" />
              IroGuide docs
            </p>
            <h1>Learn the website deeply, then critique with better intent.</h1>
            <p>
              A practical documentation hub for new users, beginners, students, creators, and advanced learners who want
              stronger design reviews from IroGuide.
            </p>
            <div className={styles.heroActions}>
              <Link className="button button-dark" href="/review/new">
                Try a review <ArrowRight size={18} />
              </Link>
              <Link className="button-quiet" href="#quick-start">
                Read quick start <BookOpenText size={18} />
              </Link>
            </div>
          </div>

          <aside className={styles.mapPanel} aria-label="Documentation contents">
            <span className="mono-label">Docs map</span>
            <a href="#quick-start">01 Quick start</a>
            <a href="#paths">02 Learning paths</a>
            <a href="#concepts">03 Core concepts</a>
            <a href="#advanced">04 Advanced practice</a>
          </aside>
        </section>

        <section id="quick-start" className={styles.quickStart} aria-labelledby="quick-start-title">
          <div className={styles.sectionLead}>
            <p className="eyebrow">First review</p>
            <h2 id="quick-start-title">Start with a clean loop.</h2>
            <p>Every useful critique begins with a clear design file, a real goal, and one next action.</p>
          </div>
          <div className={styles.stepGrid}>
            {quickStartSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title}>
                  <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <Icon />
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="paths" className={styles.learningPaths} aria-labelledby="paths-title">
          <div className={styles.sectionLead}>
            <p className="eyebrow">Learning paths</p>
            <h2 id="paths-title">Use IroGuide differently as your skill grows.</h2>
          </div>
          <div className={styles.pathGrid}>
            {learningPaths.map((path) => (
              <article key={path.label}>
                <span className="mono-label">{path.label}</span>
                <h3>{path.title}</h3>
                <ul>
                  {path.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="concepts" className={styles.concepts} aria-labelledby="concepts-title">
          <div className={styles.sectionLead}>
            <p className="eyebrow">Core concepts</p>
            <h2 id="concepts-title">What IroGuide is optimizing for.</h2>
            <p>IroGuide is built to explain design decisions, not replace them. The best results come from strong context.</p>
          </div>
          <div className={styles.conceptGrid}>
            {conceptCards.map((concept) => {
              const Icon = concept.icon;
              return (
                <article key={concept.title}>
                  <Icon />
                  <h3>{concept.title}</h3>
                  <p>{concept.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="advanced" className={styles.advanced} aria-labelledby="advanced-title">
          <div>
            <p className="eyebrow light">
              <Layers3 />
              Advanced practice
            </p>
            <h2 id="advanced-title">Turn critique into a repeatable design system habit.</h2>
            <p>
              Advanced learners get more value when they ask narrower questions, document reasoning, and compare changes
              against the same objective.
            </p>
          </div>
          <ol>
            {advancedPractices.map((practice) => (
              <li key={practice}>
                <Lightbulb />
                <span>{practice}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.reference} aria-labelledby="reference-title">
          <div>
            <p className="eyebrow">Reference</p>
            <h2 id="reference-title">Helpful next pages.</h2>
          </div>
          <div className={styles.referenceLinks}>
            <Link href="/privacy">
              <ShieldCheck />
              <span>
                <strong>Privacy and review data</strong>
                <small>Understand uploads, saved critiques, AI provider use, and account controls.</small>
              </span>
              <ArrowRight />
            </Link>
            <Link href="/contact">
              <FileText />
              <span>
                <strong>Support and bug reports</strong>
                <small>Get help with account questions, broken flows, review issues, or beta feedback.</small>
              </span>
              <ArrowRight />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
