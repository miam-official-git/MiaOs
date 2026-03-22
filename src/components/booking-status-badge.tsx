"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "חדש", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  option: { label: "אופציה", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  confirmed: { label: "מאושר", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  completed: { label: "הושלם", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  cancelled: { label: "בוטל", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function BookingStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function getBookingStatusLabel(status: string): string {
  return statusConfig[status]?.label ?? status;
}
