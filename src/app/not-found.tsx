import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="route-state-shell">
      <Compass aria-hidden="true" />
      <p className="eyebrow">404 / Page not found</p>
      <h1>This path does not lead anywhere yet.</h1>
      <p>The page may have moved, remained gated, or never existed. Return to the free example critique and keep learning.</p>
      <Link className="button button-dark" href="/#critique-preview">Explore the example critique <ArrowRight size={17} /></Link>
    </main>
  );
}
