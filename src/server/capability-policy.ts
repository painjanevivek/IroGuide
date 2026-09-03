import { NextResponse } from "next/server";
import type { ProductCapability } from "@/domain/launch-capabilities";
import { getServerLaunchCapabilities } from "./launch-capabilities";
import { jsonHeaders, logRequestEvent, type RequestContext } from "./observability";

export function enforceCapabilityBeforeEffects({
  capability,
  context,
  eventPrefix,
  message,
}: {
  capability: ProductCapability;
  context: RequestContext;
  eventPrefix: string;
  message: string;
}) {
  const capabilities = getServerLaunchCapabilities();
  if (capabilities[capability]) return { allowed: true as const, capabilities };

  logRequestEvent("info", `${eventPrefix}.capability_closed`, context, {
    capability,
    profile: capabilities.profile,
  });
  return {
    allowed: false as const,
    capabilities,
    response: NextResponse.json({ error: message }, {
      status: 404,
      headers: jsonHeaders(context),
    }),
  };
}
