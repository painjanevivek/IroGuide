import {
  activationRecordIdSchema,
  selfReviewCreateSchema,
  selfReviewDeleteSchema,
  selfReviewPatchSchema,
} from "@/domain/product-activation";
import { activationError, activationJson, authorizeActivationRequest, parseActivationBody } from "@/server/product-activation-api";
import { createSelfReview, deleteSelfReviews, listSelfReviews, patchSelfReview, toPublicActivationRecord } from "@/server/product-activation-storage";

export async function GET(request: Request) {
  const auth = await authorizeActivationRequest(request, "self_reviews_get");
  if ("response" in auth) return auth.response;
  try {
    const id = optionalId(request);
    const records = await listSelfReviews(auth.userId, id);
    return activationJson(auth, { records: records.map(toPublicActivationRecord) });
  } catch (error) {
    return activationError(error, auth, "self_reviews_get");
  }
}

export async function POST(request: Request) {
  const auth = await authorizeActivationRequest(request, "self_reviews_post", true);
  if ("response" in auth) return auth.response;
  try {
    const record = await createSelfReview(auth.userId, await parseActivationBody(request, selfReviewCreateSchema));
    return activationJson(auth, { record: toPublicActivationRecord(record) }, 201);
  } catch (error) {
    return activationError(error, auth, "self_reviews_post");
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeActivationRequest(request, "self_reviews_patch", true);
  if ("response" in auth) return auth.response;
  try {
    const record = await patchSelfReview(auth.userId, await parseActivationBody(request, selfReviewPatchSchema));
    return activationJson(auth, { record: toPublicActivationRecord(record) });
  } catch (error) {
    return activationError(error, auth, "self_reviews_patch");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeActivationRequest(request, "self_reviews_delete", true);
  if ("response" in auth) return auth.response;
  try {
    const input = await parseActivationBody(request, selfReviewDeleteSchema);
    return activationJson(auth, await deleteSelfReviews(auth.userId, "id" in input ? input.id : undefined));
  } catch (error) {
    return activationError(error, auth, "self_reviews_delete");
  }
}

function optionalId(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  return id ? activationRecordIdSchema.parse(id) : undefined;
}
