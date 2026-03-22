"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

interface WhatsAppReminderProps {
  transactionId: string;
  phone: string | null;
  name: string;
  amount: number;
  serviceType: string;
  onSent?: () => void;
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("0")) {
    return "972" + cleaned.slice(1);
  }
  if (cleaned.startsWith("+972")) {
    return cleaned.slice(1);
  }
  if (cleaned.startsWith("972")) {
    return cleaned;
  }
  return cleaned;
}

export function WhatsAppReminder({
  transactionId,
  phone,
  name,
  amount,
  serviceType,
  onSent,
}: WhatsAppReminderProps) {
  const [sending, setSending] = useState(false);

  if (!phone) return null;

  const serviceLabel = serviceType === "booking" ? "הזמנה" : "שיעור";
  const message = `שלום ${name}, תזכורת לתשלום בסך ₪${amount} עבור ${serviceLabel}. תודה!`;
  const waUrl = `https://wa.me/${formatPhone(phone)}?text=${encodeURIComponent(message)}`;

  const handleClick = async () => {
    setSending(true);
    try {
      await fetch(`/api/finance/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: `תזכורת WhatsApp נשלחה ${new Date().toLocaleDateString("he-IL")}`,
        }),
      });
      window.open(waUrl, "_blank");
      onSent?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-green-500/30 text-green-500 hover:bg-green-500/10"
      onClick={handleClick}
      disabled={sending}
    >
      {sending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <MessageCircle className="size-4" />
      )}
      WhatsApp
    </Button>
  );
}
