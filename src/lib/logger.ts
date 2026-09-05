type Level = "info" | "warn" | "error";

export interface Logger {
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
}

function write(level: Level, scope: string, event: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, scope, event, ...data });
  process.stdout.write(`${line}\n`);
}

/** The only module allowed to write to stdout; one JSON line per event. */
export function createLogger(scope: string): Logger {
  return {
    info: (event, data) => write("info", scope, event, data),
    warn: (event, data) => write("warn", scope, event, data),
    error: (event, data) => write("error", scope, event, data),
  };
}

export function errorFields(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      code: (error as { code?: string }).code,
    };
  }
  return { errorMessage: String(error) };
}
