"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/supabase-admin";

const HEBREW_DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const HOURS_START = 7;
const HOURS_END = 24;
const HOUR_HEIGHT = 56; // px per hour slot

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - dow);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function getEventPosition(event: CalendarEvent) {
  const startMin = event.startTime ? timeToMinutes(event.startTime) : HOURS_START * 60;
  const endMin = event.endTime ? timeToMinutes(event.endTime) : startMin + 60;
  const topMin = Math.max(startMin - HOURS_START * 60, 0);
  const duration = Math.max(endMin - startMin, 30);
  const top = (topMin / 60) * HOUR_HEIGHT;
  const height = (duration / 60) * HOUR_HEIGHT;
  return { top, height: Math.max(height, 24) };
}

const typeColors: Record<string, string> = {
  booking: "bg-blue-500/20 border-blue-500/50 text-blue-300",
  lesson: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
  blocked: "bg-red-500/10 border-red-500/30 text-red-400",
};

const bookingTypeColors: Record<string, string> = {
  chuppah: "bg-pink-500/20 border-pink-500/50 text-pink-300",
  private_event: "bg-purple-500/20 border-purple-500/50 text-purple-300",
  modeling: "bg-amber-500/20 border-amber-500/50 text-amber-300",
  vocal_lesson: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
};

interface CalendarWeekViewProps {
  baseDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: string, hour: number) => void;
}

export function CalendarWeekView({
  baseDate,
  events,
  onEventClick,
  onSlotClick,
}: CalendarWeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(baseDate), [baseDate]);
  const todayStr = formatDateStr(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (event.type === "blocked") {
        // Blocked periods span multiple days
        const start = new Date(event.date);
        const end = event.endDate ? new Date(event.endDate) : start;
        const cur = new Date(start);
        while (cur <= end) {
          const ds = formatDateStr(cur);
          const arr = map.get(ds) ?? [];
          arr.push(event);
          map.set(ds, arr);
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        const ds = event.date.slice(0, 10);
        const arr = map.get(ds) ?? [];
        arr.push(event);
        map.set(ds, arr);
      }
    }
    return map;
  }, [events]);

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = HOURS_START; i < HOURS_END; i++) h.push(i);
    return h;
  }, []);

  const totalHeight = (HOURS_END - HOURS_START) * HOUR_HEIGHT;

  return (
    <div className="flex flex-col">
      {/* Day headers */}
      <div className="flex border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        {/* Time gutter */}
        <div className="w-12 shrink-0" />
        {weekDays.map((day, i) => {
          const ds = formatDateStr(day);
          const isToday = ds === todayStr;
          const isShabbat = i === 6;
          const isFriday = i === 5;
          return (
            <div
              key={ds}
              className={cn(
                "flex-1 text-center py-2 border-e border-border/40",
                isShabbat && "bg-rose-500/5",
                isFriday && "bg-amber-500/5",
              )}
            >
              <div className="text-[10px] text-muted-foreground">
                {HEBREW_DAYS_SHORT[i]}
              </div>
              <div
                className={cn(
                  "text-sm font-medium mt-0.5",
                  isToday
                    ? "bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto"
                    : "text-foreground",
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
        {/* Hour labels */}
        <div className="w-12 shrink-0">
          {hours.map((h) => (
            <div
              key={h}
              className="border-b border-border/30 text-[10px] text-muted-foreground/70 text-left pe-1.5 pt-0.5"
              style={{ height: HOUR_HEIGHT }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, dayIdx) => {
          const ds = formatDateStr(day);
          const dayEvents = eventsByDate.get(ds) ?? [];
          const isShabbat = dayIdx === 6;
          const isFriday = dayIdx === 5;

          const blockedEvents = dayEvents.filter((e) => e.type === "blocked");
          const timedEvents = dayEvents.filter((e) => e.type !== "blocked");

          // Calculate overlap groups for positioning
          const positioned = timedEvents.map((event) => {
            const pos = getEventPosition(event);
            return { event, ...pos };
          });

          return (
            <div
              key={ds}
              className={cn(
                "flex-1 border-e border-border/40 relative",
                isShabbat && "bg-rose-500/5",
                isFriday && "bg-amber-500/5",
              )}
              style={{ height: totalHeight }}
            >
              {/* Hour grid lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-b border-border/20 cursor-pointer hover:bg-accent/20 transition-colors"
                  style={{ top: (h - HOURS_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  onClick={() => onSlotClick?.(ds, h)}
                />
              ))}

              {/* Blocked period overlay */}
              {blockedEvents.length > 0 && (
                <div className="absolute inset-0 bg-red-500/8 z-[1] pointer-events-none flex items-center justify-center">
                  <span className="text-[9px] text-red-400/70 font-medium rotate-[-45deg] whitespace-nowrap">
                    {blockedEvents[0].title}
                  </span>
                </div>
              )}

              {/* Events */}
              {positioned.map(({ event, top, height }) => {
                const colorClass =
                  event.type === "booking"
                    ? bookingTypeColors[event.bookingType ?? ""] ?? typeColors.booking
                    : typeColors[event.type] ?? typeColors.booking;

                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className={cn(
                      "absolute inset-x-0.5 z-[2] rounded-md border px-1 py-0.5 cursor-pointer overflow-hidden transition-opacity hover:opacity-80",
                      colorClass,
                    )}
                    style={{ top, height: Math.min(height, totalHeight - top) }}
                  >
                    <div className="text-[10px] font-medium leading-tight truncate">
                      {event.startTime && (
                        <span className="font-mono opacity-70">{event.startTime} </span>
                      )}
                      {event.title}
                    </div>
                    {height > 28 && event.contactName && (
                      <div className="text-[9px] opacity-70 truncate">
                        {event.contactName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
