import {
  accountExperiencePatchSchema,
  activationDeleteSchema,
} from "@/domain/product-activation";
import {
  activationError,
  activationJson,
  authorizeActivationRequest,
  parseActivationBody,
} from "@/server/product-activation-api";
import {
  clearLearningHistory,
  getAccountExperienceBundle,
  patchAccountExperience,
  toPublicActivationRecord,
} from "@/server/product-activation-storage";

export async function GET(request: Request) {
  const auth = await authorizeActivationRequest(request, "experience_get");
  if ("response" in auth) return auth.response;
  try {
    const bundle = await getAccountExperienceBundle(auth.userId);
    return activationJson(auth, publicBundle(bundle));
  } catch (error) {
    return activationError(error, auth, "experience_get");
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeActivationRequest(request, "experience_patch", true);
  if ("response" in auth) return auth.response;
  try {
    const input = await parseActivationBody(request, accountExperiencePatchSchema);
    const bundle = await patchAccountExperience(auth.userId, input);
    return activationJson(auth, publicBundle(bundle));
  } catch (error) {
    return activationError(error, auth, "experience_patch");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeActivationRequest(request, "experience_delete", true);
  if ("response" in auth) return auth.response;
  try {
    await parseActivationBody(request, activationDeleteSchema);
    return activationJson(auth, { deleted: true, ...(await clearLearningHistory(auth.userId)) });
  } catch (error) {
    return activationError(error, auth, "experience_delete");
  }
}

function publicBundle(bundle: Awaited<ReturnType<typeof getAccountExperienceBundle>>) {
  return {
    experience: toPublicActivationRecord(bundle.experience),
    sampleProgress: bundle.sampleProgress.map(toPublicActivationRecord),
    accessInterest: bundle.accessInterest ? toPublicActivationRecord(bundle.accessInterest) : null,
  };
}
