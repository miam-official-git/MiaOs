"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Activity } from "lucide-react";
import type { ActivityLog } from "@/types/database";

const actorLabels: Record<string, string> = {
  omer: "עומר",
  mia: "מייה",
  system: "מערכת",
  bot: "בוט",
};

const actionLabels: Record<string, string> = {
  created_manually: "נוצר ידנית",
  created_via_triage: "נוצר מטריאז׳",
  status_changed: "סטטוס שונה",
  converted: "הומר להזמנה",
  archived: "הועבר לארכיון",
  deleted: "נמחק",
  call_logged: "שיחה נרשמה",
};

interface Props {
  contactId: string;
}

export function ContactActivityTab({ contactId }: Props) {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/activity`);
      if (res.ok) setActivity(await res.json());
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">לוג פעילות</h3>
        <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
          {activity.length}
        </span>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 py-3 text-center">
          אין פעילות מתועדת
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {activity.map((entry) => (
            <div key={entry.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-sm text-foreground">
                    {actionLabels[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {actorLabels[entry.actor] ?? entry.actor}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground/70 shrink-0">
                  {new Date(entry.created_at).toLocaleDateString("he-IL", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {entry.details &&
                Object.keys(entry.details).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 mr-4">
                    {Object.entries(entry.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </p>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
