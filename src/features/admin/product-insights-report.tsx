"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { requestJsonWithFallback } from "@/lib/api-client";

type Metric = { observed: boolean; status?: "observed" | "not-observed"; total: number };
type Funnel = { denominator: number; numerator: number; rate: number | null; status: "not-observed" | "insufficient-sample" | "measured-zero" | "measured" };
type InsightsReport = {
  collectionMode: "firestore" | "noop";
  environment: string;
  eventCount: number;
  feedback: { responseCount: number; researchConsentCount: number };
  funnels: Record<string, Funnel>;
  from: string;
  generatedAt: string;
  metrics: Record<string, Metric>;
  partial: boolean;
  uniqueAccountCount: number;
};

const metricLabels: Record<string, string> = {
  landingActivation: "Landing to sample",
  onboardingActivation: "Onboarding activation",
  sampleLearning: "Sample learning",
  selfReviewLearning: "Self-review learning",
  briefReadiness: "Brief readiness",
  accessInterest: "Access interest",
  signInCompletion: "Sign-in completion",
  dashboardReturn: "Dashboard return",
  documentationEngagement: "Documentation engagement",
  reviewAvailabilityInterest: "Review availability interest",
  deletionSuccess: "Deletion success",
  caseStudyInterest: "Case-study interest",
};

const funnelLabels: Record<string, string> = { landingToSample: "Landing → sample", signUpToSample: "Sign-up → sample", sampleCompletion: "Sample completion", briefReadiness: "Brief readiness", accessInterest: "Access interest", accessRevocation: "Interest revocation", sevenDayReturn: "Seven-day return" };

export function ProductInsightsReport() {
  const { user } = useAuth();
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const payload = await requestJsonWithFallback({
        path: "/api/admin/insights",
        unavailableMessage: "Product insights are not available right now.",
        failureMessage: "Product insights could not be loaded.",
        init: { headers: { Authorization: `Bearer ${token}` } },
      });
      if (!isReportPayload(payload)) throw new Error("Product insights returned an invalid report.");
      setReport(payload.report);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Product insights could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadReport());
    return () => window.cancelAnimationFrame(frame);
  }, [loadReport]);

  if (loading) {
    return <main className="insights-shell insights-state"><LoaderCircle className="spin" /><h1>Building aggregate report</h1><p>No account-level or creative-content rows are returned.</p></main>;
  }
  if (error || !report) {
    return <main className="insights-shell insights-state is-error"><AlertCircle /><h1>Insights unavailable</h1><p>{error}</p><button className="button button-dark" onClick={() => void loadReport()}><RefreshCw /> Retry</button></main>;
  }

  return (
    <main className="insights-shell">
      <header className="insights-heading">
        <div><p className="eyebrow"><BarChart3 /> Operator aggregate</p><h1>Free-launch evidence.</h1><p>Observed event totals are separated from absent evidence. Zero does not imply a failed journey when collection is disabled.</p></div>
        <button className="button-secondary" onClick={() => void loadReport()}><RefreshCw /> Refresh</button>
      </header>
      <section className="insights-boundary">
        <ShieldCheck />
        <div><strong>{report.collectionMode === "noop" ? "Collection is safely disabled" : `${report.environment} aggregates only`}</strong><span>{report.collectionMode === "noop" ? "The default no-op adapter has not stored product evidence." : `From ${new Date(report.from).toLocaleDateString()} through ${new Date(report.generatedAt).toLocaleString()}.`}</span></div>
      </section>
      <section className="insights-metrics" aria-label="Product evidence metrics">
        {Object.entries(metricLabels).map(([key, label]) => {
          const metric = report.metrics[key] ?? { observed: false, total: 0 };
          return <article key={key} data-observed={metric.observed}><span>{label}</span><strong>{metric.observed ? metric.total : "—"}</strong><p>{metric.observed ? "Observed event total" : "Not observed"}</p></article>;
        })}
      </section>
      <section className="insights-summary">
        <article><span>Accepted events</span><strong>{report.eventCount}</strong></article>
        <article><span>De-identified accounts</span><strong>{report.uniqueAccountCount}</strong></article>
        <article><span>Research responses</span><strong>{report.feedback.responseCount}</strong></article>
        <article><span>Research consent</span><strong>{report.feedback.researchConsentCount}</strong></article>
      </section>
      <section className="insights-funnels" aria-label="Activation funnel evidence">{Object.entries(funnelLabels).map(([key, label]) => { const funnel = report.funnels[key] ?? { denominator: 0, numerator: 0, rate: null, status: "not-observed" }; return <article key={key} data-status={funnel.status}><span>{label}</span><strong>{funnel.rate === null ? "—" : `${Math.round(funnel.rate * 100)}%`}</strong><p>{formatFunnelStatus(funnel)}</p></article>; })}</section>
      {report.partial && <p className="form-error" role="status"><AlertCircle /> This bounded report reached its 5,000-row limit; use a shorter approved reporting window before making decisions.</p>}
    </main>
  );
}

function isReportPayload(value: unknown): value is { report: InsightsReport } {
  if (typeof value !== "object" || value === null || !("report" in value)) return false;
  const report = value.report;
  return typeof report === "object" && report !== null
    && "collectionMode" in report && (report.collectionMode === "noop" || report.collectionMode === "firestore")
    && "metrics" in report && typeof report.metrics === "object" && report.metrics !== null
    && "feedback" in report && typeof report.feedback === "object" && report.feedback !== null
    && "funnels" in report && typeof report.funnels === "object" && report.funnels !== null
    && "eventCount" in report && typeof report.eventCount === "number"
    && "uniqueAccountCount" in report && typeof report.uniqueAccountCount === "number";
}

function formatFunnelStatus(funnel: Funnel) {
  if (funnel.status === "not-observed") return "Not observed";
  if (funnel.status === "insufficient-sample") return `Insufficient sample · ${funnel.numerator}/${funnel.denominator}`;
  if (funnel.status === "measured-zero") return `Measured zero · 0/${funnel.denominator}`;
  return `${funnel.numerator}/${funnel.denominator} de-identified accounts`;
}
