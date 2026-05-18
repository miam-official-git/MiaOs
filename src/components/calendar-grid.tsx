"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BookingPill } from "@/components/booking-pill";
import { getHolidays, getHolidayForDate, type HebrewHoliday } from "@/lib/hebrew-holidays";

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export interface CalendarBooking {
  id: string;
  booking_type: string;
  status: string;
  event_date: string;
  event_end_date: string | null;
  contact_name: string;
}

export interface BlockedDateRange {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

interface CalendarGridProps {
  year: number;
  month: number; // 1-based
  bookings: CalendarBooking[];
  blockedPeriods?: BlockedDateRange[];
  onBookingClick?: (bookingId: string) => void;
  onDayClick?: (date: string) => void;
}

interface DayCell {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateStr: string;
}

function buildCalendarDays(year: number, month: number): DayCell[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // First day of the month (0-indexed month)
  const firstDay = new Date(year, month - 1, 1);
  const startDow = firstDay.getDay(); // 0=Sun

  // Last day of the month
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  const cells: DayCell[] = [];

  // Days from previous month to fill the first row
  if (startDow > 0) {
    const prevLast = new Date(year, month - 1, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 2, prevLast - i);
      const ds = formatDateStr(d);
      cells.push({
        date: d,
        day: prevLast - i,
        isCurrentMonth: false,
        isToday: ds === todayStr,
        dateStr: ds,
      });
    }
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const ds = formatDateStr(date);
    cells.push({
      date,
      day: d,
      isCurrentMonth: true,
      isToday: ds === todayStr,
      dateStr: ds,
    });
  }

  // Fill remaining cells to complete the grid (always show 6 rows = 42 cells)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month, d);
    const ds = formatDateStr(date);
    cells.push({
      date,
      day: d,
      isCurrentMonth: false,
      isToday: ds === todayStr,
      dateStr: ds,
    });
  }

  return cells;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getBookingDates(booking: CalendarBooking): string[] {
  const dates: string[] = [];
  const start = new Date(booking.event_date);
  const end = booking.event_end_date ? new Date(booking.event_end_date) : start;

  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateStr(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function CalendarGrid({
  year,
  month,
  bookings,
  blockedPeriods = [],
  onBookingClick,
  onDayClick,
}: CalendarGridProps) {
  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);

  // Fetch Hebrew holidays
  const [holidays, setHolidays] = useState<HebrewHoliday[]>([]);
  useEffect(() => {
    getHolidays(year, month).then(setHolidays).catch(() => setHolidays([]));
  }, [year, month]);

  // Map date strings to blocked period titles
  const blockedByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const bp of blockedPeriods) {
      const start = new Date(bp.start_date);
      const end = new Date(bp.end_date);
      const cur = new Date(start);
      while (cur <= end) {
        map.set(formatDateStr(cur), bp.title);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [blockedPeriods]);

  // Map date strings to bookings for that day
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const booking of bookings) {
      const dates = getBookingDates(booking);
      for (const ds of dates) {
        const arr = map.get(ds) ?? [];
        arr.push(booking);
        map.set(ds, arr);
      }
    }
    return map;
  }, [bookings]);

  return (
    <div>
      {/* Month title */}
      <h2 className="mb-4 text-center text-lg font-semibold text-foreground">
        {HEBREW_MONTHS[month - 1]} {year}
      </h2>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {HEBREW_DAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "py-2 text-center text-xs font-medium",
              i === 6
                ? "text-rose-400 bg-rose-500/5"
                : i === 5
                  ? "text-amber-400 bg-amber-500/5"
                  : "text-muted-foreground",
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {days.map((cell) => {
          const dayBookings = bookingsByDate.get(cell.dateStr) ?? [];
          const dow = cell.date.getDay(); // 0=Sun, 5=Fri, 6=Sat
          const isShabbat = dow === 6;
          const isFriday = dow === 5;
          const holiday = getHolidayForDate(cell.dateStr, holidays);
          const blockedTitle = blockedByDate.get(cell.dateStr);
          const hasConflict = dayBookings.length > 1;
          return (
            <div
              key={cell.dateStr}
              onClick={(e) => {
                // Only fire onDayClick if the click wasn't on a booking pill
                if ((e.target as HTMLElement).closest("button")) return;
                onDayClick?.(cell.dateStr);
              }}
              className={cn(
                "min-h-24 cursor-pointer border-b border-e border-border/60 p-1 transition-colors hover:bg-accent/30",
                !cell.isCurrentMonth && "bg-muted/30",
                blockedTitle && "bg-red-500/8",
                hasConflict && !blockedTitle && "bg-amber-500/5",
                isShabbat && !blockedTitle && "bg-rose-500/5",
                isFriday && !blockedTitle && "bg-amber-500/5",
              )}
            >
              {/* Day number + holiday + blocked */}
              <div className="mb-0.5 flex items-center justify-between">
                {blockedTitle ? (
                  <span className="truncate text-[9px] leading-tight text-red-400 font-medium">
                    {blockedTitle}
                  </span>
                ) : holiday ? (
                  <span className={cn(
                    "truncate text-[9px] leading-tight",
                    holiday.isYomTov ? "text-rose-400 font-medium" : "text-amber-400/80",
                  )}>
                    {holiday.name}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs ms-auto",
                    cell.isToday
                      ? "bg-blue-500 font-bold text-white"
                      : cell.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {cell.day}
                </span>
              </div>

              {/* Booking pills */}
              <div className="flex flex-col gap-0.5">
                {dayBookings.slice(0, 3).map((booking) => (
                  <BookingPill
                    key={booking.id}
                    bookingType={booking.booking_type}
                    status={booking.status}
                    contactName={booking.contact_name}
                    eventDate={booking.event_date}
                    onClick={() => onBookingClick?.(booking.id)}
                  />
                ))}
                {dayBookings.length > 3 && (
                  <span className="text-center text-[10px] text-muted-foreground">
                    +{dayBookings.length - 3} עוד
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { HEBREW_MONTHS };
