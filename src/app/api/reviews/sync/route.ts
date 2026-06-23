import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { storedReviewDocumentSchema } from "@/domain/review-storage";
import { FirebaseAdminUnavailableError, FirebaseTokenVerificationError, verifyFirebaseIdToken } from "@/server/firebase-admin";
import { syncReviewDocumentsForUser } from "@/server/review-storage";

const syncRequestSchema = z.object({
  documents: z.array(storedReviewDocumentSchema).max(30),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in again before syncing reviews." }, { status: 401 });
  }

  try {
    const decodedToken = await verifyFirebaseIdToken(authorization.slice("Bearer ".length).trim());
    const body: unknown = await request.json();
    const parsed = syncRequestSchema.parse(body);
    const result = await syncReviewDocumentsForUser(decodedToken.uid, parsed.documents);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof FirebaseTokenVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Review sync details are incomplete or invalid.", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Review sync failed. Please try again." }, { status: 500 });
  }
}
