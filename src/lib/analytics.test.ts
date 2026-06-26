import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  trackEvent,
  trackPageView,
} from "@/lib/analytics";

function createLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };
}

describe("analytics consent", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubGlobal("document", { title: "IroGuide" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps analytics disabled until site data is accepted", () => {
    const localStorage = createLocalStorage();
    const gtag = vi.fn();
    vi.stubGlobal("window", { localStorage, gtag });

    expect(hasAnalyticsConsent()).toBe(false);
    trackPageView("https://iroguide.test/review", "Review");
    trackEvent("review_start_submit");
    expect(gtag).not.toHaveBeenCalled();

    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify({ state: "dismissed" }));

    expect(hasAnalyticsConsent()).toBe(false);
    trackEvent("review_start_submit");
    expect(gtag).not.toHaveBeenCalled();

    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify({ state: "accepted" }));

    expect(hasAnalyticsConsent()).toBe(true);
    trackPageView("https://iroguide.test/review", "Review");
    trackEvent("Review Start Submit", { path: "/review" });
    expect(gtag).toHaveBeenCalledTimes(2);
    expect(gtag).toHaveBeenNthCalledWith(1, "event", "page_view", {
      page_location: "https://iroguide.test/review",
      page_title: "Review",
      send_to: "G-TEST123",
    });
    expect(gtag).toHaveBeenNthCalledWith(2, "event", "review_start_submit", {
      path: "/review",
      send_to: "G-TEST123",
    });
  });
});
