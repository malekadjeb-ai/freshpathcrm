import { getDbAsync } from "@/src/db";
import { customers, vehicles } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

interface ExtractedData {
  customerName?: string;
  phone?: string;
  email?: string;
  vehicleInfo?: { year?: string; make?: string; model?: string; color?: string };
  serviceRequested?: string;
  preferredDate?: string;
  preferredTime?: string;
  address?: string;
  gateCode?: string;
  specialInstructions?: string;
  sentiment?: "positive" | "neutral" | "negative";
  intent?: "booking" | "inquiry" | "complaint" | "follow_up" | "cancellation" | "other";
  urgency?: "low" | "medium" | "high";
}

export async function extractDataFromMessage(
  messageText: string,
  existingCustomerData?: Record<string, unknown>
): Promise<ExtractedData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};

  const systemPrompt = `Extract any customer or service information from this message. Return ONLY valid JSON matching this interface:
{
  customerName?: string,
  phone?: string,
  email?: string,
  vehicleInfo?: { year?: string, make?: string, model?: string, color?: string },
  serviceRequested?: string,
  preferredDate?: string,
  preferredTime?: string,
  address?: string,
  gateCode?: string,
  specialInstructions?: string,
  sentiment?: "positive" | "neutral" | "negative",
  intent?: "booking" | "inquiry" | "complaint" | "follow_up" | "cancellation" | "other",
  urgency?: "low" | "medium" | "high"
}
If a field cannot be determined, omit it. Do not guess — only extract what is explicitly stated or clearly implied.`;

  const userContent = `Message: "${messageText}"${
    existingCustomerData
      ? `\n\nPrevious context about this customer: ${JSON.stringify(existingCustomerData)}`
      : ""
  }`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
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
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) return {};
    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]) as ExtractedData;
  } catch {
    return {};
  }
}

export async function generateCallSummary(
  notes: string,
  customerName?: string
): Promise<{ summary: string; actionItems: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { summary: notes.substring(0, 100), actionItems: [] };

  try {
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
        system: "Generate a one-line summary and extract action items from these call notes. Return JSON: { summary: string, actionItems: string[] }",
        messages: [{
          role: "user",
          content: `Call notes${customerName ? ` with ${customerName}` : ""}: "${notes}"`,
        }],
      }),
    });

    if (!res.ok) return { summary: notes.substring(0, 100), actionItems: [] };
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { summary: notes.substring(0, 100), actionItems: [] };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { summary: notes.substring(0, 100), actionItems: [] };
  }
}

export async function applyExtractedData(
  customerId: string,
  extracted: ExtractedData
): Promise<{ fieldsUpdated: string[] }> {
  const db = await getDbAsync();
  const fieldsUpdated: string[] = [];
  const customerUpdate: Record<string, unknown> = {};

  if (extracted.phone) {
    customerUpdate.phone = extracted.phone;
    fieldsUpdated.push("phone");
  }
  if (extracted.email) {
    customerUpdate.email = extracted.email;
    fieldsUpdated.push("email");
  }
  if (extracted.address) {
    customerUpdate.address = extracted.address;
    fieldsUpdated.push("address");
  }
  if (extracted.gateCode) {
    customerUpdate.gateCode = extracted.gateCode;
    fieldsUpdated.push("gateCode");
  }
  if (extracted.specialInstructions) {
    customerUpdate.specialInstructions = extracted.specialInstructions;
    fieldsUpdated.push("specialInstructions");
  }

  if (Object.keys(customerUpdate).length > 0) {
    customerUpdate.updatedAt = new Date().toISOString();
    await db.update(customers).set(customerUpdate).where(eq(customers.id, customerId));
  }

  // Create/update vehicle if vehicle info extracted
  if (extracted.vehicleInfo) {
    const vi = extracted.vehicleInfo;
    if (vi.make && vi.model) {
      const conditions = [
        eq(vehicles.customerId, customerId),
        eq(vehicles.make, vi.make),
        eq(vehicles.model, vi.model),
      ];
      if (vi.year) conditions.push(eq(vehicles.year, parseInt(vi.year)));

      const [existing] = await db.select().from(vehicles).where(and(...conditions));

      if (!existing) {
        await db.insert(vehicles).values({
          customerId,
          make: vi.make,
          model: vi.model,
          year: vi.year ? parseInt(vi.year) : new Date().getFullYear(),
          color: vi.color || undefined,
        });
        fieldsUpdated.push("vehicle (new)");
      } else if (vi.color && !existing.color) {
        await db.update(vehicles).set({ color: vi.color, updatedAt: new Date().toISOString() }).where(eq(vehicles.id, existing.id));
        fieldsUpdated.push("vehicle color");
      }
    }
  }

  return { fieldsUpdated };
}
