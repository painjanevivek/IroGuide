import type { Metadata } from "next";
import { EmailAuthPage } from "@/features/auth/email-auth-page";

export const metadata: Metadata = { title: "Manual sign up" };

export default function Page() {
  return <EmailAuthPage mode="sign-up" />;
}
