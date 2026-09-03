"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivationSaveNotice, type ActivationSaveState } from "@/components/activation-save-notice";
import { ACTIVATION_SCHEMA_VERSION, type AccountExperiencePatch, type ReviewCategory } from "@/domain/product-activation";
import {
  categoryOptions,
  critiqueStyleOptions,
  getCohortWelcome,
  getRecommendedCritiqueStyle,
  getRecommendedSample,
  goalOptions,
  roleOptions,
  type OnboardingGoal,
  type OnboardingRole,
} from "@/domain/onboarding";
import { useAuth } from "@/features/auth/auth-provider";
import { useLaunchCapabilities } from "@/features/capabilities/launch-capabilities-provider";
import { clearGuestSampleProgress, isGuestMergeVerified, readGuestSampleProgress } from "@/lib/guest-sample-progress";
import { AccountExperienceRequestError, loadAccountExperience, saveAccountExperience, type AccountExperienceBundle } from "@/lib/account-experience-client";
import { captureProductEvidence } from "@/lib/product-evidence";

type Mode = "setup" | "edit" | "clear";
type FeedbackMode = "friendly" | "mentor" | "direct";

export function OnboardingFlow() {
  const { user } = useAuth();
  const capabilities = useLaunchCapabilities();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = getMode(searchParams.get("mode"));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const startedEventSent = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [bundle, setBundle] = useState<AccountExperienceBundle | null>(null);
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [categories, setCategories] = useState<ReviewCategory[]>([]);
  const [style, setStyle] = useState<FeedbackMode>("mentor");
  const [saveState, setSaveState] = useState<ActivationSaveState>("saving");
  const [error, setError] = useState("");
  const [cleared, setCleared] = useState(false);

  const hydrate = useCallback((next: AccountExperienceBundle) => {
    setBundle(next);
    setRole(next.experience.primaryRole);
    setGoal(next.experience.primaryGoal);
    setCategories(next.experience.selectedCategories);
    setStyle(next.experience.preferredMode);
    const resumedStep = next.experience.onboardingStatus === "in-progress" || next.experience.onboardingStatus === "skipped"
      ? Math.min(3, next.experience.onboardingStep + 1)
      : 1;
    const requestedStep = Number(new URL(window.location.href).searchParams.get("step"));
    const initialStep = Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 3
      ? requestedStep
      : resumedStep;
    setStep(initialStep);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(initialStep));
    window.history.replaceState({ onboardingStep: initialStep }, "", `${url.pathname}${url.search}`);
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    setError("");
    setSaveState("saving");
    try {
      hydrate(await loadAccountExperience(user));
      setSaveState("idle");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Learning setup could not load.");
      setSaveState(navigator.onLine ? "error" : "offline");
    }
  }, [hydrate, user]);

  useEffect(() => {
    if (!user || !capabilities.guidedLearning) return;
    const controller = new AbortController();
    void loadAccountExperience(user, controller.signal).then((next) => {
      hydrate(next);
      setSaveState("idle");
    }).catch((loadError) => {
      if (controller.signal.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Learning setup could not load.");
      setSaveState(navigator.onLine ? "error" : "offline");
    });
    return () => controller.abort();
  }, [capabilities.guidedLearning, hydrate, user]);

  useEffect(() => {
    if (!user || !bundle || startedEventSent.current || bundle.experience.onboardingStatus === "completed") return;
    startedEventSent.current = true;
    void captureProductEvidence(user, { name: "onboarding_started", source: mode === "edit" ? "profile" : "auth" });
  }, [bundle, mode, user]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [bundle, step]);

  useEffect(() => {
    if (!user || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`iroguide:account-experience:${user.uid}`);
    channel.onmessage = (event) => {
      if (typeof event.data?.revision === "number" && bundle && event.data.revision > bundle.experience.revision) {
        setSaveState("conflict");
      }
    };
    channelRef.current = channel;
    return () => { channel.close(); channelRef.current = null; };
  }, [bundle, user]);

  useEffect(() => {
    const onOffline = () => setSaveState("offline");
    window.addEventListener("offline", onOffline);
    return () => window.removeEventListener("offline", onOffline);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const requested = Number(new URL(window.location.href).searchParams.get("step"));
      if (Number.isInteger(requested) && requested >= 1 && requested <= 3) setStep(requested);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (!capabilities.guidedLearning) {
    return <main className="onboarding-unavailable"><p className="eyebrow">Learning setup</p><h1>Guided learning is not enabled yet.</h1><p>Your existing workspace remains available.</p><Link className="button" href="/dashboard">Return to dashboard</Link></main>;
  }
  if (!user || (!bundle && saveState === "saving")) return <OnboardingLoading />;
  if (!bundle) return <main className="onboarding-unavailable"><h1>We could not load learning setup.</h1>{error && <p role="alert">{error}</p>}<button className="button" type="button" onClick={() => void reload()}>Try again</button></main>;

  const completed = bundle.experience.onboardingStatus === "completed" && mode === "setup";
  if (mode === "clear") return <ClearPreferences bundle={bundle} cleared={cleared} error={error} onCleared={() => setCleared(true)} onError={handleSaveError} user={user} />;
  if (completed) return <OnboardingComplete role={role} onRestart={() => void restart()} />;

  async function persist(input: Omit<AccountExperiencePatch, "schemaVersion" | "expectedRevision" | "mutationId">) {
    if (!user || !bundle) return null;
    setError("");
    setSaveState(navigator.onLine ? "saving" : "offline");
    if (!navigator.onLine) return null;
    const guestProgress = readGuestSampleProgress(window.localStorage);
    try {
      const next = await saveAccountExperience(user, {
        ...input,
        schemaVersion: ACTIVATION_SCHEMA_VERSION,
        expectedRevision: bundle.experience.revision,
        mutationId: crypto.randomUUID(),
        ...(guestProgress ? { guestProgress } : {}),
      });
      setBundle(next);
      setSaveState("saved");
      channelRef.current?.postMessage({ revision: next.experience.revision });
      if (guestProgress) {
        const merged = next.sampleProgress.find((progress) => progress.sampleId === guestProgress.sampleId && progress.sampleVersion === guestProgress.sampleVersion);
        if (merged && isGuestMergeVerified(guestProgress, merged)) clearGuestSampleProgress(window.localStorage);
      }
      return next;
    } catch (saveError) {
      handleSaveError(saveError);
      return null;
    }
  }

  function handleSaveError(saveError: unknown) {
    const conflict = saveError instanceof AccountExperienceRequestError && saveError.status === 409;
    setError(saveError instanceof Error ? saveError.message : "Progress could not be saved.");
    setSaveState(conflict ? "conflict" : navigator.onLine ? "error" : "offline");
  }

  async function continueStep() {
    if (!bundle) return;
    if (step === 1 && !role) { setError("Choose the role that best matches your current work."); return; }
    if (step === 2 && !goal) { setError("Choose one primary learning goal."); return; }
    const keepCompleted = mode === "edit" && bundle.experience.onboardingStatus === "completed";
    const changes = step === 1
      ? { primaryRole: role, preferredMode: getRecommendedCritiqueStyle(role), ...(keepCompleted ? {} : { onboardingStatus: "in-progress" as const, onboardingStep: 1 }) }
      : step === 2
        ? { primaryGoal: goal, selectedCategories: categories, ...(keepCompleted ? {} : { onboardingStatus: "in-progress" as const, onboardingStep: 2 }) }
        : { preferredMode: style, onboardingStatus: "completed" as const, onboardingStep: 3, steps: { "choose-path": { completed: true, completedAt: new Date().toISOString() } } };
    const next = await persist({ action: "update", changes });
    if (!next) return;
    if (step < 3) {
      if (step === 1) setStyle(getRecommendedCritiqueStyle(role));
      moveToStep(step + 1);
      return;
    }
    void captureProductEvidence(user, { name: "onboarding_completed", cohort: role ?? "other", categoryCount: categories.length, mode: style });
    router.replace("/dashboard");
  }

  async function skip() {
    const next = await persist({ action: "update", changes: { onboardingStatus: "skipped", onboardingStep: step - 1 } });
    if (!next) return;
    void captureProductEvidence(user, { name: "onboarding_skipped", atStep: step });
    router.replace("/dashboard");
  }

  async function restart() {
    const next = await persist({ action: "reset-onboarding", changes: {} });
    if (!next) return;
    hydrate(next);
    moveToStep(1);
  }

  function moveToStep(next: number) {
    setError("");
    setStep(next);
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    window.history.pushState({ onboardingStep: next }, "", `${url.pathname}${url.search}`);
  }

  return (
    <main className="onboarding-main">
      <p className="sr-only" aria-live="polite">Step {step} of 3. {stepTitle(step)}</p>
      <header className="onboarding-heading">
        <div><p className="eyebrow">Private learning setup</p><h1 ref={headingRef} tabIndex={-1}>{stepTitle(step)}</h1><p>{stepDescription(step, role)}</p></div>
        <div className="onboarding-progress" aria-label={`Step ${step} of 3`}><span>STEP {step} / 3</span><progress max="3" value={step}>Step {step} of 3</progress></div>
      </header>
      {user.email && !user.emailVerified ? <p className="onboarding-verification" role="status">Your email is not verified yet. Free learning remains available, but live review access will require verification.</p> : null}

      <section className="onboarding-card">
        {step === 1 ? <RoleStep value={role} onChange={setRole} /> : null}
        {step === 2 ? <GoalStep categories={categories} goal={goal} onCategories={setCategories} onGoal={setGoal} /> : null}
        {step === 3 ? <StyleStep recommended={getRecommendedCritiqueStyle(role)} value={style} onChange={setStyle} /> : null}
        {error && <p className="form-error" role="alert">{error}</p>}
        <ActivationSaveNotice state={saveState} onReload={() => void reload()} onRetry={() => void continueStep()} />
        <div className="onboarding-actions">
          <button className="button-secondary" type="button" disabled={step === 1 || saveState === "saving"} onClick={() => moveToStep(step - 1)}><ArrowLeft size={16} /> Back</button>
          <button className="button-quiet" type="button" disabled={saveState === "saving"} onClick={() => void skip()}>Skip for now</button>
          <button className="button button-dark" type="button" disabled={saveState === "saving"} onClick={() => void continueStep()}>{saveState === "saving" ? <><LoaderCircle className="spin" /> Saving…</> : <>{step === 3 ? "Finish setup" : "Save and continue"} <ArrowRight size={16} /></>}</button>
        </div>
      </section>
      <p className="onboarding-privacy">Only these learning preferences are stored. Do not enter employer, client, demographic, biography, or confidential project information.</p>
    </main>
  );
}

function RoleStep({ value, onChange }: { value: OnboardingRole | null; onChange: (value: OnboardingRole) => void }) {
  return <fieldset className="choice-grid"><legend>Choose one role</legend>{roleOptions.map((option) => <label className={value === option.id ? "is-selected" : ""} key={option.id}><input checked={value === option.id} name="role" type="radio" value={option.id} onChange={() => onChange(option.id)} /><span><strong>{option.label}</strong><small>{option.description}</small></span>{value === option.id ? <Check aria-hidden="true" /> : null}</label>)}</fieldset>;
}

function GoalStep({ categories, goal, onCategories, onGoal }: { categories: ReviewCategory[]; goal: OnboardingGoal | null; onCategories: (value: ReviewCategory[]) => void; onGoal: (value: OnboardingGoal) => void }) {
  return <div className="onboarding-stack"><fieldset className="choice-grid choice-grid-compact"><legend>Choose one primary goal</legend>{goalOptions.map((option) => <label className={goal === option.id ? "is-selected" : ""} key={option.id}><input checked={goal === option.id} name="goal" type="radio" value={option.id} onChange={() => onGoal(option.id)} /><span><strong>{option.label}</strong></span></label>)}</fieldset><fieldset className="category-choices"><legend>Preferred categories <span>Optional, up to 5</span></legend>{categoryOptions.map(([id, label]) => { const checked = categories.includes(id); return <label key={id}><input checked={checked} disabled={!checked && categories.length >= 5} type="checkbox" onChange={() => onCategories(checked ? categories.filter((item) => item !== id) : [...categories, id])} /><span>{label}</span></label>; })}</fieldset></div>;
}

function StyleStep({ recommended, value, onChange }: { recommended: FeedbackMode; value: FeedbackMode; onChange: (value: FeedbackMode) => void }) {
  return <fieldset className="choice-grid"><legend>Choose how guidance should sound</legend>{critiqueStyleOptions.map((option) => <label className={value === option.id ? "is-selected" : ""} key={option.id}><input checked={value === option.id} name="style" type="radio" value={option.id} onChange={() => onChange(option.id)} /><span><strong>{option.label}{recommended === option.id ? " · Recommended" : ""}</strong><small>{option.description}</small></span></label>)}</fieldset>;
}

function OnboardingComplete({ role, onRestart }: { role: OnboardingRole | null; onRestart: () => void }) {
  return <main className="onboarding-unavailable"><p className="eyebrow">Setup complete</p><h1>Your learning path is ready.</h1><p>{getCohortWelcome(role)} Start with the recommended {getRecommendedSample(role).replaceAll("-", " ")} example.</p><div className="onboarding-actions"><Link className="button" href="/dashboard">Open workspace</Link><Link className="button-secondary" href="/onboarding?mode=edit">Edit preferences</Link><button className="button-quiet" type="button" onClick={onRestart}><RotateCcw size={16} /> Restart setup</button></div></main>;
}

function ClearPreferences({ bundle, cleared, error, onCleared, onError, user }: { bundle: AccountExperienceBundle; cleared: boolean; error: string; onCleared: () => void; onError: (error: unknown) => void; user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const [busy, setBusy] = useState(false);
  async function clear() { setBusy(true); try { await saveAccountExperience(user, { schemaVersion: 1, expectedRevision: bundle.experience.revision, mutationId: crypto.randomUUID(), action: "clear-onboarding", changes: {} }); onCleared(); } catch (error) { onError(error); } finally { setBusy(false); } }
  if (cleared) return <main className="onboarding-unavailable"><p className="eyebrow">Preferences cleared</p><h1>Your learning setup was removed.</h1><p>You can start again whenever you are ready.</p><Link className="button" href="/dashboard">Return to dashboard</Link></main>;
  return <main className="onboarding-unavailable"><p className="eyebrow">Data control</p><h1>Clear learning preferences?</h1><p>This removes your role, goal, categories, critique style, onboarding state, and dismissed learning hints. It does not delete reviews or your account.</p>{error ? <p className="form-error" role="alert">{error} Your preferences were not changed.</p> : null}<div className="onboarding-actions"><Link className="button-secondary" href="/profile">Cancel</Link><button className="danger-button" type="button" disabled={busy} onClick={() => void clear()}>{busy ? "Clearing…" : <><Trash2 size={16} /> Clear preferences</>}</button></div></main>;
}

function OnboardingLoading() { return <main className="onboarding-unavailable" aria-busy="true"><LoaderCircle className="spin" /><p>Checking your saved learning setup…</p></main>; }
function getMode(value: string | null): Mode { return value === "edit" || value === "clear" ? value : "setup"; }
function stepTitle(step: number) { return step === 1 ? "What kind of designer are you today?" : step === 2 ? "What do you want to improve first?" : "How should guidance speak to you?"; }
function stepDescription(step: number, role: OnboardingRole | null) { return step === 1 ? "This changes recommendations, never the quality or safety standard." : step === 2 ? getCohortWelcome(role) : "You can override the recommendation now or edit it later."; }
