"use client";

import { Badge } from "@/components/ui/badge";

const paymentConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "ממתין", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { label: "שולם", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  overdue: { label: "באיחור", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function PaymentBadge({ status }: { status: string }) {
  const config = paymentConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function getPaymentLabel(status: string): string {
  return paymentConfig[status]?.label ?? status;
}
