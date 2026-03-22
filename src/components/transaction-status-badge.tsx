"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "ממתין",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  completed: {
    label: "הושלם",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  failed: {
    label: "נכשל",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  refunded: {
    label: "הוחזר",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
};

export function TransactionStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
