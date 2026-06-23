import Link from "next/link";
import "@/app/route-styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How IroGuide handles design uploads, critique history, account data, and community sharing.",
};

export default function PrivacyPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <Link href="/">Home</Link>
      </header>
      <main className="policy-main">
        <p className="eyebrow">Privacy</p>
        <h1>Your design work stays under your control.</h1>
        <p>
          IroGuide is built for private design critique. We use your uploaded design, brief, and account session only to
          provide the product features you ask for, such as creating a critique, saving it to your dashboard, or sharing a
          selected critique to the community.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Account details needed for sign in, such as your email, display name, provider, and profile avatar.</li>
          <li>Review context you provide, including design category, audience, purpose, style direction, goals, and concerns.</li>
          <li>Uploaded image bytes while generating a critique. Image bytes are sent to the review API and configured vision provider for analysis.</li>
          <li>Saved critique outputs, checklist items, scores, comments, likes, saves, and community posts you choose to create.</li>
          <li>Operational metadata such as request timing, route names, status codes, and request IDs. Logs must not include uploaded images, briefs, signed tokens, or provider responses.</li>
        </ul>

        <h2>How reviews are handled</h2>
        <p>
          Private critiques are saved to your signed-in account so they can appear in your dashboard. IroGuide does not
          publish private reviews by default. Community sharing is a separate action that requires your explicit choice.
        </p>

        <h2>AI provider use</h2>
        <p>
          When live critique is configured, your uploaded image and brief may be sent to the selected vision provider to
          generate the critique. Provider credentials stay on the server. Do not upload work you are not allowed to share
          with an AI analysis provider.
        </p>

        <h2>Deletion and access</h2>
        <p>
          You can request deletion of account data, saved critiques, and community content through the contact page. Some
          operational logs may remain for security, abuse prevention, or legal reasons, but they should not contain image
          bytes or critique text.
        </p>

        <h2>Security baseline</h2>
        <ul>
          <li>Authentication uses Firebase-supported sign-in methods.</li>
          <li>Server routes verify signed-in sessions before creating or syncing reviews.</li>
          <li>Review API requests are rate limited and logged with request IDs for operational monitoring.</li>
          <li>Server credentials and vision provider keys are stored only in the server environment.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          For privacy, deletion, or account questions, use the <Link href="/contact">contact page</Link>. This privacy
          notice should be reviewed by qualified counsel before broad commercial launch.
        </p>
      </main>
    </div>
  );
}
