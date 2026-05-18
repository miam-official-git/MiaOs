"use client";

interface CalendarViewToggleProps {
  view: "month" | "week";
  onViewChange: (view: "month" | "week") => void;
}

export function CalendarViewToggle({ view, onViewChange }: CalendarViewToggleProps) {
  return (
    <div className="flex rounded-xl bg-muted/60 p-1">
      <button
        type="button"
        onClick={() => onViewChange("month")}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
          view === "month"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        חודש
      </button>
      <button
        type="button"
        onClick={() => onViewChange("week")}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
          view === "week"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        שבוע
      </button>
    </div>
  );
}
