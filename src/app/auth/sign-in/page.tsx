import type { Metadata } from "next";
import "@/app/route-styles.css";
import { EmailAuthPage } from "@/features/auth/email-auth-page";

export const metadata: Metadata = {
  title: "Manual sign in",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function Page() {
  return <EmailAuthPage mode="sign-in" />;
}
