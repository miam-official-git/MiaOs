"use client";

import { cn } from "@/lib/utils";
import { Music, Heart, PartyPopper, Camera, MoreHorizontal } from "lucide-react";

const typeConfig: Record<
  string,
  { label: string; icon: typeof Music }
> = {
  vocal_lesson: {
    label: "שיעור",
    icon: Music,
  },
  chuppah: {
    label: "חופה",
    icon: Heart,
  },
  private_event: {
    label: "אירוע",
    icon: PartyPopper,
  },
  modeling: {
    label: "דוגמנות",
    icon: Camera,
  },
  other: {
    label: "אחר",
    icon: MoreHorizontal,
  },
};

const statusToColor: Record<string, string> = {
  new: "yellow",
  option: "amber",
  confirmed: "green",
  completed: "green",
  cancelled: "gray",
};

const colorClasses: Record<string, { solid: string; dashed: string; muted: string }> = {
  yellow: {
    solid: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    dashed: "bg-yellow-500/10 text-yellow-300 border-yellow-500/40 border-dashed",
    muted: "bg-yellow-500/10 text-yellow-400/60",
  },
  amber: {
    solid: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    dashed: "bg-amber-500/10 text-amber-300 border-amber-500/40 border-dashed",
    muted: "bg-amber-500/10 text-amber-400/60",
  },
  green: {
    solid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    dashed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 border-dashed",
    muted: "bg-emerald-500/10 text-emerald-400/60",
  },
  gray: {
    solid: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
    dashed: "bg-zinc-500/10 text-zinc-300 border-zinc-500/40 border-dashed",
    muted: "bg-zinc-500/10 text-zinc-400/60",
  },
};

function getStatusStyle(status: string) {
  const color = statusToColor[status] ?? "gray";
  const palette = colorClasses[color] ?? colorClasses.gray;
  switch (status) {
    case "confirmed":
      return palette.solid;
    case "option":
      return palette.dashed;
    case "completed":
      return palette.muted;
    case "cancelled":
      return cn(palette.muted, "line-through");
    default:
      return palette.solid;
  }
}

interface BookingPillProps {
  bookingType: string;
  status: string;
  contactName: string;
  eventDate?: string;
  onClick?: () => void;
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function BookingPill({
  bookingType,
  status,
  contactName,
  eventDate,
  onClick,
}: BookingPillProps) {
  const config = typeConfig[bookingType] ?? typeConfig.other;
  const Icon = config.icon;
  const style = getStatusStyle(status);
  const time = formatTime(eventDate);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-tight transition-opacity hover:opacity-80",
        style,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {time && <span className="shrink-0 font-mono opacity-70">{time}</span>}
      <span className="truncate">{contactName || config.label}</span>
    </button>
  );
}

export { typeConfig as bookingTypeConfig };
