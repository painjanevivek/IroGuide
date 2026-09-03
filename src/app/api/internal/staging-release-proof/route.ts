import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestContext, jsonHeaders, logRequestEvent } from "@/server/observability";
import { isValidStagingProofSecret, runDisposableAccountProof, runPrivilegedReadinessProof, runStorageBoundaryProof, runTokenRevocationProof } from "@/server/staging-release-proof";

const requestSchema = z.object({ action: z.enum(["admin-readiness", "account-journey", "storage-boundary", "token-revocation"]) }).strict();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const context = createRequestContext(request, "api.internal.staging_release_proof.post");
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin || !isValidStagingProofSecret(request.headers.get("x-iroguide-staging-proof-secret"))) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: jsonHeaders(context) });
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length > 1_024) return NextResponse.json({ error: "Request body is too large." }, { status: 413, headers: jsonHeaders(context) });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid staging proof request." }, { status: 400, headers: jsonHeaders(context) });

  try {
    const proofContext = { origin, deploymentProtectionBypass: request.headers.get("x-vercel-protection-bypass") ?? undefined };
    const proof = parsed.data.action === "admin-readiness"
      ? await runPrivilegedReadinessProof(proofContext)
      : parsed.data.action === "account-journey"
        ? await runDisposableAccountProof(proofContext)
        : parsed.data.action === "storage-boundary"
          ? await runStorageBoundaryProof()
          : await runTokenRevocationProof(proofContext);
    logRequestEvent(proof.ok ? "info" : "warn", "staging_release_proof.completed", context, { action: parsed.data.action, ok: proof.ok });
    return NextResponse.json(proof, { status: proof.ok ? 200 : 503, headers: jsonHeaders(context) });
  } catch (error) {
    logRequestEvent("error", "staging_release_proof.failed", context, { action: parsed.data.action, error: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: "The staging proof could not complete." }, { status: 503, headers: jsonHeaders(context) });
  }
}
