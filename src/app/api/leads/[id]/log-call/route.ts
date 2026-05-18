import { NextRequest } from "next/server";
import { logActivity } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { datetime, summary, next_action } = body;

    if (!summary || typeof summary !== "string" || !summary.trim()) {
      return Response.json(
        { error: "summary is required" },
        { status: 400 },
      );
    }

    await logActivity("lead", id, "call_logged", "omer", {
      datetime: datetime || new Date().toISOString(),
      summary: summary.trim(),
      next_action: next_action?.trim() || null,
    });

    // If next_action provided, create a follow-up
    if (next_action?.trim()) {
      const sb = createServiceClient();
      await sb.from("follow_ups").insert({
        lead_id: id,
        type: "general",
        scheduled_for: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        notes: next_action.trim(),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[log-call] Error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
