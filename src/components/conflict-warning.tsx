"use client";

import { AlertTriangle, Ban, Calendar } from "lucide-react";
import { BookingStatusBadge } from "@/components/booking-status-badge";

interface ConflictBooking {
  id: string;
  booking_type: string;
  event_date: string;
  event_start_time?: string | null;
  event_end_time?: string | null;
  status: string;
  contact_name?: string;
}

interface BlockedConflict {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

interface ConflictWarningProps {
  conflicts: ConflictBooking[];
  blockedPeriods?: BlockedConflict[];
  confirmed?: boolean;
  onConfirmChange?: (confirmed: boolean) => void;
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

function formatTime(time?: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function ConflictWarning({
  conflicts,
  blockedPeriods,
  confirmed,
  onConfirmChange,
}: ConflictWarningProps) {
  const hasBlocked = blockedPeriods && blockedPeriods.length > 0;
  const hasConflicts = conflicts.length > 0;

  if (!hasConflicts && !hasBlocked) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Blocked period warning — severe */}
      {hasBlocked && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-400">
            <Ban className="size-4" />
            <span>מייה לא זמינה בתאריך זה!</span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {blockedPeriods.map((bp) => (
              <div
                key={bp.id}
                className="flex items-center gap-2 rounded-md bg-red-500/5 px-2.5 py-1.5 text-xs text-red-300/80"
              >
                <Ban className="size-3.5 shrink-0" />
                <span className="flex-1">
                  <span className="font-medium">{bp.title}</span>
                  {" · "}
                  {formatDate(bp.start_date)} — {formatDate(bp.end_date)}
                </span>
              </div>
            ))}
          </div>
          {onConfirmChange && (
            <label className="mt-3 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed ?? false}
                onChange={(e) => onConfirmChange(e.target.checked)}
                className="mt-0.5 size-4 rounded border-red-500/50 accent-red-500"
              />
              <span className="text-xs text-red-300">
                אני מודע/ת לחסימה ומאשר/ת לשבץ בכל זאת
              </span>
            </label>
          )}
        </div>
      )}

      {/* Booking conflicts — warning */}
      {hasConflicts && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
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
                  {(c.event_start_time || c.event_end_time) && (
                    <span className="font-mono opacity-70">
                      {" "}
                      {formatTime(c.event_start_time)}
                      {c.event_end_time && `–${formatTime(c.event_end_time)}`}
                    </span>
                  )}
                  {" · "}
                  {formatDate(c.event_date)}
                </span>
                <BookingStatusBadge status={c.status} />
              </div>
            ))}
          </div>
          {onConfirmChange && !hasBlocked && (
            <label className="mt-3 flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed ?? false}
                onChange={(e) => onConfirmChange(e.target.checked)}
                className="mt-0.5 size-4 rounded border-amber-500/50 accent-amber-500"
              />
              <span className="text-xs text-amber-300">
                אני מאשר/ת שמייה יכולה להופיע בשני האירועים
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
