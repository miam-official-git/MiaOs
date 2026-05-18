"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarGrid, type CalendarBooking, type BlockedDateRange } from "@/components/calendar-grid";
import { CalendarWeekView } from "@/components/calendar-week-view";
import { CalendarViewToggle } from "@/components/calendar-view-toggle";
import { BlockedPeriodDialog } from "@/components/blocked-period-dialog";
import { BookingDialog } from "@/components/booking-dialog";
import { ChevronLeft, ChevronRight, Loader2, Ban } from "lucide-react";
import type { CalendarEvent } from "@/lib/supabase-admin";

const bookingTypeOptions = [
  { value: "", label: "כל הסוגים" },
  { value: "vocal_lesson", label: "שיעור" },
  { value: "chuppah", label: "חופה" },
  { value: "private_event", label: "אירוע" },
  { value: "modeling", label: "דוגמנות" },
  { value: "other", label: "אחר" },
];

const statusOptions = [
  { value: "", label: "כל הסטטוסים" },
  { value: "new", label: "חדש" },
  { value: "option", label: "אופציה" },
  { value: "confirmed", label: "מאושר" },
  { value: "completed", label: "הושלם" },
  { value: "cancelled", label: "בוטל" },
];

interface BookingRow {
  id: string;
  booking_type: string;
  status: string;
  event_date: string;
  event_end_date: string | null;
  leads: {
    contacts: {
      full_name: string;
      phone: string | null;
    };
  };
}

interface BookingsResponse {
  bookings: BookingRow[];
  total: number;
  page: number;
  limit: number;
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const now = new Date();
  const monthParam = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);
  const yearParam = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const statusFilter = searchParams.get("status") ?? "";
  const typeFilter = searchParams.get("booking_type") ?? "";

  const [month, setMonth] = useState(monthParam);
  const [year, setYear] = useState(yearParam);
  const [view, setView] = useState<"month" | "week">("month");
  const [weekBase, setWeekBase] = useState(() => new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedDateRange[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [blockedInitialDate, setBlockedInitialDate] = useState<string>();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);

  const updateUrl = useCallback(
    (m: number, y: number, status?: string, type?: string) => {
      const params = new URLSearchParams();
      params.set("month", String(m));
      params.set("year", String(y));
      if (status) params.set("status", status);
      if (type) params.set("booking_type", type);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname],
  );

  // Fetch month-view bookings (existing API)
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("month", String(month));
      params.set("year", String(year));
      params.set("limit", "200");
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("booking_type", typeFilter);

      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (res.ok) {
        const data: BookingsResponse = await res.json();
        setBookings(
          data.bookings.map((b) => ({
            id: b.id,
            booking_type: b.booking_type,
            status: b.status,
            event_date: b.event_date,
            event_end_date: b.event_end_date,
            contact_name: b.leads?.contacts?.full_name ?? "",
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [month, year, statusFilter, typeFilter]);

  // Fetch blocked periods for month view
  const fetchBlockedPeriods = useCallback(async () => {
    try {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
      const res = await fetch(`/api/blocked-periods?start_date=${startDate}&end_date=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setBlockedPeriods(data.periods ?? []);
      }
    } catch { /* ignore */ }
  }, [year, month]);

  // Fetch week-view unified events
  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/events?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (view === "month") {
      fetchBookings();
      fetchBlockedPeriods();
    } else {
      fetchCalendarEvents();
    }
  }, [view, fetchBookings, fetchCalendarEvents, fetchBlockedPeriods]);

  const goToPrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m); setYear(y);
    updateUrl(m, y, statusFilter, typeFilter);
  };

  const goToNextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    setMonth(m); setYear(y);
    updateUrl(m, y, statusFilter, typeFilter);
  };

  const goToToday = () => {
    const today = new Date();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();
    setMonth(m); setYear(y);
    setWeekBase(today);
    updateUrl(m, y, statusFilter, typeFilter);
  };

  const goToPrevWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() - 7);
    setWeekBase(d);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const goToNextWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() + 7);
    setWeekBase(d);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const handleBookingClick = (bookingId: string) => {
    setEditBookingId(bookingId);
    setBookingDialogOpen(true);
  };

  const handleDayClick = (date: string) => {
    setBlockedInitialDate(date);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === "booking") {
      setEditBookingId(event.id);
      setBookingDialogOpen(true);
    }
  };

  const handleSlotClick = (_date: string, _hour: number) => {
    // Could open create booking with pre-filled date/time
  };

  const refreshAll = () => {
    if (view === "month") {
      fetchBookings();
      fetchBlockedPeriods();
    } else {
      fetchCalendarEvents();
    }
  };

  // Week label
  const weekDays = (() => {
    const d = new Date(weekBase);
    const dow = d.getDay();
    d.setDate(d.getDate() - dow);
    const start = new Date(d);
    d.setDate(d.getDate() + 6);
    return { start, end: new Date(d) };
  })();

  const weekLabel = `${weekDays.start.getDate()}/${weekDays.start.getMonth() + 1} — ${weekDays.end.getDate()}/${weekDays.end.getMonth() + 1}`;

  const HEBREW_MONTHS = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">יומן</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "month"
              ? `${HEBREW_MONTHS[month - 1]} ${year}`
              : weekLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setBlockedInitialDate(undefined);
              setBlockedDialogOpen(true);
            }}
          >
            <Ban className="size-3.5" />
            <span className="hidden sm:inline">חסום תקופה</span>
          </Button>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={view === "month" ? goToNextMonth : goToNextWeek}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            היום
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={view === "month" ? goToPrevMonth : goToPrevWeek}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        {/* View toggle */}
        <CalendarViewToggle view={view} onViewChange={setView} />

        {/* Filters (month view only) */}
        {view === "month" && (
          <div className="flex items-center gap-2 me-auto">
            <Select
              value={typeFilter}
              onValueChange={(val) => updateUrl(month, year, statusFilter, val ?? "")}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="כל הסוגים">
                  {bookingTypeOptions.find((o) => o.value === typeFilter)?.label ?? "כל הסוגים"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bookingTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => updateUrl(month, year, val ?? "", typeFilter)}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="כל הסטטוסים">
                  {statusOptions.find((o) => o.value === statusFilter)?.label ?? "כל הסטטוסים"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-border bg-card/50 p-2 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : view === "month" ? (
          <CalendarGrid
            year={year}
            month={month}
            bookings={bookings}
            blockedPeriods={blockedPeriods}
            onBookingClick={handleBookingClick}
            onDayClick={handleDayClick}
          />
        ) : (
          <CalendarWeekView
            baseDate={weekBase}
            events={calendarEvents}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
          />
        )}
      </div>

      {/* Dialogs */}
      <BlockedPeriodDialog
        open={blockedDialogOpen}
        onOpenChange={setBlockedDialogOpen}
        onCreated={refreshAll}
        initialDate={blockedInitialDate}
      />

      {bookingDialogOpen && editBookingId && (
        <BookingDialog
          mode="edit"
          bookingId={editBookingId}
          open={bookingDialogOpen}
          onOpenChange={(open) => {
            setBookingDialogOpen(open);
            if (!open) setEditBookingId(null);
          }}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BookingsContent />
    </Suspense>
  );
}
