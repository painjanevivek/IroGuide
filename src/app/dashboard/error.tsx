"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import "@/app/route-styles.css";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="dashboard-main"><section className="dashboard-guide is-status" role="alert"><AlertTriangle /><div><p className="eyebrow">Workspace recovery</p><h1>The workspace could not finish rendering.</h1><p>Your account data has not been changed. Retry this view, or use support if the problem continues.</p><div className="guide-error-actions"><button className="button" type="button" onClick={reset}><RotateCcw /> Retry</button><Link className="button-secondary" href="/contact">Contact support</Link></div></div></section></main>;
}
