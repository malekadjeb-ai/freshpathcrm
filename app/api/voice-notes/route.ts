import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { voiceNotes, communications } from "@/src/db/schema";
import { z } from "zod";

const voiceNoteSchema = z.object({
  transcription: z.string().min(1, "transcription is required"),
  customerId: z.string().optional(),
  jobId: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const jobId = searchParams.get("jobId");

    let notes = await db.select().from(voiceNotes).orderBy(voiceNotes.createdAt);

    if (customerId) notes = notes.filter((n) => n.customerId === customerId);
    if (jobId) notes = notes.filter((n) => n.jobId === jobId);

    notes.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    return NextResponse.json(notes.slice(0, 50));
  } catch (error) {
    console.error("Voice notes error:", error);
    return NextResponse.json({ error: "Failed to fetch voice notes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const body = await req.json();
    const parsed = voiceNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { customerId, jobId, transcription, duration } = parsed.data;

    // Auto-extract tags via AI if available
    let tags: string[] = [];
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
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
            max_tokens: 256,
            messages: [{
              role: "user",
              content: `Extract 2-5 short tags from this voice note for a car detailing CRM. Return JSON array of strings only.\n\n"${transcription}"`,
            }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.content?.[0]?.text || "";
          const match = text.match(/\[[\s\S]*\]/);
          if (match) tags = JSON.parse(match[0]);
        }
      } catch {
        // Ignore AI errors
      }
    }

    const [note] = await db
      .insert(voiceNotes)
      .values({
        customerId: customerId || null,
        jobId: jobId || null,
        transcription,
        duration: duration || null,
        tags: JSON.stringify(tags),
      })
      .returning();

    // Also create a communication record if customerId is provided
    if (customerId) {
      await db.insert(communications).values({
        customerId,
        type: "voice_note",
        direction: "outbound",
        status: "completed",
        summary: transcription.substring(0, 200),
        body: transcription,
        channel: "voice_note",
        jobId: jobId || null,
      });
    }

    return NextResponse.json({ ...note, tags });
  } catch (error) {
    console.error("Create voice note error:", error);
    return NextResponse.json({ error: "Failed to create voice note" }, { status: 500 });
  }
}
