import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type AuthTemplateShellProps = {
  children: ReactNode;
  mode: "sign-in" | "sign-up";
};

export function AuthTemplateShell({ children, mode }: AuthTemplateShellProps) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="auth-template">
      <section className="auth-template-hero" aria-label="IroGuide account access">
        <Link href="/" className="wordmark auth-template-brand">
          <span className="wordmark-mark">I</span>
          IroGuide
        </Link>

        <div className="auth-template-copy">
          <p className="eyebrow">
            <Sparkles size={15} />
            {isSignUp ? "Create profile" : "Welcome back"}
          </p>
          <h1>{isSignUp ? "Start a private design critique workspace." : "Return to your critique workspace."}</h1>
          <p>
            Save reviews, drafts, source images, and practical next steps in one signed-in IroGuide account.
          </p>
        </div>

        <div className="auth-preview-card" aria-hidden="true">
          <div className="auth-preview-topline">
            <span>Private review</span>
            <strong>8.4</strong>
          </div>
          <div className="auth-preview-art">
            <span />
            <span />
            <span />
          </div>
          <div className="auth-preview-note">
            <LockKeyhole size={16} />
            <p>Context, critique, and saved progress stay tied to your account.</p>
          </div>
        </div>

        <Link className="auth-template-back" href="/">
          Back to landing <ArrowRight size={15} />
        </Link>
      </section>

      <section className="auth-template-panel">
        <div className="auth-template-card">{children}</div>
      </section>
    </main>
  );
}
