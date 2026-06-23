import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleGauge,
  Eye,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  MousePointer2,
  Palette,
  ScanLine,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { LandingFinalAuthActions, LandingHeaderActions, LandingHeroAuthButton } from "@/features/auth/auth-nav";

const categories = [
  "Brand identity",
  "Web & UI",
  "Landing pages",
  "Posters",
  "Social",
  "Packaging",
  "Book covers",
  "Color grading",
  "Thumbnails",
  "Ad creatives",
  "Pitch decks",
  "App screens",
];

const modes = [
  {
    number: "01",
    title: "Friendly",
    label: "Learn without the overwhelm",
    copy: "Clear, patient explanations that turn design principles into practical next steps.",
    accent: "lime",
  },
  {
    number: "02",
    title: "Mentor",
    label: "Professional critique, balanced",
    copy: "Detailed art-direction with context, tradeoffs, and a prioritized path forward.",
    accent: "violet",
  },
  {
    number: "03",
    title: "Direct",
    label: "No vague praise. No cruelty.",
    copy: "Sharp, respectful feedback when the work needs an honest pre-client quality check.",
    accent: "coral",
  },
] as const;

const faqs = [
  ["Will IroGuide redesign my work automatically?", "No. Critique comes first. You stay in control and can optionally request an improvement plan later."],
  ["What kinds of design can I review?", "The first release supports logos, posters, social posts, UI screens, websites, book covers, and packaging."],
  ["Is my uploaded work private?", "Yes. Work is private by default, never added to a public gallery without permission, and can be deleted."],
  ["Does the score decide whether my design is good?", "No. Scores are navigation aids. The evidence, audience fit, and recommended changes matter more than a single number."],
] as const;

export function LandingPage() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/">
          <span className="wordmark-mark" aria-hidden="true">I</span>
          <span>IroGuide</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {siteConfig.navigation.map((item) => <Link key={item.href} href={item.href} prefetch={false}>{item.label}</Link>)}
        </nav>
        <LandingHeaderActions />
      </header>

      <section className="hero section-pad">
        <div className="hero-copy reveal">
          <p className="eyebrow"><span className="signal-dot" /> Official IroGuide website</p>
          <h1>IroGuide<br /><span className="display-accent">Design critique.</span></h1>
          <p className="hero-lede">IroGuide is the official AI design critique workspace for creative feedback, project reviews, portfolio refinement, and clearer next steps.</p>
          <div className="hero-actions">
            <Link className="button button-large" href="/review/new" prefetch={false}>Review my design <WandSparkles size={19} /></Link>
            <LandingHeroAuthButton />
            <Link className="button-quiet" href="#example">See a real critique <ArrowRight size={18} /></Link>
          </div>
          <div className="micro-proof">
            <span><Check size={15} /> Context-aware</span>
            <span><Check size={15} /> Private by default</span>
            <span><Check size={15} /> Actionable, always</span>
          </div>
        </div>

        <div className="hero-specimen" aria-label="Example IroGuide critique interface">
          <div className="specimen-grid" aria-hidden="true" />
          <div className="specimen-toolbar"><span>POSTER_03.PNG</span><span>MENTOR MODE</span></div>
          <div className="specimen-art">
            <span className="poster-kicker">Creative / 2026</span>
            <strong>MOVE<br />IDEAS<br /><em>FORWARD</em></strong>
            <div className="poster-orbit" />
          </div>
          <div className="score-float">
            <span className="mono-label">OVERALL</span>
            <strong>7.4<small>/10</small></strong>
            <span className="score-trend">Strong foundation</span>
          </div>
          <div className="critique-float">
            <div className="critique-head"><span className="priority-dot" /> HIGH PRIORITY <ScanLine size={14} /></div>
            <strong>The headline competes with the focal point.</strong>
            <p>Reduce the orbit scale and give the message one clear entry point.</p>
          </div>
          <div className="cursor-note"><MousePointer2 size={14} fill="currentColor" /> hierarchy</div>
        </div>
      </section>

      <div className="category-rail" aria-label="Supported design categories">
        <span className="mono-label">CRITIQUE FOR</span>
        <span className="sr-only">{categories.join(", ")}</span>
        <div className="category-rail-marquee" aria-hidden="true">
          <div className="category-rail-track">
            {[...categories, ...categories].map((category, index) => <span key={`${category}-${index}`}>{category}<Sparkles size={13} /></span>)}
          </div>
        </div>
      </div>

      <section className="problem-section section-pad" id="how-it-works">
        <div className="section-intro">
          <p className="eyebrow">Beyond &quot;looks good&quot;</p>
          <h2>Opinions are cheap.<br /><span className="display-outline">Direction is rare.</span></h2>
        </div>
        <div className="three-step-grid">
          {[
            [Eye, "What", "We identify the exact visual decision helping or hurting the work."],
            [Target, "Why", "We connect it to hierarchy, readability, audience, and purpose."],
            [WandSparkles, "How", "You get concrete changes in priority order, not abstract advice."],
          ].map(([Icon, title, copy], index) => {
            const StepIcon = Icon as typeof Eye;
            return <article className="step-card" key={String(title)}><span className="step-number">0{index + 1}</span><StepIcon size={28} /><h3>{String(title)}</h3><p>{String(copy)}</p></article>;
          })}
        </div>
      </section>

      <section className="modes-section section-pad" id="modes">
        <div className="section-heading-row">
          <div><p className="eyebrow light">Choose your critic</p><h2>Same standards.<br />Your preferred voice.</h2></div>
          <p>Every mode examines the same evidence. Only the tone and level of explanation change.</p>
        </div>
        <div className="mode-grid">
          {modes.map((mode) => <article className={`mode-card accent-${mode.accent}`} key={mode.title}><span className="mode-number">{mode.number}</span><div className="mode-icon"><MessageSquareText /></div><p className="mono-label">{mode.label}</p><h3>{mode.title}</h3><p>{mode.copy}</p><Link href="/review/new" prefetch={false}>Try {mode.title} mode <ChevronRight size={17} /></Link></article>)}
        </div>
      </section>

      <section className="example-section section-pad" id="example">
        <div className="example-preview">
          <div className="example-art"><span>SHIFT</span><strong>MAKE<br />SPACE<br />FOR<br /><em>BOLD</em></strong><div className="shape-one" /><div className="shape-two" /></div>
          <span className="image-tag">ORIGINAL / POSTER</span>
        </div>
        <div className="example-review">
          <p className="eyebrow">A critique you can use</p>
          <div className="review-title-row"><div><span className="mono-label">OVERALL SCORE</span><strong className="large-score">6.8<small>/10</small></strong></div><CircleGauge size={44} /></div>
          <h2>Good energy.<br />Unclear hierarchy.</h2>
          <p>The composition has a memorable visual hook, but the headline and decorative shapes carry equal weight. The viewer has no reliable first reading point.</p>
          <div className="review-callout"><span>Fix first</span><p>Reduce the secondary shapes by roughly 30% and move the headline into the dominant upper-left zone.</p></div>
          <div className="score-bars">
            {[['Composition', 7], ['Typography', 6], ['Hierarchy', 5], ['Color', 8]].map(([label, score]) => <div key={String(label)}><span>{label}</span><i><b style={{width: `${Number(score) * 10}%`}} /></i><strong>{score}</strong></div>)}
          </div>
          <Link className="button button-dark" href="/review/new" prefetch={false}>Get feedback on my work <ArrowRight size={18} /></Link>
        </div>
      </section>

      <section className="audience-section section-pad">
        <div className="section-intro compact"><p className="eyebrow">Built for the work in progress</p><h2>Your second set of<br />experienced eyes.</h2></div>
        <div className="audience-grid">
          {[
            [BookOpen, "Students", "Turn every critique into a lesson you can apply again."],
            [Layers3, "Designers", "Pressure-test work before the review, pitch, or handoff."],
            [Palette, "Creators", "Make fast-moving content clearer and more ownable."],
            [Target, "Founders", "Judge brand and product work against its real audience."],
          ].map(([Icon, title, copy]) => { const AudienceIcon = Icon as typeof BookOpen; return <article key={String(title)}><AudienceIcon /><h3>{String(title)}</h3><p>{String(copy)}</p></article>; })}
        </div>
      </section>

      <section className="trust-strip section-pad">
        <LockKeyhole size={36} />
        <div><p className="eyebrow light">Your work is still your work</p><h2>Private by default.<br />Useful by design.</h2></div>
        <p>Uploads are analyzed only to create your critique. Nothing becomes public without explicit permission, and deletion stays within reach.</p>
      </section>

      <section className="faq-section section-pad" id="faq">
        <div><p className="eyebrow">Questions, answered</p><h2>Before you<br />upload.</h2></div>
        <div className="faq-list">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="final-cta section-pad">
        <div className="cta-spark" aria-hidden="true"><Sparkles /><Sparkles /><Sparkles /></div>
        <p className="eyebrow light">Your next version starts here</p>
        <h2>Stop guessing.<br /><span>Start refining.</span></h2>
        <p>Bring the design. IroGuide will bring the clarity.</p>
        <LandingFinalAuthActions />
      </section>

      <footer className="site-footer">
        <Link className="wordmark" href="/"><span className="wordmark-mark" aria-hidden="true">I</span><span>IroGuide</span></Link>
        <p>Critique that makes the work and the designer better.</p>
        <div>{siteConfig.footerNavigation.map((item) => <Link key={item.href} href={item.href} prefetch={false}>{item.label}</Link>)}<span>Copyright 2026 IroGuide</span></div>
      </footer>
    </main>
  );
}
