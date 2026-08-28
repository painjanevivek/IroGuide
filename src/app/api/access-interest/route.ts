import { accessInterestCreateSchema, accessInterestRevokeSchema } from "@/domain/product-activation";
import { activationError, activationJson, authorizeActivationRequest, parseActivationBody } from "@/server/product-activation-api";
import { recordAccessInterest, revokeAccessInterest, toPublicActivationRecord } from "@/server/product-activation-storage";

export async function POST(request: Request) {
  const auth = await authorizeActivationRequest(request, "access_interest_post", true);
  if ("response" in auth) return auth.response;
  try {
    const record = await recordAccessInterest(auth.userId, await parseActivationBody(request, accessInterestCreateSchema));
    return activationJson(auth, { record: toPublicActivationRecord(record) }, 201);
  } catch (error) {
    return activationError(error, auth, "access_interest_post");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeActivationRequest(request, "access_interest_delete", true);
  if ("response" in auth) return auth.response;
  try {
    const record = await revokeAccessInterest(auth.userId, await parseActivationBody(request, accessInterestRevokeSchema));
    return activationJson(auth, { record: record ? toPublicActivationRecord(record) : null });
  } catch (error) {
    return activationError(error, auth, "access_interest_delete");
  }
}
