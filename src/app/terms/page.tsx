import Link from "next/link";
import "@/app/route-styles.css";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "IroGuide Terms of Service",
  description: "IroGuide service expectations, acceptable use, account responsibilities, and critique limitations.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="simple-page">
      <header className="simple-header">
        <Link href="/" className="wordmark"><span className="wordmark-mark">I</span>IroGuide</Link>
        <Link href="/">Home</Link>
      </header>
      <main className="policy-main">
        <p className="eyebrow">Terms</p>
        <h1>Clear expectations for useful critique.</h1>
        <p>
          IroGuide provides educational design critique and workflow tools. It is not a certification of creative quality,
          legal clearance, accessibility compliance, trademark safety, or client approval.
        </p>

        <h2>Your responsibilities</h2>
        <ul>
          <li>Upload only work you own or have permission to analyze with the service.</li>
          <li>Do not upload confidential client work unless your agreement allows AI-assisted review.</li>
          <li>Review final creative decisions yourself before publishing, selling, or delivering work.</li>
          <li>Keep your account credentials secure and tell us if you believe your account has been compromised.</li>
        </ul>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not use IroGuide to harass, impersonate, exploit, or target people.</li>
          <li>Do not upload illegal content, malware, private personal data, or content you are not allowed to process.</li>
          <li>Do not attempt to bypass authentication, rate limits, moderation, or account protections.</li>
          <li>Community posts must be constructive, relevant to design critique, and respectful of other designers.</li>
        </ul>

        <h2>Ownership and licenses</h2>
        <p>
          You keep ownership of your uploaded designs and review briefs. By using the service, you grant IroGuide the
          limited permission needed to process your uploads, generate critiques, save your requested history, and show
          content you intentionally publish to the community.
        </p>

        <h2>AI critique limits</h2>
        <p>
          AI critique can be useful, but it can miss context, misread visual intent, or make recommendations that do not
          fit your brand, audience, accessibility requirements, or client constraints. Treat critique as guidance, not a
          final authority.
        </p>

        <h2>Accounts, deletion, and availability</h2>
        <p>
          IroGuide may limit, suspend, or remove accounts or content that violates these terms or threatens service
          integrity. Signed-in users can delete account data and saved reviews from the <Link href="/profile">profile page</Link>.
          Features may change as the product evolves. For account support, contact {siteConfig.supportEmail}.
        </p>

        <h2>Bug reports and support</h2>
        <p>
          Product bugs, broken review flows, upload issues, or sync problems can be reported from the <Link href="/contact#bug-report">bug report option</Link>.
          Include the page URL, steps to reproduce, expected result, actual result, and browser details so the issue can be investigated quickly.
        </p>

        <h2>Commercial readiness</h2>
        <p>
          These terms provide a public baseline for early production use. Billing terms, jurisdiction-specific consumer
          notices, and final legal review should be completed before broad paid launch.
        </p>
      </main>
    </div>
  );
}
