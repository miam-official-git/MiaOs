"use client";

import { Badge } from "@/components/ui/badge";

const attendanceConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: "מתוכנן", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  attended: { label: "נכח/ה", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  no_show: { label: "לא הגיע/ה", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  cancelled: { label: "בוטל", className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

export function AttendanceBadge({ status }: { status: string }) {
  const config = attendanceConfig[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function getAttendanceLabel(status: string): string {
  return attendanceConfig[status]?.label ?? status;
}
