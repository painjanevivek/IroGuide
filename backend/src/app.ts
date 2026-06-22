import Fastify from "fastify";
import cors from "@fastify/cors";
import { improvementRequestSchema } from "@/domain/improvement";
import { reviewRequestSchema } from "@/domain/review";
import { createDemoImprovement } from "@/services/demo-improvement";
import { createDemoReview } from "@/services/demo-review";

export type AppOptions = { logger?: boolean; frontendOrigin?: string };

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 1_000_000, requestTimeout: 30_000 });
  await app.register(cors, { origin: options.frontendOrigin ?? process.env.FRONTEND_ORIGIN ?? "http://localhost:3000", methods: ["GET", "POST", "OPTIONS"] });

  app.get("/health", async () => ({ status: "ok", service: "dinodesign-backend" }));
  app.post("/api/reviews", async (request, reply) => {
    const parsed = reviewRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ error: "Check the design details and try again.", fields: zodFields(parsed.error) });
    if (process.env.AI_PROVIDER && process.env.AI_PROVIDER !== "demo") return reply.code(503).send({ error: "The configured AI provider adapter is not available in this build." });
    return reply.header("Cache-Control", "no-store").send(createDemoReview(parsed.data));
  });
  app.post("/api/improvements", async (request, reply) => {
    const parsed = improvementRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ error: "The review could not be converted into an improvement plan." });
    return reply.header("Cache-Control", "no-store").send(createDemoImprovement(parsed.data));
  });
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const knownError = typeof error === "object" && error !== null ? error as { statusCode?: number; message?: string } : {};
    const isClientError = knownError.statusCode !== undefined && knownError.statusCode >= 400 && knownError.statusCode < 500;
    reply.code(isClientError ? knownError.statusCode! : 500).send({ error: isClientError ? knownError.message ?? "The request is invalid." : "The service could not complete the request." });
  });
  return app;
}

function zodFields(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.reduce<Record<string, string[]>>((fields, issue) => { const key = issue.path.join(".") || "request"; fields[key] = [...(fields[key] ?? []), issue.message]; return fields; }, {});
}
