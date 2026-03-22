"use client";

import { AlertTriangle, Calendar } from "lucide-react";
import { BookingStatusBadge } from "@/components/booking-status-badge";

interface ConflictBooking {
  id: string;
  booking_type: string;
  event_date: string;
  status: string;
  contact_name?: string;
}

interface ConflictWarningProps {
  conflicts: ConflictBooking[];
}

const bookingTypeLabels: Record<string, string> = {
  vocal_lesson: "שיעור פיטנס קולי",
  chuppah: "שירה בחופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  other: "אחר",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ConflictWarning({ conflicts }: ConflictWarningProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
        <AlertTriangle className="size-4" />
        <span>
          {conflicts.length === 1
            ? "נמצאה הזמנה חופפת"
            : `נמצאו ${conflicts.length} הזמנות חופפות`}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {conflicts.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-md bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-300/80"
          >
            <Calendar className="size-3.5 shrink-0" />
            <span className="flex-1">
              {c.contact_name && (
                <span className="font-medium">{c.contact_name} — </span>
              )}
              {bookingTypeLabels[c.booking_type] ?? c.booking_type}
              {" · "}
              {formatDate(c.event_date)}
            </span>
            <BookingStatusBadge status={c.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
