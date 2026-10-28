import { env, features } from "./config/env";
import { createApp } from "./app";
import { startJobs } from "./jobs";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚜 HeavyHire API running on ${env.API_URL} (${env.NODE_ENV})`);
  const off = Object.entries(features).filter(([, on]) => !on).map(([name]) => name);
  if (off.length) logger.warn(`Dev mode (fake) services: ${off.join(", ")}`);
  startJobs();
});

// Close cleanly when Render restarts or you press Ctrl+C.
async function shutdown() {
  logger.info("Shutting down...");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
