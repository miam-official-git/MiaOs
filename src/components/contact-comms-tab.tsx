"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogCommunicationDialog } from "@/components/log-communication-dialog";
import {
  Loader2,
  MessageCircle,
  Phone,
  Video,
  Mail,
  StickyNote,
  Plus,
  ChevronDown,
} from "lucide-react";
import type { UnifiedComm } from "@/lib/supabase-admin";

const typeConfig: Record<
  string,
  { icon: typeof Phone; label: string; borderColor: string }
> = {
  whatsapp: {
    icon: MessageCircle,
    label: "WhatsApp",
    borderColor: "border-l-green-500",
  },
  phone_call: {
    icon: Phone,
    label: "שיחת טלפון",
    borderColor: "border-l-blue-500",
  },
  meeting: {
    icon: Video,
    label: "פגישה",
    borderColor: "border-l-purple-500",
  },
  email: {
    icon: Mail,
    label: "אימייל",
    borderColor: "border-l-amber-500",
  },
  note: {
    icon: StickyNote,
    label: "הערה",
    borderColor: "border-l-gray-400",
  },
};

const filterOptions = [
  { value: "all", label: "הכל" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone_call", label: "שיחות" },
  { value: "meeting", label: "פגישות" },
  { value: "email", label: "אימייל" },
  { value: "note", label: "הערות" },
];

interface Props {
  contactId: string;
}

export function ContactCommsTab({ contactId }: Props) {
  const [items, setItems] = useState<UnifiedComm[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const LIMIT = 30;

  const fetchComms = useCallback(async (offset = 0, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/contacts/${contactId}/communications?limit=${LIMIT}&offset=${offset}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchComms();
  }, [fetchComms]);

  const filteredItems =
    filter === "all" ? items : items.filter((i) => i.type === filter);

  const hasMore = items.length < total;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Actions + Filter */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === opt.value
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="rounded-xl gap-1.5 shrink-0"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">רשום</span>
        </Button>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-6 text-center">
            {filter === "all" ? "אין תקשורת מתועדת" : "אין פריטים מסוג זה"}
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredItems.map((item) => {
              const config = typeConfig[item.type] ?? typeConfig.note;
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className={`py-3 border-l-2 ${config.borderColor} pr-0 pl-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            {config.label}
                          </span>
                          {item.direction && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {item.direction === "inbound" ? "נכנס" : "יוצא"}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/60">
                            · {item.author}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                          {item.content}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                      {new Date(item.created_at).toLocaleDateString("he-IL", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && filter === "all" && (
          <div className="flex justify-center pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl gap-1.5 text-muted-foreground"
              disabled={loadingMore}
              onClick={() => fetchComms(items.length, true)}
            >
              {loadingMore ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              טען עוד
            </Button>
          </div>
        )}
      </div>

      {/* Log Dialog */}
      <LogCommunicationDialog
        contactId={contactId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onLogged={() => fetchComms()}
      />
    </div>
  );
}
