"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLaunchCapabilities } from "./launch-capabilities-provider";

export function ReviewLaunchLink({
  className,
  disabledLabel = "Review availability",
  enabledLabel,
  eventName,
}: {
  className?: string;
  disabledLabel?: string;
  enabledLabel: string;
  eventName?: string;
}) {
  const { aiCritique } = useLaunchCapabilities();
  const label = aiCritique ? enabledLabel : disabledLabel;

  return (
    <Link
      className={className}
      href="/review/new"
      prefetch={false}
      {...(eventName ? { "data-analytics-event": eventName } : {})}
    >
      {label} <ArrowRight size={17} />
    </Link>
  );
}
