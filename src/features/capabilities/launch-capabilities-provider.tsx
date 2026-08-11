"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LaunchCapabilities } from "@/domain/launch-capabilities";

const LaunchCapabilitiesContext = createContext<LaunchCapabilities | null>(null);

export function LaunchCapabilitiesProvider({
  capabilities,
  children,
}: {
  capabilities: LaunchCapabilities;
  children: ReactNode;
}) {
  return (
    <LaunchCapabilitiesContext.Provider value={capabilities}>
      {children}
    </LaunchCapabilitiesContext.Provider>
  );
}

export function useLaunchCapabilities() {
  const capabilities = useContext(LaunchCapabilitiesContext);
  if (!capabilities) {
    throw new Error("LaunchCapabilitiesProvider is missing from the application root.");
  }
  return capabilities;
}
