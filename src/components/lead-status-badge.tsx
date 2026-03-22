"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "חדש", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  contacted: { label: "נוצר קשר", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  qualified: { label: "מתאים", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  quoted: { label: "הוצעה הצעה", className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  negotiating: { label: "במו\"מ", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  converted: { label: "הומר", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  rejected: { label: "נדחה", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  lost: { label: "אבוד", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  archived: { label: "בארכיון", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function getStatusLabel(status: string): string {
  return statusConfig[status]?.label ?? status;
}
