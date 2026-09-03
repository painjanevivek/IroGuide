import { activationRecordIdSchema, designBriefDeleteSchema, designBriefPutSchema } from "@/domain/product-activation";
import { activationError, activationJson, authorizeActivationRequest, parseActivationBody } from "@/server/product-activation-api";
import { deleteDesignBrief, listDesignBriefs, putDesignBrief, toPublicActivationRecord } from "@/server/product-activation-storage";

export async function GET(request: Request) {
  const auth = await authorizeActivationRequest(request, "design_briefs_get");
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(request.url);
    const idValue = url.searchParams.get("id");
    const records = await listDesignBriefs(auth.userId, idValue ? activationRecordIdSchema.parse(idValue) : undefined);
    return activationJson(auth, { records: records.map(toPublicActivationRecord) });
  } catch (error) {
    return activationError(error, auth, "design_briefs_get");
  }
}

export async function PUT(request: Request) {
  const auth = await authorizeActivationRequest(request, "design_briefs_put", true);
  if ("response" in auth) return auth.response;
  try {
    const record = await putDesignBrief(auth.userId, await parseActivationBody(request, designBriefPutSchema));
    return activationJson(auth, { record: toPublicActivationRecord(record) });
  } catch (error) {
    return activationError(error, auth, "design_briefs_put");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeActivationRequest(request, "design_briefs_delete", true);
  if ("response" in auth) return auth.response;
  try {
    const input = await parseActivationBody(request, designBriefDeleteSchema);
    return activationJson(auth, await deleteDesignBrief(auth.userId, input.id));
  } catch (error) {
    return activationError(error, auth, "design_briefs_delete");
  }
}
