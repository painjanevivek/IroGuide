"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Sparkles } from "lucide-react";

type StoredReview = { id: string; createdAt: string; overallScore: number; category?: string; summary: string };

export function Dashboard() {
  const storedReviews = useSyncExternalStore(
    () => () => undefined,
    () => localStorage.getItem("dinodesign-reviews") ?? "[]",
    () => "[]",
  );
  let reviews: StoredReview[] = [];
  try { reviews = JSON.parse(storedReviews) as StoredReview[]; } catch { reviews = []; }

  return <main className="dashboard-main"><div className="dashboard-heading"><div><p className="eyebrow">Your design practice</p><h1>Progress,<br />not perfection.</h1></div><Link className="button" href="/review/new">New review <ArrowRight /></Link></div>{reviews.length === 0 ? <div className="dashboard-empty"><div><LayoutDashboard size={38} /><h2>No reviews yet</h2><p>Your dashboard becomes useful after the first critique—no fake charts, no invented progress.</p><Link className="button button-dark" href="/review/new">Review a design <Sparkles /></Link></div></div> : <div className="review-history">{reviews.map((review) => <article className="history-card" key={review.id}><span>{review.category ?? "Design review"}</span><strong>{review.overallScore}<small>/10</small></strong><p>{review.summary}</p><time>{new Date(review.createdAt).toLocaleDateString()}</time></article>)}</div>}</main>;
}
