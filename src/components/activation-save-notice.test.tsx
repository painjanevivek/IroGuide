import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivationSaveNotice } from "./activation-save-notice";

describe("ActivationSaveNotice", () => {
  it("announces conflicts urgently and exposes a recovery action", () => {
    const markup = renderToStaticMarkup(<ActivationSaveNotice state="conflict" onReload={() => undefined} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Reload latest progress");
  });

  it("retains work and offers retry language for recoverable failures", () => {
    const markup = renderToStaticMarkup(<ActivationSaveNotice state="error" onRetry={() => undefined} />);
    expect(markup).toContain("current answers remain");
    expect(markup).toContain("Try saving again");
  });
});
