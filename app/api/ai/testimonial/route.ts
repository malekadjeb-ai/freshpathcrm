import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { reviews, customers } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const { reviewId } = await req.json();
    if (!reviewId) return NextResponse.json({ error: "reviewId required" }, { status: 400 });

    const db = getDb();

    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
    if (!review || !review.content) {
      return NextResponse.json({ error: "Review not found or empty" }, { status: 404 });
    }

    const customer = review.customerId
      ? await db.select({ name: customers.name }).from(customers).where(eq(customers.id, review.customerId)).limit(1).then(r => r[0])
      : null;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: `Convert this customer review into a social media testimonial post. Return JSON:
{
  "caption": "Instagram caption for sharing this testimonial",
  "quoteSnippet": "The best 1-2 sentences from the review to highlight"
}

Review by ${customer?.name ?? "Customer"} (${review.rating} stars): "${review.content}"

Business: Fresh Path Mobile Detailing. Tone: grateful, professional. Include booking CTA.`,
        }],
      }),
    });

    if (!res.ok) return NextResponse.json({ error: "AI failed" }, { status: 502 });

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let result = { caption: "", quoteSnippet: review.content.substring(0, 150) };
    if (jsonMatch) {
      try { result = JSON.parse(jsonMatch[0]); } catch { /* use default */ }
    }

    return NextResponse.json({
      ...result,
      customerName: customer?.name ?? null,
      rating: review.rating,
    });
  } catch (error) {
    console.error("Testimonial error:", error);
    return NextResponse.json({ error: "Failed to generate testimonial" }, { status: 500 });
  }
}
