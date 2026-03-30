import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { eq, inArray, and } from "drizzle-orm";
import { customers, tags, customerTags } from "@/src/db/schema";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { tenantId } = auth;

    const db = getDb();
    const { action, ids, data } = await req.json();
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    let affected = 0;

    switch (action) {
      case "add_tag": {
        const tagName = data?.tag as string;
        if (!tagName) {
          return NextResponse.json({ error: "Tag name required" }, { status: 400 });
        }
        // Find or create tag scoped to tenant
        let [tag] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.name, tagName), eq(tags.tenantId, tenantId)))
          .limit(1);
        if (!tag) {
          [tag] = await db.insert(tags).values({ name: tagName, tenantId }).returning();
        }
        // Get existing associations to avoid duplicates
        const existing = await db
          .select({ customerId: customerTags.customerId })
          .from(customerTags)
          .where(and(eq(customerTags.tagId, tag.id), inArray(customerTags.customerId, ids)));
        const existingSet = new Set(existing.map((r) => r.customerId));
        const toInsert = ids.filter((id) => !existingSet.has(id));
        if (toInsert.length) {
          await db
            .insert(customerTags)
            .values(toInsert.map((customerId) => ({ customerId, tagId: tag.id })));
        }
        affected = ids.length;
        break;
      }
      case "remove_tag": {
        const tagName = data?.tag as string;
        if (!tagName) {
          return NextResponse.json({ error: "Tag name required" }, { status: 400 });
        }
        const [tag] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.name, tagName), eq(tags.tenantId, tenantId)))
          .limit(1);
        if (tag) {
          await db
            .delete(customerTags)
            .where(and(eq(customerTags.tagId, tag.id), inArray(customerTags.customerId, ids)));
          affected = ids.length;
        }
        break;
      }
      case "delete": {
        await db
          .update(customers)
          .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .where(and(inArray(customers.id, ids), eq(customers.tenantId, tenantId)));
        affected = ids.length;
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, affected });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
