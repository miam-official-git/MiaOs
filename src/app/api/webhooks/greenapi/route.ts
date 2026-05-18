import { NextRequest } from "next/server";
import {
  validateGreenApiPayload,
  classifyWebhook,
} from "@/lib/greenapi-utils";
import {
  handleIncomingMessage,
  handleOutgoingManual,
  handleOutgoingApi,
} from "@/lib/greenapi-handlers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = validateGreenApiPayload(body);

    if (!result.valid) {
      console.error("[greenapi] Invalid payload:", result.error);
      return Response.json({ success: false, error: result.error }, { status: 200 });
    }

    const webhook = result.data;
    const classification = classifyWebhook(webhook.typeWebhook);

    switch (classification) {
      case "inbound":
        await handleIncomingMessage(webhook);
        break;
      case "outbound_manual":
        await handleOutgoingManual(webhook);
        break;
      case "outbound_api":
        await handleOutgoingApi(webhook);
        break;
      case "status":
      case "unknown":
        break;
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[greenapi] Webhook error:", error);
    // Always return 200 — Green API retries on non-200
    return Response.json({ success: false, error: "Internal error" }, { status: 200 });
  }
}
