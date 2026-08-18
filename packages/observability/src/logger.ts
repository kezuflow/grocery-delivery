export type LogLevel = "info" | "warn" | "error";

export type LogEntry = Readonly<{
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
  correlationId?: string;
  fields?: Readonly<Record<string, unknown>>;
}>;

export type LogSink = (entry: LogEntry) => void;

export type Logger = Readonly<{
  info: (event: string, fields?: Readonly<Record<string, unknown>>) => void;
  warn: (event: string, fields?: Readonly<Record<string, unknown>>) => void;
  error: (event: string, error: unknown, fields?: Readonly<Record<string, unknown>>) => void;
  withCorrelationId: (correlationId: string) => Logger;
}>;

type CreateLoggerOptions = Readonly<{
  service: string;
  sink: LogSink;
  now?: () => Date;
  correlationId?: string;
}>;

export function createLogger(options: CreateLoggerOptions): Logger {
  const now = options.now ?? (() => new Date());

  const write = (
    level: LogLevel,
    event: string,
    fields?: Readonly<Record<string, unknown>>,
  ): void => {
    options.sink({
      timestamp: now().toISOString(),
      level,
      service: options.service,
      event,
      ...(options.correlationId ? { correlationId: options.correlationId } : {}),
      ...(fields ? { fields } : {}),
    });
  };

  return {
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, error, fields) =>
      write("error", event, {
        ...fields,
        error: serializeError(error),
      }),
    withCorrelationId: (correlationId) =>
      createLogger({
        ...options,
        correlationId,
        now,
      }),
  };
}

function serializeError(error: unknown): Readonly<Record<string, unknown>> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }

  return { value: error };
}
