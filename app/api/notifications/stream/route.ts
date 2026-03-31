import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/src/db";
import { notifications } from "@/src/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE stream: polls for new notifications every 3s, reconnects every 25s.
// Client uses EventSource which auto-reconnects on close.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) return new Response("No tenant", { status: 403 });

  let lastChecked = new Date().toISOString();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: string) =>
        new TextEncoder().encode(`data: ${data}\n\n`);

      // Send initial ping to confirm connection
      controller.enqueue(encode(JSON.stringify({ type: "connected" })));

      const poll = async () => {
        if (closed) return;
        try {
          const db = getDb();
          const since = lastChecked;
          lastChecked = new Date().toISOString();

          const newNotifs = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, userId),
                gt(notifications.createdAt, since)
              )
            )
            .orderBy(desc(notifications.createdAt))
            .limit(10);

          if (newNotifs.length > 0) {
            controller.enqueue(
              encode(
                JSON.stringify({
                  type: "notifications",
                  data: newNotifs,
                })
              )
            );
          } else {
            // Heartbeat to keep connection alive
            controller.enqueue(encode(JSON.stringify({ type: "heartbeat" })));
          }
        } catch {
          // DB error — send heartbeat, don't crash stream
          if (!closed) {
            controller.enqueue(encode(JSON.stringify({ type: "heartbeat" })));
          }
        }
      };

      // Poll every 3 seconds for 25 seconds, then close (client auto-reconnects)
      const interval = setInterval(poll, 3000);
      setTimeout(() => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, 25000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
