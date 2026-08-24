import { describe, expect, it } from "vitest";
import { evaluateProviderReservation, getProviderControlStatus } from "./provider-controls";

const approvedCaps = {
  IROGUIDE_PROVIDER_MAX_REVIEWS_PER_ACCOUNT_DAY: "3",
  IROGUIDE_PROVIDER_MAX_COST_PER_REVIEW_MICROS: "250000",
  IROGUIDE_PROVIDER_DAILY_SPEND_CAP_MICROS: "2500000",
  IROGUIDE_PROVIDER_MONTHLY_SPEND_CAP_MICROS: "25000000",
  IROGUIDE_PROVIDER_LEDGER_HMAC_KEY: "k".repeat(32),
};

describe("provider execution controls", () => {
  it("is a ready kill-switched no-op by default", () => {
    expect(getProviderControlStatus({})).toMatchObject({ enabled: false, killSwitch: true, liveEnabled: false, ready: true });
  });

  it("cannot enable live execution without every bounded cap and ledger key", () => {
    expect(getProviderControlStatus({ IROGUIDE_PROVIDER_LIVE_ENABLED: "true", IROGUIDE_PROVIDER_KILL_SWITCH: "off" })).toMatchObject({ enabled: false, ready: false });
    expect(getProviderControlStatus({ ...approvedCaps, IROGUIDE_PROVIDER_LIVE_ENABLED: "true", IROGUIDE_PROVIDER_KILL_SWITCH: "off" })).toMatchObject({ enabled: true, ready: true });
  });

  it("lets either provider or fallback kill switches stop execution independently", () => {
    expect(getProviderControlStatus({ ...approvedCaps, IROGUIDE_PROVIDER_LIVE_ENABLED: "true" }).enabled).toBe(false);
    expect(getProviderControlStatus({ ...approvedCaps, IROGUIDE_PROVIDER_LIVE_ENABLED: "true", IROGUIDE_PROVIDER_KILL_SWITCH: "off" }).fallbackEnabled).toBe(false);
    expect(getProviderControlStatus({ ...approvedCaps, IROGUIDE_PROVIDER_LIVE_ENABLED: "true", IROGUIDE_PROVIDER_KILL_SWITCH: "off", IROGUIDE_PROVIDER_FALLBACK_ENABLED: "true" }).fallbackEnabled).toBe(true);
  });

  it("rejects account, daily, and monthly exhaustion before a provider call", () => {
    const status = getProviderControlStatus({ ...approvedCaps, IROGUIDE_PROVIDER_LIVE_ENABLED: "true", IROGUIDE_PROVIDER_KILL_SWITCH: "off" });
    expect(evaluateProviderReservation({ accountCount: 3, daySpendMicros: 0, monthSpendMicros: 0, status })).toMatch(/account/i);
    expect(evaluateProviderReservation({ accountCount: 0, daySpendMicros: 2_500_000, monthSpendMicros: 0, status })).toMatch(/daily provider/i);
    expect(evaluateProviderReservation({ accountCount: 0, daySpendMicros: 0, monthSpendMicros: 25_000_000, status })).toMatch(/monthly provider/i);
    expect(evaluateProviderReservation({ accountCount: 0, daySpendMicros: 0, monthSpendMicros: 0, status })).toBeNull();
  });
});
