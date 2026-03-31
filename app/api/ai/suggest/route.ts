import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildCustomerContext, buildAIContext, buildSystemPrompt } from "@/lib/services/ai-context";

interface SuggestRequest {
  type: "next_action" | "draft_message" | "upsell" | "daily_briefing" | "revenue_opportunities" | "job_addons" | "price_check";
  customerId?: string;
  jobId?: string;
  extra?: Record<string, unknown>;
}

const PROMPTS: Record<string, string> = {
  next_action: `Based on this customer's profile and history, suggest the single best next action to take. Be specific — include exactly what to do, what to say, and why. Consider: rebooking, upselling, review request, follow-up, etc. Format as:
**Recommended Action:** [action]
**Why:** [reason]
**Suggested Message:** [if applicable, a draft text message]`,

  draft_message: `Write a personalized, professional text message (SMS) to this customer. It should be warm but concise (under 160 characters if possible). Consider their last service, time since last visit, and vehicle. Do NOT include placeholder brackets — use actual data.`,

  upsell: `Identify upsell opportunities for this customer. Based on their service history and vehicle(s), suggest 2-3 services they haven't tried but would likely want. For each:
- **Service:** name
- **Why they'd want it:** reasoning based on their vehicle/history
- **Suggested price:** based on catalog
- **Opening line:** how to pitch it`,

  daily_briefing: `Generate a morning briefing for the business owner. Include:
1. **Today's Schedule** — jobs lined up, any gaps
2. **Priority Tasks** — what needs attention now
3. **Revenue Update** — this month's progress
4. **Opportunities** — quick wins to boost revenue today
5. **Risks** — anything that needs immediate attention (overdue invoices, at-risk customers)
Keep it concise and actionable. Use bullet points.`,

  revenue_opportunities: `Identify the top 5 fastest paths to more revenue right now. Consider:
- Dormant high-LTV customers who could be re-engaged
- Pending estimates that need follow-up
- Upsell candidates based on service history
- Seasonal opportunities
For each, estimate the potential revenue impact.`,

  job_addons: `Based on the vehicle type and selected services for this job, suggest add-on services with reasoning. For each add-on:
- **Add-on:** name and price
- **Why:** reason this vehicle/customer would benefit
- **Pitch:** one-line suggestion to say to the customer`,

  price_check: `Compare this job's pricing against typical pricing for similar jobs. Consider vehicle type, service combination, and market rates. Provide:
- **Current price:** what's being charged
- **Typical range:** for this type of job
- **Recommendation:** whether price should be adjusted and why`,
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId: _tenantId } = auth;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured. Add ANTHROPIC_API_KEY to your environment variables." },
        { status: 503 }
      );
    }

    const body: SuggestRequest = await req.json();
    const { type, customerId } = body;

    const taskPrompt = PROMPTS[type];
    if (!taskPrompt) {
      return NextResponse.json({ error: "Invalid suggestion type" }, { status: 400 });
    }

    // Build context
    const aiContext = await buildAIContext(taskPrompt);
    let systemPrompt = buildSystemPrompt(aiContext);

    if (customerId) {
      const customerCtx = await buildCustomerContext(customerId);
      systemPrompt += `\n\n${customerCtx}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: taskPrompt }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const suggestion = data.content?.[0]?.text ?? "Unable to generate suggestion.";

    return NextResponse.json({ suggestion, type });
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
