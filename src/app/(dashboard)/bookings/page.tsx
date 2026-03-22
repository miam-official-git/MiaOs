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
import { CalendarGrid, type CalendarBooking } from "@/components/calendar-grid";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const goToPrevMonth = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
    updateUrl(m, y, statusFilter, typeFilter);
  };

  const goToNextMonth = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    updateUrl(m, y, statusFilter, typeFilter);
  };

  const goToToday = () => {
    const today = new Date();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();
    setMonth(m);
    setYear(y);
    updateUrl(m, y, statusFilter, typeFilter);
  };

  const handleBookingClick = (bookingId: string) => {
    // TODO: open booking detail dialog
    console.log("Booking clicked:", bookingId);
  };

  const handleDayClick = (date: string) => {
    // TODO: open new booking dialog for this date
    console.log("Day clicked:", date);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">הזמנות</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          לוח שנה חודשי וניהול הזמנות
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            היום
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goToPrevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 me-auto">
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              updateUrl(month, year, statusFilter, val ?? "");
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="כל הסוגים">{bookingTypeOptions.find(o => o.value === typeFilter)?.label ?? "כל הסוגים"}</SelectValue>
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
            onValueChange={(val) => {
              updateUrl(month, year, val ?? "", typeFilter);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="כל הסטטוסים">{statusOptions.find(o => o.value === statusFilter)?.label ?? "כל הסטטוסים"}</SelectValue>
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
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-border bg-card/50 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            bookings={bookings}
            onBookingClick={handleBookingClick}
            onDayClick={handleDayClick}
          />
        )}
      </div>
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
