import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Heart, MessageSquareText, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { HeaderAuthLinks } from "@/features/auth/auth-nav";
import { CommunityPrivateCritiqueLink } from "@/features/community/community-private-critique-link";

export const metadata: Metadata = { title: "Community" };

const critiques = [
  { category: "Brand identity", title: "A quieter identity for a noisy category", maker: "Anika Rao", score: "8.2", color: "violet", note: "The tighter symbol-to-wordmark relationship made the system feel intentional at every size." },
  { category: "Editorial", title: "Independent culture, set in motion", maker: "Milo Chen", score: "7.6", color: "lime", note: "Strong energy. The date and venue still need a calmer secondary reading zone." },
  { category: "Product UI", title: "Rethinking the first-run workspace", maker: "Nora Studio", score: "8.7", color: "coral", note: "Progressive disclosure keeps the interface capable without making the first session feel dense." },
] as const;

export default function CommunityPage() {
  return (
    <div className="community-page">
      <header className="simple-header community-nav">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <nav><HeaderAuthLinks /></nav>
      </header>
      <main>
        <section className="community-hero">
          <div>
            <p className="eyebrow light"><Users /> Community</p>
            <h1>Critique with<br /><span>more signal.</span></h1>
            <p>A live practice space for thoughtful feedback, visible improvement, and creative momentum - designed to make &quot;looks good&quot; the beginning, not the end.</p>
            <div className="preview-notice live-notice"><ShieldCheck /><span><strong>Ready to start</strong> Start a private critique and build a stronger improvement story before sharing work outward.</span><CommunityPrivateCritiqueLink /></div>
          </div>
          <div className="community-orbit" aria-hidden="true">
            <span>WHAT WORKS</span><span>WHY IT MATTERS</span><span>WHAT TO TRY</span><div><MessageSquareText /></div>
          </div>
        </section>

        <section className="community-feed section-pad">
          <div className="community-section-title">
            <div><p className="eyebrow">Featured improvement stories</p><h2>Work worth<br />talking about.</h2></div>
            <p>Each story pairs the design context with a structured critique pattern, so feedback stays specific, practical, and respectful.</p>
          </div>
          <div className="critique-grid">
            {critiques.map((item, index) => (
              <article key={item.title} className={`critique-tile tile-${item.color}`}>
                <div className="critique-canvas">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.title.split(" ").slice(0, 3).join(" ")}<br /><em>{item.title.split(" ").slice(3).join(" ")}</em></strong>
                  <div />
                </div>
                <div className="critique-info">
                  <span className="mono-label">{item.category}</span>
                  <h3>{item.title}</h3>
                  <div className="maker"><span>{item.maker.charAt(0)}</span><p>{item.maker}<small><BadgeCheck /> Structured critic</small></p><strong>{item.score}<small>/10</small></strong></div>
                  <blockquote>{item.note}</blockquote>
                  <footer><span><Heart /> Improvement story</span><span><MessageSquareText /> Critique template</span></footer>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="challenge-section section-pad">
          <div className="challenge-copy">
            <p className="eyebrow light"><Trophy /> Weekly practice</p>
            <h2>One brief.<br />Many answers.</h2>
            <p>Practice with a bounded prompt, receive the same rubric, and compare improvement - not popularity alone.</p>
            <div><span><CalendarDays /> Week 01</span><span>Poster design</span><span>72-hour sprint</span></div>
            <Link className="button button-lime" href="/review/new">Start this brief <ArrowRight size={17} /></Link>
          </div>
          <div className="challenge-card"><span className="mono-label">THE BRIEF</span><p>Design a poster that makes five quiet minutes feel culturally urgent.</p><strong>PAUSE<br /><em>IS A</em><br />PRACTICE.</strong><div className="challenge-shape" /></div>
        </section>

        <section className="peer-template section-pad">
          <div><p className="eyebrow">A better comment box</p><h2>Structure makes<br />feedback useful.</h2></div>
          <div className="template-card">
            <span>01 / WHAT WORKS</span><p>Name the specific decision and the effect it creates.</p>
            <span>02 / WHAT CAN IMPROVE</span><p>Describe the design - not the designer.</p>
            <span>03 / WHY</span><p>Connect the observation to purpose, audience, or principle.</p>
            <span>04 / SUGGESTION</span><p>Offer a practical direction while leaving room for authorship.</p>
          </div>
        </section>

        <section className="community-cta">
          <Sparkles />
          <h2>Build in public.<br /><span>Improve with purpose.</span></h2>
          <p>Start with a private critique, shape the next version, and turn the feedback into a story worth sharing.</p>
          <CommunityPrivateCritiqueLink className="button button-lime button-large" />
        </section>
      </main>
    </div>
  );
}
