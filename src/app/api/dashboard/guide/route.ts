import { activationError, activationJson, authorizeActivationRequest } from "@/server/product-activation-api";
import { getDashboardGuide } from "@/server/dashboard-guide";

export async function GET(request: Request) {
  const auth = await authorizeActivationRequest(request, "dashboard_guide_get");
  if ("response" in auth) return auth.response;
  try {
    return activationJson(auth, await getDashboardGuide(auth.userId));
  } catch (error) {
    return activationError(error, auth, "dashboard_guide_get");
  }
}
