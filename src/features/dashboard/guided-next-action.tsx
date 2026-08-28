import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ArrowRight, Check, Clock3, LockKeyhole, RotateCcw, WifiOff } from "lucide-react";
import type { DashboardGuide } from "@/domain/dashboard-guide";

type Props = {
  error: string;
  guide: DashboardGuide | null;
  loading: boolean;
  offline: boolean;
  onRetry: () => void;
  status: number | null;
};

export function GuidedNextAction({ error, guide, loading, offline, onRetry, status }: Props) {
  if (loading && !guide) {
    return <section className="dashboard-guide is-loading" aria-busy="true" aria-label="Loading your next step"><div className="guide-copy"><span className="guide-skeleton guide-skeleton-short" /><span className="guide-skeleton guide-skeleton-title" /><span className="guide-skeleton" /></div><div className="guide-checklist" aria-hidden="true">{[1, 2, 3, 4].map((item) => <span className="guide-skeleton" key={item} />)}</div></section>;
  }

  if (!guide) {
    const locked = status === 423;
    return <section className={`dashboard-guide is-status${locked ? " is-locked" : ""}`} role="alert"><div className="guide-status-icon">{offline ? <WifiOff /> : locked ? <LockKeyhole /> : <AlertTriangle />}</div><div><p className="eyebrow">{offline ? "Offline" : locked ? "Account action in progress" : "Guide unavailable"}</p><h2>{offline ? "Your saved history remains readable." : locked ? "Your account is temporarily locked." : "Your next step could not load."}</h2><p>{error || "Try the guide again. Your cached review history and data controls remain available."}</p><button className="button-secondary" type="button" onClick={onRetry}><RotateCcw /> Retry guide</button></div></section>;
  }

  return <section className="dashboard-guide" aria-labelledby="dashboard-next-action">
    <div className="guide-copy">
      <div className="guide-availability"><span>Available now</span><small>{guide.completionCount} of 4 foundation steps</small></div>
      <p className="eyebrow">{guide.nextAction.eyebrow}</p>
      <h2 id="dashboard-next-action">{guide.nextAction.title}</h2>
      <p>{guide.nextAction.description}</p>
      <div className="guide-action-row"><Link className="button" href={guide.nextAction.href as Route}><span>{guide.nextAction.label}</span><ArrowRight /></Link><span><strong>Creates:</strong> {guide.nextAction.artifact}</span></div>
      {offline || error ? <div className="guide-inline-status" role="status">{offline ? <WifiOff /> : <AlertTriangle />}<span>{offline ? "Offline—showing the last loaded guide and local history." : "The guide could not refresh; showing the last loaded version."}</span></div> : null}
    </div>
    <div className="guide-progress">
      <ol className="guide-checklist">
        {guide.checklist.map((item, index) => <li className={item.completed ? "is-complete" : ""} key={item.id}><span>{item.completed ? <Check /> : index + 1}</span><div><Link href={item.href as Route}>{item.label}</Link><small>{item.outcome}</small></div></li>)}
      </ol>
      {guide.recentActivity.length > 0 ? <div className="guide-activity"><strong>Recent learning activity</strong><ul>{guide.recentActivity.slice(0, 3).map((item) => <li key={item.id}><Clock3 /><span>{item.label}{item.category ? ` · ${item.category}` : ""}</span><time dateTime={item.at}>{new Date(item.at).toLocaleDateString()}</time></li>)}</ul></div> : null}
    </div>
  </section>;
}
