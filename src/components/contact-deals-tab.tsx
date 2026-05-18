"use client";

import { useCallback, useEffect, useState } from "react";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { AttendanceBadge } from "@/components/attendance-badge";
import { Loader2, FileText, CalendarDays, Music } from "lucide-react";

const leadTypeLabels: Record<string, string> = {
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

interface Props {
  contactId: string;
}

export function ContactDealsTab({ contactId }: Props) {
  const [leads, setLeads] = useState<Record<string, unknown>[]>([]);
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
  const [lessons, setLessons] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, bookingsRes, lessonsRes] = await Promise.all([
        fetch(`/api/contacts/${contactId}/leads`),
        fetch(`/api/contacts/${contactId}/bookings`),
        fetch(`/api/contacts/${contactId}/lessons`),
      ]);
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (lessonsRes.ok) setLessons(await lessonsRes.json());
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Leads */}
      <Section
        icon={<FileText className="size-4" />}
        title="לידים"
        count={leads.length}
        empty="אין לידים"
      >
        {leads.map((lead) => (
          <div
            key={lead.id as string}
            className="flex items-center justify-between gap-2 py-2.5 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground">
                {leadTypeLabels[(lead.lead_type as string)] ?? (lead.lead_type as string)}
              </span>
              <LeadStatusBadge status={lead.status as string} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDate(lead.created_at as string)}
            </span>
          </div>
        ))}
      </Section>

      {/* Bookings */}
      <Section
        icon={<CalendarDays className="size-4" />}
        title="הזמנות"
        count={bookings.length}
        empty="אין הזמנות"
      >
        {bookings.map((b) => (
          <div
            key={b.id as string}
            className="flex items-center justify-between gap-2 py-2.5 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground">
                {leadTypeLabels[(b.booking_type as string)] ?? (b.booking_type as string)}
              </span>
              <BookingStatusBadge status={b.status as string} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatDate(b.event_date as string)}
              </span>
              {b.total_price != null && (
                <span className="text-xs font-medium text-foreground" dir="ltr">
                  ₪{Number(b.total_price).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </Section>

      {/* Lessons */}
      <Section
        icon={<Music className="size-4" />}
        title="שיעורים"
        count={lessons.length}
        empty="אין שיעורים"
      >
        {lessons.map((l) => (
          <div
            key={l.id as string}
            className="flex items-center justify-between gap-2 py-2.5 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground">
                שיעור {l.lesson_number as number}/{l.total_lessons as number}
              </span>
              <AttendanceBadge status={l.attendance_status as string} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDate(l.scheduled_at as string)}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground/70 py-3 text-center">
          {empty}
        </p>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}
