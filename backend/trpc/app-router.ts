import { createTRPCRouter } from "./create-context";
import { notificationsRouter } from "./routes/notifications";
import { riskRouter } from "./routes/risk";

export const appRouter = createTRPCRouter({
  notifications: notificationsRouter,
  risk: riskRouter,
});

export type AppRouter = typeof appRouter;
