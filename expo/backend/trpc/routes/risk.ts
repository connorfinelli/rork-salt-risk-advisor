import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { calculateRisk, type WeatherCondition } from "../../utils/riskCalculator";
import type { RoadTreatmentData } from "../../utils/roadTreatmentService";

const weatherConditionSchema = z.object({
  lastColdPrecipitation: z.string().nullable(),
  lastWarmRain: z.string().nullable(),
  lastRain: z.string().nullable(),
  currentTemp: z.number(),
  recentLowTemp: z.number(),
  recentHighTemp: z.number(),
  precipitationType: z.enum(['snow', 'sleet', 'freezing-rain', 'rain', 'none']),
  totalRainLast48Hours: z.number(),
  hoursAboveFreezing: z.number(),
});

const roadTreatmentSchema = z.object({
  status: z.enum(['ACTIVE_TREATMENT', 'SCHEDULED', 'RECENT_TREATMENT', 'NO_TREATMENT', 'UNAVAILABLE']),
  source: z.string().optional(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  dataAvailable: z.boolean(),
  details: z.string().optional(),
  lastUpdated: z.string().optional(),
}).optional().nullable();

export const riskRouter = createTRPCRouter({
  calculate: publicProcedure
    .input(z.object({
      weather: weatherConditionSchema,
      roadTreatment: roadTreatmentSchema,
      stateCode: z.string().nullable().optional(),
    }))
    .mutation(({ input }) => {
      const conditions: WeatherCondition = {
        lastColdPrecipitation: input.weather.lastColdPrecipitation ? new Date(input.weather.lastColdPrecipitation) : null,
        lastWarmRain: input.weather.lastWarmRain ? new Date(input.weather.lastWarmRain) : null,
        lastRain: input.weather.lastRain ? new Date(input.weather.lastRain) : null,
        currentTemp: input.weather.currentTemp,
        recentLowTemp: input.weather.recentLowTemp,
        recentHighTemp: input.weather.recentHighTemp,
        precipitationType: input.weather.precipitationType,
        totalRainLast48Hours: input.weather.totalRainLast48Hours,
        hoursAboveFreezing: input.weather.hoursAboveFreezing,
      };

      const roadTreatment: RoadTreatmentData | null = input.roadTreatment ? {
        status: input.roadTreatment.status,
        source: input.roadTreatment.source ?? null,
        confidence: input.roadTreatment.confidence,
        dataAvailable: input.roadTreatment.dataAvailable,
        details: input.roadTreatment.details ?? null,
        lastUpdated: input.roadTreatment.lastUpdated ? new Date(input.roadTreatment.lastUpdated) : null,
        stateCode: input.stateCode ?? null,
      } : null;

      const result = calculateRisk(conditions, roadTreatment, input.stateCode);
      
      console.log('[Risk API] Calculated risk:', {
        verdict: result.verdict,
        stateCode: input.stateCode,
        currentTemp: input.weather.currentTemp,
      });

      return result;
    }),
});
