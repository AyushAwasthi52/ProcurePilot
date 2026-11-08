export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userIdHash?: string;
  route?: string;
  entityType?: string;
  entityId?: string;
  durationMs?: number;
  code?: string;
  [key: string]: unknown;
}

export const logger = {
  log(level: LogLevel, message: string, context?: LogContext): void {
    const payload = {
      ts: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    if (level === "error") {
      console.error(JSON.stringify(payload));
    } else if (level === "warn") {
      console.warn(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload));
    }
  },

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  },

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  },

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  },
};

