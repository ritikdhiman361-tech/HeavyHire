import cron from "node-cron";
import { logger } from "../lib/logger";
import { cancelUnpaidBookings, expireUnansweredBookings, sendVendorReminders } from "../modules/bookings/bookings.service";

// Jobs that run on a timer inside the API server.
// Note: run only ONE server instance with jobs enabled (Render free/starter
// has one instance, so this is fine for the MVP).

function safely(name: string, job: () => Promise<number>) {
  return async () => {
    try {
      const count = await job();
      if (count) logger.info(`⏱  ${name}: ${count} booking(s)`);
    } catch (err) {
      logger.error({ err }, `Job ${name} failed`);
    }
  };
}

export function startJobs() {
  cron.schedule("* * * * *", safely("expire unanswered", expireUnansweredBookings)); // every minute
  cron.schedule("*/5 * * * *", safely("cancel unpaid", cancelUnpaidBookings)); // every 5 minutes
  cron.schedule("*/10 * * * *", safely("vendor reminders", sendVendorReminders)); // every 10 minutes
  logger.info("⏱  Background jobs started");
}
