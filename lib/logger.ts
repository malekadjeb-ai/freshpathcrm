import { headers } from "next/headers";

interface LogContext {
  route?: string;
  method?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  [key: string]: unknown;
}

function getRequestId(): string | undefined {
  try {
    const h = headers();
    return h.get("x-request-id") ?? undefined;
  } catch {
    return undefined;
  }
}

export function logError(error: unknown, context: LogContext = {}) {
  const entry = {
    level: "error",
    timestamp: new Date().toISOString(),
    requestId: context.requestId ?? getRequestId(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };
  console.error(JSON.stringify(entry));
}

export function logWarn(message: string, context: LogContext = {}) {
  const entry = {
    level: "warn",
    timestamp: new Date().toISOString(),
    requestId: context.requestId ?? getRequestId(),
    message,
    ...context,
  };
  console.warn(JSON.stringify(entry));
}

export function logInfo(message: string, context: LogContext = {}) {
  const entry = {
    level: "info",
    timestamp: new Date().toISOString(),
    requestId: context.requestId ?? getRequestId(),
    message,
    ...context,
  };
  console.info(JSON.stringify(entry));
}
