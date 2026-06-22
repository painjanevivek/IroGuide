import type { Metadata } from "next";
import { EmailAuthPage } from "@/features/auth/email-auth-page";

export const metadata: Metadata = { title: "Manual sign in" };

export default function Page() {
  return <EmailAuthPage mode="sign-in" />;
}
