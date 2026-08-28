"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, RefreshCcw, ShieldCheck } from "lucide-react";
import { accessOperationsCandidateSchema, type AccessOperationsCandidate } from "@/domain/access-operations";
import { accessDecisionReasonCodes, accessInterestStatuses, activationRoles } from "@/domain/product-activation";
import { categoryLabels, reviewCategories } from "@/domain/review";
import { useAuth } from "@/features/auth/auth-provider";

type Decision = "approve" | "decline" | "expire" | "revoke";

export function AccessOperationsPanel() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AccessOperationsCandidate[]>([]);
  const [filters, setFilters] = useState({ cohort: "", category: "", age: "", status: "interested" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const response = await fetch(`/api/admin/access-interest?${query}`, { cache: "no-store", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const payload = await response.json() as { error?: unknown; records?: unknown[]; partial?: boolean };
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Access candidates are unavailable.");
      setRecords((payload.records ?? []).map((record) => accessOperationsCandidateSchema.parse(record)));
      if (payload.partial) setMessage("Showing the first 200 bounded candidate records.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Access candidates are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  async function decide(record: AccessOperationsCandidate, decision: Decision) {
    if (!user || busy) return;
    setBusy(record.targetUserId);
    setError("");
    setMessage("");
    const reasonCode = decision === "approve" ? "cohort-fit" : decision === "decline" ? "capacity" : decision === "expire" ? "expired" : "operator-revocation";
    try {
      const response = await fetch("/api/admin/access-interest", { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ schemaVersion: 1, eventId: crypto.randomUUID(), targetUserId: record.targetUserId, expectedRevision: record.revision, decision, reasonCode }) });
      const payload = await response.json() as { error?: unknown };
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The access decision could not be saved.");
      setMessage(`${decisionLabel(decision)} recorded with immutable audit. No email was sent.`);
      await load();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "The access decision could not be saved.");
    } finally {
      setBusy("");
    }
  }

  return <main className="access-operations-main">
    <header className="access-operations-hero"><div><p className="eyebrow">Operator-only access</p><h1>Decide invites without opening the provider gate.</h1><p>Filter categorical interest, record a reasoned decision, and keep every mutation replay-safe and audited. This workflow never sends email.</p></div><ShieldCheck /></header>
    <section className="access-filters" aria-label="Access-interest filters">
      <label><span>Cohort</span><select value={filters.cohort} onChange={(event) => setFilters({ ...filters, cohort: event.target.value })}><option value="">All cohorts</option>{activationRoles.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label><span>Category</span><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{reviewCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
      <label><span>Age</span><select value={filters.age} onChange={(event) => setFilters({ ...filters, age: event.target.value })}><option value="">Any age</option><option value="0-7-days">0–7 days</option><option value="8-30-days">8–30 days</option><option value="31-plus-days">31+ days</option></select></label>
      <label><span>Status</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{accessInterestStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <button type="button" onClick={() => void load()} disabled={loading}><RefreshCcw /> Refresh</button>
    </section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status"><CheckCircle2 /> {message}</p> : null}
    {loading ? <div className="access-operations-loading" aria-busy="true"><LoaderCircle className="spin" /> Loading bounded candidates…</div> : records.length === 0 ? <div className="dashboard-empty"><div><ShieldCheck /><h2>No candidates match.</h2><p>Adjust the categorical filters. No hidden user content is searched.</p></div></div> : <div className="access-candidate-list">{records.map((record) => <article key={record.targetUserId}><div><span>{record.cohort}</span><h2>{record.preferredCategory ? categoryLabels[record.preferredCategory] : "No category"}</h2><p>{record.clientWorkIntent} · {record.contactPermission ? "contact permitted" : "contact revoked"} · revision {record.revision}</p><time dateTime={record.createdAt}>Requested {new Date(record.createdAt).toLocaleDateString()}</time></div><div className="access-decision-actions"><button disabled={Boolean(busy) || !record.contactPermission} type="button" onClick={() => void decide(record, "approve")}>Approve</button><button disabled={Boolean(busy)} type="button" onClick={() => void decide(record, "decline")}>Decline</button><button disabled={Boolean(busy)} type="button" onClick={() => void decide(record, "expire")}>Expire</button><button disabled={Boolean(busy)} type="button" onClick={() => void decide(record, "revoke")}>Revoke</button></div></article>)}</div>}
    <p className="access-reason-contract">Allowed audit reasons: {accessDecisionReasonCodes.join(", ")}.</p>
  </main>;
}

function decisionLabel(decision: Decision) { return decision === "approve" ? "Approval" : decision === "decline" ? "Decline" : decision === "expire" ? "Expiry" : "Revocation"; }
