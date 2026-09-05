import { env } from "../config/env";

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  if (env.NODE_ENV === "test") return;

  const entry = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  console.log(entry);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
