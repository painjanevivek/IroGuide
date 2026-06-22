"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Eye, FileText, LockKeyhole, Sparkles } from "lucide-react";

type StoredReview = { id: string; overallScore: number; category?: string; summary: string; strengths?: string[]; issues?: Array<{ category: string; recommendation: string }> };

export function PortfolioWorkshop() {
  const snapshot = useSyncExternalStore(() => () => undefined, () => localStorage.getItem("iroguide-reviews") ?? "[]", () => "[]");
  let reviews: StoredReview[] = [];
  try { reviews = JSON.parse(snapshot) as StoredReview[]; } catch { reviews = []; }
  const source = reviews[0];

  return <main><section className="portfolio-hero"><div><p className="eyebrow light"><BookOpen /> Portfolio workshop</p><h1>Show the<br /><span>thinking.</span></h1><p>Turn a finished image into a credible improvement story—context, critique, decisions, and what you learned.</p><div className="preview-notice"><LockKeyhole /><span><strong>Private workspace</strong> Drafts stay in this browser. Public URLs and exports remain disabled until publishing consent and persistent storage exist.</span></div></div><div className="case-cover"><span>CASE / 001</span><strong>FROM<br />FIRST<br /><em>PASS</em><br />TO PROOF</strong><div /></div></section><section className="portfolio-builder section-pad"><div className="portfolio-intro"><div><p className="eyebrow">Case study anatomy</p><h2>A polished result<br />needs a clear story.</h2></div><p>Use one review as evidence. Explain the constraint, the decision, and the effect instead of presenting unexplained before-and-after images.</p></div>{source ? <div className="source-review"><Sparkles /><div><span className="mono-label">LATEST LOCAL REVIEW</span><h3>{source.category ?? "Design project"} · {source.overallScore}/10</h3><p>{source.summary}</p></div><span>Ready to outline</span></div> : <div className="source-review empty"><FileText /><div><span className="mono-label">NO REVIEW SELECTED</span><h3>Start with evidence</h3><p>Complete a critique first. IroGuide will use its issues and strengths to seed a case-study outline.</p></div><Link className="button button-dark" href="/review/new">Review a design <ArrowRight /></Link></div>}<div className="case-steps">{[
    ["01", "Context", "What problem were you solving, for whom, and under which constraints?"],
    ["02", "First direction", "Show the initial idea and explain the decisions—not only the artifact."],
    ["03", "Critique", source?.issues?.[0]?.recommendation ?? "Identify the highest-impact feedback and why it mattered."],
    ["04", "Iteration", "Connect each visible change to a critique finding or tested learning."],
    ["05", "Outcome", "Show the final work, remaining tradeoffs, and measurable or observed effect."],
    ["06", "Reflection", "Name one principle you will carry into the next project."],
  ].map(([number,title,copy]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><Check /></article>)}</div></section><section className="portfolio-preview section-pad"><div className="portfolio-page-preview"><header><span>SELECTED WORK / 2026</span><strong>{source?.category?.toUpperCase() ?? "YOUR PROJECT"}</strong></header><div className="portfolio-art"><span>BEFORE</span><span>AFTER</span><div /><div /></div><div className="portfolio-story"><div><span>THE CHALLENGE</span><p>{source?.summary ?? "A concise explanation of the audience, goal, and unresolved design problem."}</p></div><div><span>THE SHIFT</span><p>{source?.issues?.[0]?.recommendation ?? "One clear visual and strategic decision that changed the direction."}</p></div></div></div><div className="portfolio-preview-copy"><p className="eyebrow light"><Eye /> Public-page preview</p><h2>Designed to explain,<br />not decorate.</h2><p>The eventual public portfolio will let you choose visible projects and hide raw critique. Publishing will always be a separate explicit action.</p><button className="button button-lime" disabled>Publishing comes later</button></div></section></main>;
}
