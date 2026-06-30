"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, Eye, FileText, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import type { AccountStoredReview } from "@/lib/account-reviews";
import { useAccountReviews } from "@/lib/use-account-reviews";

type CaseStep = {
  copy: string;
  number: string;
  title: string;
};

export function PortfolioWorkshop() {
  const { loading: authLoading, user } = useAuth();
  const { hasCachedOnlyReviews, loadError, loading: reviewsLoading, reviews } = useAccountReviews({ maxReviews: 6, user });
  const source = reviews[0];
  const loading = authLoading || (Boolean(user) && reviewsLoading);

  return (
    <main>
      <section className="portfolio-hero">
        <div>
          <p className="eyebrow light"><BookOpen /> Portfolio workshop</p>
          <h1>Show the<br /><span>thinking.</span></h1>
          <p>Turn a finished image into a credible improvement story: context, critique, decisions, and what you learned.</p>
          <div className="preview-notice">
            <LockKeyhole />
            <span><strong>Private workspace</strong> Saved critiques and case-study drafts stay private to your signed-in account. Publishing remains a separate explicit action.</span>
          </div>
        </div>
        <div className="case-cover"><span>CASE / 001</span><strong>FROM<br />FIRST<br /><em>PASS</em><br />TO PROOF</strong><div /></div>
      </section>

      <section className="portfolio-builder section-pad">
        <div className="portfolio-intro">
          <div><p className="eyebrow">Case study anatomy</p><h2>A polished result<br />needs a clear story.</h2></div>
          <p>Use a saved critique as evidence. Explain the constraint, the decision, and the effect instead of presenting unexplained before-and-after images.</p>
        </div>

        <SourceReviewCard
          hasCachedOnlyReviews={hasCachedOnlyReviews}
          loadError={loadError}
          loading={loading}
          source={source}
          userSignedIn={Boolean(user)}
        />

        <div className="case-steps">
          {getCaseSteps(source).map((step) => (
            <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div><Check /></article>
          ))}
        </div>
      </section>

      <section className="portfolio-preview section-pad">
        <div className="portfolio-page-preview">
          <header><span>SELECTED WORK / 2026</span><strong>{source?.category?.toUpperCase() ?? "YOUR PROJECT"}</strong></header>
          <div className="portfolio-art"><span>BEFORE</span><span>AFTER</span><div /><div /></div>
          <div className="portfolio-story">
            <div><span>THE CHALLENGE</span><p>{source?.summary ?? "A concise explanation of the audience, goal, and unresolved design problem."}</p></div>
            <div><span>THE SHIFT</span><p>{getPrimaryRecommendation(source) ?? "One clear visual and strategic decision that changed the direction."}</p></div>
          </div>
        </div>
        <div className="portfolio-preview-copy">
          <p className="eyebrow light"><Eye /> Public-page preview</p>
          <h2>Designed to explain,<br />not decorate.</h2>
          <p>The eventual public portfolio will let you choose visible projects and hide raw critique. Saved reviews stay private until you explicitly publish a selected case study.</p>
          <button className="button button-lime" disabled>Publishing comes later</button>
        </div>
      </section>
    </main>
  );
}

function SourceReviewCard({
  hasCachedOnlyReviews,
  loadError,
  loading,
  source,
  userSignedIn,
}: {
  hasCachedOnlyReviews: boolean;
  loadError: string;
  loading: boolean;
  source?: AccountStoredReview;
  userSignedIn: boolean;
}) {
  if (loading) {
    return (
      <div className="source-review empty">
        <LoaderCircle className="spin" />
        <div><span className="mono-label">LOADING SAVED CRITIQUES</span><h3>Opening your private workspace</h3><p>Fetching account-backed reviews before suggesting a case-study outline.</p></div>
        <span>Private</span>
      </div>
    );
  }

  if (source) {
    return (
      <div className="source-review">
        <Sparkles className="sparkle-blink-glow" />
        <div>
          <span className="mono-label">LATEST SAVED CRITIQUE</span>
          <h3>{source.category ?? "Design project"} / {source.overallScore}/10</h3>
          <p>{source.summary}</p>
        </div>
        <span>{hasCachedOnlyReviews || source.syncState === "local" ? "Syncing" : "Account-backed"}</span>
      </div>
    );
  }

  if (!userSignedIn) {
    return (
      <div className="source-review empty">
        <LockKeyhole />
        <div><span className="mono-label">PRIVATE ACCOUNT REQUIRED</span><h3>Sign in to use saved critiques</h3><p>Portfolio outlines can draw from reviews saved to your account without making any critique public.</p></div>
        <Link className="button button-dark" href="/auth?mode=sign-in">Sign in <ArrowRight /></Link>
      </div>
    );
  }

  return (
    <div className="source-review empty">
      <FileText />
      <div>
        <span className="mono-label">{loadError ? "REVIEWS UNAVAILABLE" : "NO SAVED CRITIQUE SELECTED"}</span>
        <h3>{loadError ? "Could not load reviews" : "Start with evidence"}</h3>
        <p>{loadError || <>Complete a critique first. IroGuide will use its issues and strengths to seed a private case-study outline. <Link href="/docs">Read the docs</Link> for what to submit.</>}</p>
      </div>
      <Link className="button button-dark" href="/review/new">Review a design <ArrowRight /></Link>
    </div>
  );
}

function getCaseSteps(source?: AccountStoredReview): CaseStep[] {
  return [
    { number: "01", title: "Context", copy: "What problem were you solving, for whom, and under which constraints?" },
    { number: "02", title: "First direction", copy: "Show the initial idea and explain the decisions, not only the artifact." },
    { number: "03", title: "Critique", copy: getPrimaryRecommendation(source) ?? "Identify the highest-impact feedback and why it mattered." },
    { number: "04", title: "Iteration", copy: "Connect each visible change to a critique finding or tested learning." },
    { number: "05", title: "Outcome", copy: "Show the final work, remaining tradeoffs, and measurable or observed effect." },
    { number: "06", title: "Reflection", copy: "Name one principle you will carry into the next project." },
  ];
}

function getPrimaryRecommendation(source?: AccountStoredReview) {
  return source?.issues.find((issue) => issue.recommendation.trim())?.recommendation;
}
