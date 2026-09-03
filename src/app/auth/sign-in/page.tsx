import type { Metadata } from "next";
import "@/app/route-styles.css";
import { EmailAuthPage } from "@/features/auth/email-auth-page";
import { getSafeAuthReturnPath } from "@/domain/auth-return";

export const metadata: Metadata = {
  title: "Manual sign in",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = (await searchParams).next;
  return <EmailAuthPage mode="sign-in" nextPath={getSafeAuthReturnPath(typeof next === "string" ? next : null)} />;
}
