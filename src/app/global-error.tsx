"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="route-state-shell" role="alert">
          <p>Something interrupted IroGuide.</p>
          <h1>The application could not finish loading.</h1>
          <p>Retry once. If the problem continues, return later; no new design review has been submitted from this screen.</p>
          <button type="button" onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}
