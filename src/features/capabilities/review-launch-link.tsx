"use client";

import type { Route } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLaunchCapabilities } from "./launch-capabilities-provider";

export function ReviewLaunchLink({
  className,
  disabledHref = "/#critique-preview",
  disabledLabel = "Explore example critique",
  enabledLabel,
  eventName,
}: {
  className?: string;
  disabledHref?: Route;
  disabledLabel?: string;
  enabledLabel: string;
  eventName?: string;
}) {
  const { liveCritique } = useLaunchCapabilities();
  const label = liveCritique ? enabledLabel : disabledLabel;

  return (
    <Link
      className={className}
      href={liveCritique ? "/review/new" : disabledHref}
      prefetch={false}
      {...(eventName ? { "data-analytics-event": eventName } : {})}
    >
      {label} <ArrowRight size={17} />
    </Link>
  );
}
