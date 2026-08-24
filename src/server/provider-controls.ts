import "server-only";

import { createHmac } from "node:crypto";
import { getFirebaseAdminFirestore } from "./firebase-admin";

const PROVIDER_USAGE_RESERVATIONS = "providerUsageReservations";
const PROVIDER_USAGE_AGGREGATES = "providerUsageAggregates";

export class ProviderControlError extends Error {
  constructor(message: string, readonly failureClass: "policy" | "rate-limit") {
    super(message);
    this.name = "ProviderControlError";
  }
}

export function getProviderControlStatus(env: Readonly<Record<string, string | undefined>> = process.env) {
  const liveEnabled = env.IROGUIDE_PROVIDER_LIVE_ENABLED?.trim().toLowerCase() === "true";
  const killSwitch = env.IROGUIDE_PROVIDER_KILL_SWITCH?.trim().toLowerCase() !== "off";
  const fallbackEnabled = env.IROGUIDE_PROVIDER_FALLBACK_ENABLED?.trim().toLowerCase() === "true";
  const values = {
    maxReviewsPerAccountDay: parsePositiveInteger(env.IROGUIDE_PROVIDER_MAX_REVIEWS_PER_ACCOUNT_DAY),
    maxCostPerReviewMicros: parsePositiveInteger(env.IROGUIDE_PROVIDER_MAX_COST_PER_REVIEW_MICROS),
    dailySpendCapMicros: parsePositiveInteger(env.IROGUIDE_PROVIDER_DAILY_SPEND_CAP_MICROS),
    monthlySpendCapMicros: parsePositiveInteger(env.IROGUIDE_PROVIDER_MONTHLY_SPEND_CAP_MICROS),
  };
  const ledgerKeyConfigured = (env.IROGUIDE_PROVIDER_LEDGER_HMAC_KEY?.trim().length ?? 0) >= 32;
  const capsConfigured = Object.values(values).every((value) => value !== null)
    && values.dailySpendCapMicros! >= values.maxCostPerReviewMicros!
    && values.monthlySpendCapMicros! >= values.dailySpendCapMicros!;
  return {
    capsConfigured,
    enabled: liveEnabled && !killSwitch && capsConfigured && ledgerKeyConfigured,
    fallbackEnabled: liveEnabled && !killSwitch && fallbackEnabled,
    killSwitch,
    ledgerKeyConfigured,
    liveEnabled,
    ready: !liveEnabled || (!killSwitch && capsConfigured && ledgerKeyConfigured),
    ...values,
  } as const;
}

export async function reserveProviderUsage({
  reservationKey,
  userId,
  now = new Date(),
}: {
  reservationKey: string;
  userId: string;
  now?: Date;
}) {
  const status = getProviderControlStatus();
  if (!status.enabled || status.maxCostPerReviewMicros === null || status.maxReviewsPerAccountDay === null
    || status.dailySpendCapMicros === null || status.monthlySpendCapMicros === null) {
    throw new ProviderControlError("Live review execution is disabled by provider controls.", "policy");
  }
  const reservedMicros = status.maxCostPerReviewMicros;
  const key = process.env.IROGUIDE_PROVIDER_LEDGER_HMAC_KEY!.trim();
  const accountHash = hmac(key, userId);
  const reservationId = hmac(key, `${userId}\0${reservationKey}`);
  const day = now.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const db = await getFirebaseAdminFirestore();
  const reservationRef = db.collection(PROVIDER_USAGE_RESERVATIONS).doc(reservationId);
  const accountRef = db.collection(PROVIDER_USAGE_AGGREGATES).doc(`account_${day}_${accountHash}`);
  const dayRef = db.collection(PROVIDER_USAGE_AGGREGATES).doc(`day_${day}`);
  const monthRef = db.collection(PROVIDER_USAGE_AGGREGATES).doc(`month_${month}`);
  return db.runTransaction(async (transaction) => {
    const [reservationSnapshot, accountSnapshot, daySnapshot, monthSnapshot] = await Promise.all([
      transaction.get(reservationRef),
      transaction.get(accountRef),
      transaction.get(dayRef),
      transaction.get(monthRef),
    ]);
    if (reservationSnapshot.exists) return parseReservation(reservationSnapshot.data());
    const accountCount = getNonNegativeInteger(accountSnapshot.data()?.reviewCount);
    const daySpend = getAggregateSpend(daySnapshot.data());
    const monthSpend = getAggregateSpend(monthSnapshot.data());
    const rejection = evaluateProviderReservation({ accountCount, daySpendMicros: daySpend, monthSpendMicros: monthSpend, status });
    if (rejection) throw new ProviderControlError(rejection, "rate-limit");
    const createdAt = now.toISOString();
    const reservation = {
      schemaVersion: 1 as const,
      id: reservationId,
      userId,
      accountHash,
      day,
      month,
      reservedMicros,
      committedMicros: 0,
      state: "reserved" as const,
      createdAt,
      updatedAt: createdAt,
    };
    transaction.create(reservationRef, reservation);
    transaction.set(accountRef, { schemaVersion: 1, kind: "account-day", userId, day, reviewCount: accountCount + 1, updatedAt: createdAt }, { merge: true });
    transaction.set(dayRef, addReservation(daySnapshot.data(), reservedMicros, createdAt, "day", day));
    transaction.set(monthRef, addReservation(monthSnapshot.data(), reservedMicros, createdAt, "month", month));
    return reservation;
  });
}

export function evaluateProviderReservation({
  accountCount,
  daySpendMicros,
  monthSpendMicros,
  status,
}: {
  accountCount: number;
  daySpendMicros: number;
  monthSpendMicros: number;
  status: ReturnType<typeof getProviderControlStatus>;
}) {
  if (!status.enabled || status.maxCostPerReviewMicros === null || status.maxReviewsPerAccountDay === null
    || status.dailySpendCapMicros === null || status.monthlySpendCapMicros === null) return "Live provider controls are not fully enabled.";
  if (accountCount >= status.maxReviewsPerAccountDay) return "Daily account review quota is exhausted.";
  if (daySpendMicros + status.maxCostPerReviewMicros > status.dailySpendCapMicros) return "Daily provider spend cap is exhausted.";
  if (monthSpendMicros + status.maxCostPerReviewMicros > status.monthlySpendCapMicros) return "Monthly provider spend cap is exhausted.";
  return null;
}

export async function commitProviderUsage(
  reservation: ProviderUsageReservation,
  result: {
    costMicros: number | null;
    fallbackUsed: boolean;
    latencyMs: number;
    outcome: "completed" | "failed" | "invalid-output";
  },
  now = new Date(),
) {
  const db = await getFirebaseAdminFirestore();
  const reservationRef = db.collection(PROVIDER_USAGE_RESERVATIONS).doc(reservation.id);
  const dayRef = db.collection(PROVIDER_USAGE_AGGREGATES).doc(`day_${reservation.day}`);
  const monthRef = db.collection(PROVIDER_USAGE_AGGREGATES).doc(`month_${reservation.month}`);
  return db.runTransaction(async (transaction) => {
    const [reservationSnapshot, daySnapshot, monthSnapshot] = await Promise.all([
      transaction.get(reservationRef),
      transaction.get(dayRef),
      transaction.get(monthRef),
    ]);
    const current = parseReservation(reservationSnapshot.data());
    if (current.state === "committed") return current;
    const committedMicros = result.costMicros === null
      ? current.reservedMicros
      : Math.max(0, Math.min(current.reservedMicros, Math.ceil(result.costMicros)));
    const updatedAt = now.toISOString();
    transaction.update(reservationRef, {
      state: "committed",
      committedMicros,
      fallbackUsed: result.fallbackUsed,
      latencyMs: Math.max(0, Math.min(300_000, Math.trunc(result.latencyMs))),
      outcome: result.outcome,
      updatedAt,
    });
    transaction.set(dayRef, commitReservation(daySnapshot.data(), current.reservedMicros, committedMicros, updatedAt, "day", current.day));
    transaction.set(monthRef, commitReservation(monthSnapshot.data(), current.reservedMicros, committedMicros, updatedAt, "month", current.month));
    return { ...current, state: "committed" as const, committedMicros, updatedAt };
  });
}

export async function getProviderControlDiagnostics(now = new Date()) {
  const status = getProviderControlStatus();
  if (!status.enabled) return { enabled: false, alerts: [] as string[] };
  const db = await getFirebaseAdminFirestore();
  const day = now.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const [daySnapshot, monthSnapshot, reservations] = await Promise.all([
    db.collection(PROVIDER_USAGE_AGGREGATES).doc(`day_${day}`).get(),
    db.collection(PROVIDER_USAGE_AGGREGATES).doc(`month_${month}`).get(),
    db.collection(PROVIDER_USAGE_RESERVATIONS).where("day", "==", day).limit(500).get(),
  ]);
  const dayCommittedMicros = getNonNegativeInteger(daySnapshot.data()?.committedMicros);
  const dayReservedMicros = getNonNegativeInteger(daySnapshot.data()?.reservedMicros);
  const monthCommittedMicros = getNonNegativeInteger(monthSnapshot.data()?.committedMicros);
  const records = reservations.docs.map((document) => document.data());
  const staleReservations = records.filter((record) => record.state === "reserved" && Date.parse(record.createdAt) < now.getTime() - 5 * 60 * 1_000).length;
  const invalidOutputs = records.filter((record) => record.outcome === "invalid-output").length;
  const failedCalls = records.filter((record) => record.outcome === "failed").length;
  const fallbackCalls = records.filter((record) => record.fallbackUsed === true).length;
  const latencies = records.map((record) => getNonNegativeInteger(record.latencyMs)).filter((value) => value > 0).sort((left, right) => left - right);
  const alerts = [
    ...(status.dailySpendCapMicros !== null && dayCommittedMicros + dayReservedMicros >= status.dailySpendCapMicros * 0.8 ? ["daily-spend-80-percent"] : []),
    ...(status.monthlySpendCapMicros !== null && monthCommittedMicros >= status.monthlySpendCapMicros * 0.8 ? ["monthly-spend-80-percent"] : []),
    ...(staleReservations > 0 ? ["stale-reservations"] : []),
    ...(invalidOutputs > 0 ? ["invalid-provider-output"] : []),
    ...(failedCalls > 0 ? ["provider-failures"] : []),
  ];
  return {
    enabled: true,
    sampled: reservations.size === 500,
    dayCommittedMicros,
    dayReservedMicros,
    monthCommittedMicros,
    invalidOutputs,
    failedCalls,
    fallbackCalls,
    staleReservations,
    p95LatencyMs: percentile(latencies, 0.95),
    alerts,
  };
}

type ProviderUsageReservation = {
  schemaVersion: 1;
  id: string;
  userId: string;
  accountHash: string;
  day: string;
  month: string;
  reservedMicros: number;
  committedMicros: number;
  state: "reserved" | "committed";
  createdAt: string;
  updatedAt: string;
};

function parsePositiveInteger(value: string | undefined) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function hmac(key: string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getNonNegativeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function getAggregateSpend(value: FirebaseFirestore.DocumentData | undefined) {
  return getNonNegativeInteger(value?.reservedMicros) + getNonNegativeInteger(value?.committedMicros);
}

function addReservation(value: FirebaseFirestore.DocumentData | undefined, micros: number, updatedAt: string, kind: "day" | "month", period: string) {
  return {
    schemaVersion: 1,
    kind,
    period,
    reservedMicros: getNonNegativeInteger(value?.reservedMicros) + micros,
    committedMicros: getNonNegativeInteger(value?.committedMicros),
    updatedAt,
  };
}

function commitReservation(value: FirebaseFirestore.DocumentData | undefined, reserved: number, committed: number, updatedAt: string, kind: "day" | "month", period: string) {
  return {
    schemaVersion: 1,
    kind,
    period,
    reservedMicros: Math.max(0, getNonNegativeInteger(value?.reservedMicros) - reserved),
    committedMicros: getNonNegativeInteger(value?.committedMicros) + committed,
    updatedAt,
  };
}

function parseReservation(value: FirebaseFirestore.DocumentData | undefined): ProviderUsageReservation {
  if (!value || value.schemaVersion !== 1 || typeof value.id !== "string" || typeof value.userId !== "string"
    || typeof value.accountHash !== "string" || typeof value.day !== "string" || typeof value.month !== "string"
    || (value.state !== "reserved" && value.state !== "committed")) {
    throw new ProviderControlError("Provider usage reservation is invalid.", "policy");
  }
  return value as ProviderUsageReservation;
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return null;
  return values[Math.max(0, Math.ceil(values.length * fraction) - 1)];
}
