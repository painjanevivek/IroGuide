import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe("backend API", () => {
  it("reports health", async () => { const app = await buildApp(); apps.push(app); const response = await app.inject({ method: "GET", url: "/health" }); expect(response.statusCode).toBe(200); expect(response.json()).toMatchObject({ status: "ok" }); });
  it("validates and generates a review", async () => { const app = await buildApp(); apps.push(app); const response = await app.inject({ method: "POST", url: "/api/reviews", payload: { category: "poster", mode: "mentor", file: { name: "poster.png", type: "image/png", size: 2048 }, brief: { audience: "Design students", purpose: "Promote an event", style: "Editorial", goal: "Increase registrations" } } }); expect(response.statusCode).toBe(200); expect(response.json()).toMatchObject({ provider: "demo" }); });
  it("rejects invalid payloads without exposing internals", async () => { const app = await buildApp(); apps.push(app); const response = await app.inject({ method: "POST", url: "/api/reviews", payload: {} }); expect(response.statusCode).toBe(422); expect(response.json()).toHaveProperty("error"); });
});
