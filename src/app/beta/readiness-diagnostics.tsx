"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudCog,
  Database,
  Eye,
  Gauge,
  KeyRound,
  MailCheck,
  RefreshCw,
  ServerCrash,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";

type ReadinessPayload = {
  ok: boolean;
  capabilities: {
    profile: "free" | "full" | "development";
    aiCritique: boolean;
    bugReportEmail: boolean;
    community: boolean;
    sourceImageStorage: boolean;
  };
  checks: {
    accountStorage: boolean;
    bugReportEmail: boolean;
    clientIdentity: boolean;
    firebaseProjectMatch: boolean;
    liveVision: boolean;
    rateLimitAdapter: boolean;
    requestBudgets: boolean;
    sourceImageStorage: boolean;
  };
  operations: {
    communityGate: "closed" | "open";
    deletionFailureMode: "retry-required";
    distributedRateLimitConfigured: boolean;
    rateLimitMode: "deny" | "distributed" | "local";
    requestBodyRoutes: number;
  };
  reviewProvider: {
    activeProvider: string;
    configuredMode: string;
    endpointConfigured: boolean;
    liveReady: boolean;
    openRouterConfigured: boolean;
  };
};

type DiagnosticsState =
  | { status: "loading" }
  | { status: "ready"; payload: ReadinessPayload; httpStatus: number; checkedAt: Date }
  | { status: "restricted" }
  | { status: "error"; message: string; checkedAt: Date | null };

type DiagnosticItem = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  fix: string;
};

const endpointPath = "/api/admin/readiness";

export function ReadinessDiagnostics() {
  const { user } = useAuth();
  const [state, setState] = useState<DiagnosticsState>({ status: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReadiness = useCallback(async () => {
    if (!user) {
      return;
    }
    setIsRefreshing(true);

    try {
      const { payload, httpStatus } = await readReadiness(user);
      setState({
        status: "ready",
        payload,
        httpStatus,
        checkedAt: new Date(),
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "The readiness endpoint could not be reached.",
        checkedAt: new Date(),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const authenticatedUser: { getIdToken: () => Promise<string> } = user;

    let isMounted = true;

    async function loadInitialReadiness() {
      try {
        const { payload, httpStatus } = await readReadiness(authenticatedUser);
        if (!isMounted) return;
        setState({
          status: "ready",
          payload,
          httpStatus,
          checkedAt: new Date(),
        });
      } catch (error) {
        if (!isMounted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "The readiness endpoint could not be reached.",
          checkedAt: new Date(),
        });
      }
    }

    void loadInitialReadiness();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const diagnostics = useMemo(() => {
    if (state.status !== "ready") return null;
    return buildDiagnostics(state.payload);
  }, [state]);

  if (!user || state.status === "restricted") {
    return (
      <section className="diagnostics-shell section-pad" aria-live="polite">
        <div className="diagnostics-error">
          <ShieldCheck />
          <span className="mono-label">OPERATOR ACCESS REQUIRED</span>
          <h2>Deployment details stay private.</h2>
          <p>Public availability is checked without exposing provider, storage, email, or credential-configuration details. Sign in with an authorized project account to inspect them.</p>
        </div>
      </section>
    );
  }

  if (state.status === "loading") {
    return (
      <section className="diagnostics-shell section-pad" aria-live="polite">
        <div className="diagnostics-loading">
          <RefreshCw className="spin" />
          <span className="mono-label">READING {endpointPath}</span>
          <h2>Checking deployment wiring.</h2>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="diagnostics-shell section-pad" aria-live="polite">
        <div className="diagnostics-error">
          <ServerCrash />
          <span className="mono-label">READINESS ENDPOINT UNAVAILABLE</span>
          <h2>Diagnostics could not load.</h2>
          <p>{state.message}</p>
          <button className="button button-dark" type="button" onClick={() => void loadReadiness()} disabled={isRefreshing}>
            Retry check <RefreshCw className={isRefreshing ? "spin" : undefined} />
          </button>
        </div>
      </section>
    );
  }

  if (!diagnostics) return null;

  const { firebaseChecks, supportChecks, liveReviewChecks, operationalChecks, failingChecks, passingCount, totalCount } = diagnostics;
  const readinessLabel = state.payload.ok ? "Ready for launch checks" : "Needs setup";
  const statusIcon = state.payload.ok ? <CheckCircle2 /> : <AlertTriangle />;

  return (
    <section className="diagnostics-shell section-pad" aria-live="polite">
      <div className="diagnostics-topline">
        <div>
          <p className="eyebrow"><CloudCog /> Live deployment diagnostics</p>
          <h2>Readiness from the running environment.</h2>
          <p>
            This panel reads <code>{endpointPath}</code> directly and treats failing readiness responses as setup data,
            so staging and production problems are visible without opening logs first.
          </p>
        </div>
        <button className="button button-dark" type="button" onClick={() => void loadReadiness()} disabled={isRefreshing}>
          Refresh <RefreshCw className={isRefreshing ? "spin" : undefined} />
        </button>
      </div>

      <div className="diagnostics-summary">
        <div className={state.payload.ok ? "diagnostics-meter is-ready" : "diagnostics-meter"}>
          <span className="mono-label">LIVE READINESS</span>
          <strong>{passingCount}<small>/{totalCount}</small></strong>
          <p>{readinessLabel}</p>
          <div aria-hidden="true" style={{ gridTemplateColumns: `repeat(${totalCount}, minmax(8px, 1fr))` }}>
            {Array.from({ length: totalCount }, (_, index) => (
              <i key={index} className={index < passingCount ? "is-lit" : undefined} />
            ))}
          </div>
          <small>HTTP {state.httpStatus} from {endpointPath}</small>
        </div>

        <div className="diagnostics-status">
          <span className={state.payload.ok ? "status-pill is-pass" : "status-pill is-fail"}>
            {statusIcon}{readinessLabel}
          </span>
          <dl>
            <div>
              <dt>Last checked</dt>
              <dd>{formatCheckedAt(state.checkedAt)}</dd>
            </div>
            <div>
              <dt>Active provider</dt>
              <dd>{state.payload.reviewProvider.activeProvider}</dd>
            </div>
            <div>
              <dt>Configured mode</dt>
              <dd>{state.payload.reviewProvider.configuredMode}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="diagnostics-grid">
        <DiagnosticGroup
          title="Firebase checks"
          eyebrow="ACCOUNTS AND STORAGE"
          icon={<Database />}
          checks={firebaseChecks}
        />
        <DiagnosticGroup
          title="Live-review checks"
          eyebrow="VISION PROVIDER"
          icon={<Eye />}
          checks={liveReviewChecks}
        />
        <DiagnosticGroup
          title="Support checks"
          eyebrow="BUG REPORT DELIVERY"
          icon={<MailCheck />}
          checks={supportChecks}
        />
        <DiagnosticGroup
          title="Traffic safety"
          eyebrow="IDENTITY AND BUDGETS"
          icon={<Gauge />}
          checks={operationalChecks}
        />
      </div>

      <div className="diagnostics-details">
        <div>
          <p className="eyebrow"><ShieldCheck /> Environment details</p>
          <dl>
            <div>
              <dt>Firebase project match</dt>
              <dd>{state.payload.checks.firebaseProjectMatch ? "Matched" : "Needs verification"}</dd>
            </div>
            <div>
              <dt>Firebase Admin storage</dt>
              <dd>{state.payload.checks.accountStorage ? "Configured" : "Missing"}</dd>
            </div>
            <div>
              <dt>OpenRouter credential</dt>
              <dd>{state.payload.reviewProvider.openRouterConfigured ? "Configured" : "Missing"}</dd>
            </div>
            <div>
              <dt>Custom review endpoint</dt>
              <dd>{state.payload.reviewProvider.endpointConfigured ? "Configured" : "Missing"}</dd>
            </div>
            <div>
              <dt>Bug report email</dt>
              <dd>{state.payload.checks.bugReportEmail ? "Configured" : "Missing"}</dd>
            </div>
            <div>
              <dt>Rate-limit mode</dt>
              <dd>{state.payload.operations.rateLimitMode}</dd>
            </div>
            <div>
              <dt>Community gate</dt>
              <dd>{state.payload.operations.communityGate}</dd>
            </div>
            <div>
              <dt>Deletion failure state</dt>
              <dd>{state.payload.operations.deletionFailureMode}</dd>
            </div>
          </dl>
        </div>

        <div className="diagnostics-fixes">
          <p className="eyebrow"><KeyRound /> Fastest fix path</p>
          {failingChecks.length > 0 ? (
            <ol>
              {failingChecks.map((check) => (
                <li key={check.id}>
                  <strong>{check.label}</strong>
                  <span>{check.fix}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p>All deployment checks are passing. Run a signed-in review smoke test next to confirm the full save path.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function DiagnosticGroup({
  title,
  eyebrow,
  icon,
  checks,
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  checks: DiagnosticItem[];
}) {
  return (
    <article>
      <header>
        {icon}
        <div>
          <span className="mono-label">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </header>
      {checks.map((check) => (
        <div className={check.passed ? "diagnostic-row is-pass" : "diagnostic-row is-fail"} key={check.id}>
          {check.passed ? <CheckCircle2 /> : <XCircle />}
          <div>
            <strong>{check.label}</strong>
            <p>{check.detail}</p>
            {!check.passed && <small>{check.fix}</small>}
          </div>
        </div>
      ))}
    </article>
  );
}

function buildDiagnostics(payload: ReadinessPayload) {
  const critiqueDisabled = !payload.capabilities.aiCritique;
  const emailDisabled = !payload.capabilities.bugReportEmail;
  const storageDisabled = !payload.capabilities.sourceImageStorage;
  const firebaseChecks: DiagnosticItem[] = [
    {
      id: "account-storage",
      label: "Firebase Admin credentials",
      passed: payload.checks.accountStorage,
      detail: payload.checks.accountStorage
        ? "Server credentials are present for the configured Firebase project."
        : "The API cannot verify signed-in users or persist account review history.",
      fix: "Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON, FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64, or the split FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY variables.",
    },
    {
      id: "firebase-project-match",
      label: "Client and Admin project match",
      passed: payload.checks.firebaseProjectMatch,
      detail: payload.checks.firebaseProjectMatch
        ? "Browser Firebase config and server Admin credentials point at the same project."
        : "Browser Firebase config and server Admin credentials do not appear to point at the same project.",
      fix: "Make NEXT_PUBLIC_FIREBASE_PROJECT_ID match the Firebase Admin service account project, then redeploy the frontend and API together.",
    },
    {
      id: "source-image-storage",
      label: "Private source-image storage",
      passed: storageDisabled || payload.checks.sourceImageStorage,
      detail: storageDisabled
        ? "Source-image cloud storage is intentionally disabled for this launch profile."
        : payload.checks.sourceImageStorage
          ? "A private source-image bucket is configured."
          : "The enabled source-image storage capability has no configured bucket.",
      fix: storageDisabled
        ? "No action is required until the full launch profile is approved."
        : "Configure the Firebase Storage bucket and verify private owner-only rules.",
    },
  ];

  const hasLiveCredential = payload.reviewProvider.openRouterConfigured || payload.reviewProvider.endpointConfigured;
  const liveReviewChecks: DiagnosticItem[] = [
    {
      id: "live-provider",
      label: "Live provider selected",
      passed: critiqueDisabled || payload.reviewProvider.activeProvider === "live",
      detail: critiqueDisabled
        ? "AI critique is intentionally disabled for this launch profile."
        : payload.reviewProvider.activeProvider === "live"
        ? "Live provider is active in " + payload.reviewProvider.configuredMode + " mode."
        : "Current provider is " + payload.reviewProvider.activeProvider + "; production reviews will remain unavailable until live vision is configured.",
      fix: critiqueDisabled ? "No action is required until the full launch profile is approved." : "Set IROGUIDE_REVIEW_PROVIDER to openrouter, vision, live, or endpoint, or provide OPENROUTER_API_KEY so auto mode selects live review.",
    },
    {
      id: "live-credential",
      label: "Live review credential",
      passed: critiqueDisabled || hasLiveCredential,
      detail: critiqueDisabled
        ? "Paid review credentials are not required in the free launch profile."
        : hasLiveCredential
        ? getLiveCredentialDetail(payload)
        : "No OpenRouter API key or custom vision endpoint is configured.",
      fix: critiqueDisabled ? "No action is required until the full launch profile is approved." : "Set OPENROUTER_API_KEY for OpenRouter or IROGUIDE_VISION_REVIEW_ENDPOINT for a compatible review service.",
    },
    {
      id: "live-vision",
      label: "Live vision readiness",
      passed: critiqueDisabled || payload.checks.liveVision,
      detail: critiqueDisabled
        ? "Live vision is intentionally disabled for this launch profile."
        : payload.checks.liveVision
        ? "Live pixel analysis is ready with the configured provider."
        : "The review route is not ready to analyze uploaded pixels in this environment.",
      fix: critiqueDisabled ? "No action is required until the full launch profile is approved." : "Confirm the live provider mode and credential variables are present in the deployed server environment, then redeploy.",
    },
  ];

  const supportChecks: DiagnosticItem[] = [
    {
      id: "bug-report-email",
      label: "Bug report email delivery",
      passed: emailDisabled || payload.checks.bugReportEmail,
      detail: emailDisabled
        ? "Bug report email is intentionally disabled; reports remain stored in Firestore."
        : payload.checks.bugReportEmail
        ? "Bug report notification email is configured for the contact form."
        : "Bug reports can be stored, but email delivery to the developer inbox is not configured.",
      fix: emailDisabled ? "No action is required until the full launch profile is approved." : "Set RESEND_API_KEY, BUG_REPORT_TO_EMAIL, and BUG_REPORT_FROM_EMAIL in the server environment, then redeploy.",
    },
  ];

  const operationalChecks: DiagnosticItem[] = [
    {
      id: "client-identity",
      label: "Trusted client identity",
      passed: payload.checks.clientIdentity,
      detail: payload.checks.clientIdentity
        ? "Security-sensitive rate limits use a platform-trusted client identity."
        : "This production runtime has no trusted client identity adapter.",
      fix: "Run on Vercel or configure IROGUIDE_TRUST_PROXY and an approved proxy header before accepting production traffic.",
    },
    {
      id: "rate-limit-adapter",
      label: "Rate-limit adapter",
      passed: payload.checks.rateLimitAdapter,
      detail: payload.checks.rateLimitAdapter
        ? `Traffic protection is operating in ${payload.operations.rateLimitMode} mode.`
        : "Production traffic is denied because the distributed limiter is unavailable.",
      fix: "Configure valid UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN values, then verify the readiness endpoint before launch.",
    },
    {
      id: "request-budgets",
      label: "Request-body budgets",
      passed: payload.checks.requestBudgets,
      detail: payload.checks.requestBudgets
        ? `${payload.operations.requestBodyRoutes} request categories have explicit byte budgets.`
        : "One or more request-body budgets are invalid.",
      fix: "Restore positive, finite limits in REQUEST_BODY_LIMITS and run the bounded-body adversarial tests.",
    },
  ];

  const allChecks = [...firebaseChecks, ...liveReviewChecks, ...supportChecks, ...operationalChecks];

  return {
    firebaseChecks,
    supportChecks,
    liveReviewChecks,
    operationalChecks,
    failingChecks: allChecks.filter((check) => !check.passed),
    passingCount: allChecks.filter((check) => check.passed).length,
    totalCount: allChecks.length,
  };
}

function getLiveCredentialDetail(payload: ReadinessPayload) {
  if (payload.reviewProvider.openRouterConfigured && payload.reviewProvider.endpointConfigured) {
    return "OpenRouter and a custom endpoint are both configured; selected provider mode decides which one handles reviews.";
  }

  if (payload.reviewProvider.endpointConfigured) {
    return "Custom vision review endpoint is configured.";
  }

  return "OpenRouter credential is configured.";
}

async function readReadiness(user: { getIdToken: () => Promise<string> }) {
  const response = await fetch(endpointPath, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
  });
  const payload = await response.json() as unknown;

  if (!isReadinessPayload(payload)) {
    throw new Error("The readiness endpoint returned an unexpected payload.");
  }

  return {
    payload,
    httpStatus: response.status,
  };
}

function formatCheckedAt(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function isReadinessPayload(value: unknown): value is ReadinessPayload {
  if (!isRecord(value) || !isRecord(value.capabilities) || !isRecord(value.checks) || !isRecord(value.reviewProvider)) {
    return false;
  }

  return typeof value.ok === "boolean"
    && (value.capabilities.profile === "free" || value.capabilities.profile === "full" || value.capabilities.profile === "development")
    && typeof value.capabilities.aiCritique === "boolean"
    && typeof value.capabilities.bugReportEmail === "boolean"
    && typeof value.capabilities.community === "boolean"
    && typeof value.capabilities.guidedLearning === "boolean"
    && typeof value.capabilities.sourceImageStorage === "boolean"
    && typeof value.checks.accountStorage === "boolean"
    && typeof value.checks.bugReportEmail === "boolean"
    && typeof value.checks.clientIdentity === "boolean"
    && typeof value.checks.firebaseProjectMatch === "boolean"
    && typeof value.checks.liveVision === "boolean"
    && typeof value.checks.rateLimitAdapter === "boolean"
    && typeof value.checks.requestBudgets === "boolean"
    && typeof value.checks.sourceImageStorage === "boolean"
    && isRecord(value.operations)
    && (value.operations.communityGate === "closed" || value.operations.communityGate === "open")
    && value.operations.deletionFailureMode === "retry-required"
    && typeof value.operations.distributedRateLimitConfigured === "boolean"
    && (value.operations.rateLimitMode === "deny" || value.operations.rateLimitMode === "distributed" || value.operations.rateLimitMode === "local")
    && typeof value.operations.requestBodyRoutes === "number"
    && typeof value.reviewProvider.activeProvider === "string"
    && typeof value.reviewProvider.configuredMode === "string"
    && typeof value.reviewProvider.endpointConfigured === "boolean"
    && typeof value.reviewProvider.liveReady === "boolean"
    && typeof value.reviewProvider.openRouterConfigured === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
