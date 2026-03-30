import { getDbAsync } from "@/src/db";
import { webhookEndpoints, webhookLogs } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Fire webhooks for a given event. Runs asynchronously and does not block.
 * Finds all active endpoints subscribed to the event and sends POST requests.
 */
export function fireWebhooks(event: string, data: Record<string, unknown>) {
  // Fire and forget — don't await
  fireWebhooksAsync(event, data).catch(() => {
    // Silently ignore top-level errors
  });
}

async function fireWebhooksAsync(event: string, data: Record<string, unknown>) {
  const db = await getDbAsync();

  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.isActive, true));

  // Filter endpoints that subscribe to this event
  const matched = endpoints.filter((ep) => {
    const events = JSON.parse(ep.events || "[]") as string[];
    return events.includes(event) || events.includes("*");
  });

  if (matched.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    matched.map((ep) => deliverWebhook(ep, event, body))
  );
}

async function deliverWebhook(
  endpoint: { id: string; url: string; secret: string | null; failCount?: number | null },
  event: string,
  body: string
) {
  const start = Date.now();
  let statusCode: number | null = null;
  let responseText: string | null = null;
  let success = false;
  let error: string | null = null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event,
    };

    // Sign payload with HMAC if secret is configured
    if (endpoint.secret) {
      const signature = crypto
        .createHmac("sha256", endpoint.secret)
        .update(body)
        .digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    const res = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    statusCode = res.status;
    responseText = await res.text().catch(() => null);
    success = res.ok;

    if (!res.ok) {
      error = `HTTP ${res.status}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  const duration = Date.now() - start;

  const db = await getDbAsync();

  // Log the delivery attempt
  await db.insert(webhookLogs).values({
    endpointId: endpoint.id,
    event,
    payload: body,
    statusCode,
    response: responseText?.slice(0, 1000) || null,
    success,
    duration,
    error,
    createdAt: new Date().toISOString(),
  }).catch(() => {});

  // Update endpoint stats
  await db.update(webhookEndpoints).set({
    lastFired: new Date().toISOString(),
    failCount: success ? 0 : (endpoint.failCount ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  }).where(eq(webhookEndpoints.id, endpoint.id)).catch(() => {});
}
