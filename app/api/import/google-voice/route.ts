import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  parseGoogleVoiceZip,
  getRecordStats,
  type GVRecord,
} from "@/lib/services/google-voice-parser";

/**
 * POST: Upload a Google Takeout Voice ZIP and return parsed preview.
 * Expects multipart/form-data with a "file" field.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Please upload a .zip file" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    let records: GVRecord[];

    try {
      records = await parseGoogleVoiceZip(buffer);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse ZIP file. Make sure this is a Google Takeout Voice export." },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No Voice records found in this ZIP. Make sure you exported the 'Voice' data from Google Takeout." },
        { status: 400 }
      );
    }

    const stats = getRecordStats(records);

    // Return preview (first 50 records) and stats
    const preview = records.slice(0, 50).map((r) => ({
      phoneNumber: r.phoneNumber,
      contactName: r.contactName,
      direction: r.direction,
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      duration: r.duration,
      messageBody: r.messageBody
        ? r.messageBody.length > 100
          ? r.messageBody.substring(0, 100) + "..."
          : r.messageBody
        : undefined,
    }));

    // Serialize full records for the process step (stored client-side)
    const allRecords = records.map((r) => ({
      phoneNumber: r.phoneNumber,
      contactName: r.contactName,
      direction: r.direction,
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      duration: r.duration,
      messageBody: r.messageBody,
      rawFilename: r.rawFilename,
    }));

    return NextResponse.json({
      stats,
      preview,
      records: allRecords,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
