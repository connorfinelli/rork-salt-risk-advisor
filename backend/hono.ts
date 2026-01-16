import { trpcServer } from "@hono/trpc-server";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { calculateRisk, type WeatherCondition } from "./utils/riskCalculator";
import type { RoadTreatmentData } from "./utils/roadTreatmentService";

const app = new Hono().basePath("/api");

console.log("[Backend] Hono backend booting...");

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("*", async (c, next) => {
  console.log(`[Backend][Request] ${c.req.method} ${c.req.url} (path=${c.req.path})`);
  try {
    await next();
  } catch (err: unknown) {
    console.error("[Backend] Unhandled error:", err);
    throw err;
  }
});

const healthCheck = (c: Context) =>
  c.json({
    status: "ok",
    message: "Salt Risk API Backend is running",
    timestamp: new Date().toISOString(),
    path: c.req.path,
  });

app.get("/", healthCheck);
app.get("/health", healthCheck);

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  }),
);

type RiskCalculateBody = {
  weather?: {
    lastColdPrecipitation?: string | null;
    lastWarmRain?: string | null;
    lastRain?: string | null;
    currentTemp?: number;
    recentLowTemp?: number;
    recentHighTemp?: number;
    precipitationType?: "snow" | "sleet" | "freezing-rain" | "rain" | "none";
    totalRainLast48Hours?: number;
    hoursAboveFreezing?: number;
  };
  roadTreatment?: {
    status: RoadTreatmentData["status"];
    source?: string | null;
    lastUpdated?: string | null;
    details?: string | null;
    confidence: RoadTreatmentData["confidence"];
    dataAvailable: boolean;
  } | null;
  stateCode?: string | null;
};

const riskCalculateHandler = async (c: Context) => {
  try {
    console.log("[Backend][risk/calculate] Handler invoked", {
      path: c.req.path,
      method: c.req.method,
    });
    const body = (await c.req.json()) as RiskCalculateBody;
    console.log("[Backend][risk/calculate] Body received:", body);

    const weather = body.weather;
    if (!weather) {
      return c.json({ error: "weather data is required" }, 400);
    }

    const conditions: WeatherCondition = {
      lastColdPrecipitation: weather.lastColdPrecipitation
        ? new Date(weather.lastColdPrecipitation)
        : null,
      lastWarmRain: weather.lastWarmRain ? new Date(weather.lastWarmRain) : null,
      lastRain: weather.lastRain ? new Date(weather.lastRain) : null,
      currentTemp: Number(weather.currentTemp),
      recentLowTemp: Number(weather.recentLowTemp),
      recentHighTemp: Number(weather.recentHighTemp),
      precipitationType: weather.precipitationType ?? "none",
      totalRainLast48Hours: Number(weather.totalRainLast48Hours ?? 0),
      hoursAboveFreezing: Number(weather.hoursAboveFreezing ?? 0),
    };

    if (!Number.isFinite(conditions.currentTemp)) {
      return c.json({ error: "weather.currentTemp must be a number" }, 400);
    }
    if (!Number.isFinite(conditions.recentLowTemp)) {
      return c.json({ error: "weather.recentLowTemp must be a number" }, 400);
    }
    if (!Number.isFinite(conditions.recentHighTemp)) {
      return c.json({ error: "weather.recentHighTemp must be a number" }, 400);
    }

    const treatmentData: RoadTreatmentData | null = body.roadTreatment
      ? {
          status: body.roadTreatment.status,
          source: body.roadTreatment.source ?? null,
          lastUpdated: body.roadTreatment.lastUpdated
            ? new Date(body.roadTreatment.lastUpdated)
            : null,
          details: body.roadTreatment.details ?? null,
          confidence: body.roadTreatment.confidence,
          dataAvailable: body.roadTreatment.dataAvailable,
          stateCode: body.stateCode ?? null,
        }
      : null;

    const result = calculateRisk(conditions, treatmentData, body.stateCode ?? null);
    console.log("[Backend][risk/calculate] Result:", result);

    return c.json(result);
  } catch (err: unknown) {
    console.error("[Backend][risk/calculate] Error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return c.json({ error: message }, 500);
  }
};

app.post("/risk/calculate", riskCalculateHandler);

app.notFound((c) => {
  console.log(`[Backend][404] Not found: ${c.req.method} ${c.req.path}`);
  return c.json(
    {
      error: "Not Found",
      message: `Route ${c.req.path} not found in backend`,
      available: [
        "GET /api",
        "GET /api/health",
        "POST /api/risk/calculate",
        "POST /api/trpc/*",
      ],
    },
    404,
  );
});

export default app;
