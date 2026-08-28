"use client";

import Link from "next/link";
import { BookOpenCheck, ClipboardCheck, FilePenLine, LoaderCircle, RotateCcw, TicketCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-provider";
import { useLaunchCapabilities } from "@/features/capabilities/launch-capabilities-provider";
import { loadAccountExperience, type AccountExperienceBundle } from "@/lib/account-experience-client";
import { SamplePractice } from "./sample-practice";
import { SelfReviewTool } from "./self-review-tool";
import { BriefBuilder } from "./brief-builder";
import { AccessInterestTool } from "./access-interest-tool";
import { LearningHistoryControls } from "./learning-history-controls";

type Tool = "sample" | "self-review" | "brief" | "access" | "data";
const tools = [
  { id: "sample", label: "Sample exercise", icon: BookOpenCheck },
  { id: "self-review", label: "Self-review", icon: ClipboardCheck },
  { id: "brief", label: "Brief builder", icon: FilePenLine },
  { id: "access", label: "Review access", icon: TicketCheck },
  { id: "data", label: "History controls", icon: RotateCcw },
] as const;

export function LearningStudio() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { guidedLearning } = useLaunchCapabilities();
  const [activeTool, setActiveTool] = useState<Tool>(() => toTool(searchParams.get("tool")));
  const [bundle, setBundle] = useState<AccountExperienceBundle | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !guidedLearning) return;
    const controller = new AbortController();
    void loadAccountExperience(user, controller.signal).then((next) => {
      setBundle(next);
      setError("");
    }).catch((loadError) => {
      if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Saved learning progress could not load.");
    });
    return () => controller.abort();
  }, [guidedLearning, user]);

  const loading = Boolean(user && guidedLearning && !bundle && !error);

  if (!guidedLearning) {
    return <div className="learning-unavailable"><strong>Account learning tools are not enabled in this environment.</strong><p>The complete public example above remains available.</p></div>;
  }

  return (
    <div className="learning-studio">
      <nav aria-label="Learning tools" className="learning-tool-tabs">
        {tools.map(({ id, label, icon: Icon }) => <button aria-current={activeTool === id ? "page" : undefined} disabled={!user && id !== "sample"} key={id} type="button" onClick={() => setActiveTool(id)}><Icon /><span>{label}</span></button>)}
      </nav>

      {authLoading || loading ? <div className="learning-tool-loading" aria-busy="true"><LoaderCircle className="spin" /><p>Loading your private learning path…</p></div> : null}
      {error ? <div className="learning-inline-error" role="alert"><strong>Saved progress is unavailable.</strong><p>{error}</p></div> : null}

      {!authLoading && !user && activeTool === "sample" ? <div className="learning-guest-note"><p><strong>Guest practice:</strong> progress remains only on this device for up to seven days.</p><Link href="/auth/sign-up?next=%2Flearn%23practice">Create a workspace to keep it <span aria-hidden="true">→</span></Link></div> : null}
      {!authLoading && !user && activeTool !== "sample" ? <div className="learning-unavailable"><strong>Sign in to save this private tool.</strong><Link className="button" href="/auth/sign-in?next=%2Flearn%23practice">Sign in</Link></div> : null}

      {!authLoading && activeTool === "sample" ? <SamplePractice bundle={bundle} onBundle={setBundle} user={user} /> : null}
      {user && activeTool === "self-review" ? <SelfReviewTool user={user} /> : null}
      {user && activeTool === "brief" ? <BriefBuilder user={user} /> : null}
      {user && activeTool === "access" ? <AccessInterestTool bundle={bundle} onBundle={setBundle} user={user} /> : null}
      {user && activeTool === "data" ? <LearningHistoryControls onCleared={() => setBundle(null)} user={user} /> : null}
    </div>
  );
}

function toTool(value: string | null): Tool {
  return tools.some((tool) => tool.id === value) ? value as Tool : "sample";
}
