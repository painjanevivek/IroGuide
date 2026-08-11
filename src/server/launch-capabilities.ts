import "server-only";
import { resolveLaunchCapabilities } from "@/domain/launch-capabilities";

export function getServerLaunchCapabilities() {
  return resolveLaunchCapabilities({
    nodeEnv: process.env.NODE_ENV,
    launchProfile: process.env.IROGUIDE_LAUNCH_PROFILE,
  });
}
