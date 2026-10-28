import pino from "pino";
import { env, isProd } from "../config/env";

// Structured logs. In development they are pretty-printed and coloured.
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : isProd ? "info" : "debug",
  transport: isProd || env.NODE_ENV === "test" ? undefined : { target: "pino-pretty", options: { colorize: true } },
});
