import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildAIContext, buildSystemPrompt, buildCustomerContext } from "@/lib/services/ai-context";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  customerId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured. Add ANTHROPIC_API_KEY to your environment variables." },
        { status: 503 }
      );
    }

    const body: ChatRequest = await req.json();
    const { message, history = [], customerId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Build context based on the query
    const aiContext = await buildAIContext(message);
    let systemPrompt = buildSystemPrompt(aiContext);

    // If a specific customer is referenced, add their full profile
    if (customerId) {
      const customerCtx = await buildCustomerContext(customerId);
      systemPrompt += `\n\n${customerCtx}`;
    }

    // Build message history for the API call
    const messages = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Call Anthropic API
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
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return NextResponse.json(
        { error: "AI service error. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const aiMessage = data.content?.[0]?.text ?? "I couldn't generate a response. Please try again.";

    // Detect action intents in the AI response
    const actions = detectActions(aiMessage);

    return NextResponse.json({
      message: aiMessage,
      actions,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface SuggestedAction {
  type: string;
  label: string;
  data: Record<string, string>;
}

function detectActions(response: string): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const lower = response.toLowerCase();

  // Detect "text/message [customer]" suggestions
  const textMatch = response.match(/(?:text|message|sms)\s+(\w[\w\s]*?)(?:\s+(?:about|to|regarding|with))/i);
  if (textMatch) {
    actions.push({
      type: "send_message",
      label: `Text ${textMatch[1].trim()}`,
      data: { customerName: textMatch[1].trim() },
    });
  }

  // Detect task creation suggestions
  if (/create a task|add a task|set a reminder/i.test(lower)) {
    const taskMatch = response.match(/(?:create a task|add a task|set a reminder)[:\s]*["""]?([^""".\n]+)/i);
    actions.push({
      type: "create_task",
      label: taskMatch ? `Create task: ${taskMatch[1].trim().substring(0, 50)}` : "Create task",
      data: { title: taskMatch?.[1]?.trim() ?? "" },
    });
  }

  // Detect follow-up suggestions
  if (/follow.?up|reach out|call\s/i.test(lower)) {
    actions.push({
      type: "create_task",
      label: "Schedule follow-up",
      data: { title: "Follow-up", type: "follow_up" },
    });
  }

  return actions;
}
