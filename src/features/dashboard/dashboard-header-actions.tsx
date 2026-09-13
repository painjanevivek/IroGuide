"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { UserMenu } from "@/features/auth/user-menu";
import { useLaunchCapabilities } from "@/features/capabilities/launch-capabilities-provider";

export function DashboardHeaderActions() {
  const { liveCritique } = useLaunchCapabilities();

  return (
    <>
      <UserMenu />
      {!liveCritique && (
        <Link className="text-link desktop-only" href="/learn#practice" prefetch={false}>
          Start learning
        </Link>
      )}
      <Link className="button button-small" href="/review/new" prefetch={false} data-analytics-event="dashboard_new_critique_click">
        New critique <ArrowRight size={17} />
      </Link>
    </>
  );
}
