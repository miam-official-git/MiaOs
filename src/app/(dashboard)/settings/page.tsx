"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Settings2,
  Zap,
  Clock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { AutomationRule } from "@/types/database";

const triggerLabels: Record<string, string> = {
  lead_stale: "ליד לא טופל",
  quote_unsigned: "הצעת מחיר לא חתומה",
  payment_overdue: "תשלום באיחור",
  post_event: "הודעת תודה אחרי אירוע",
  triage_stale: "טריאז׳ לא הושלם",
};

const triggerIcons: Record<string, string> = {
  lead_stale: "🆕",
  quote_unsigned: "📝",
  payment_overdue: "💰",
  post_event: "🎉",
  triage_stale: "💬",
};

export default function SettingsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDelay, setEditingDelay] = useState<string | null>(null);
  const [delayValue, setDelayValue] = useState("");

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/automations/rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleRule = async (rule: AutomationRule) => {
    const res = await fetch(`/api/automations/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    if (res.ok) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, is_active: !r.is_active } : r,
        ),
      );
    }
  };

  const saveDelay = async (ruleId: string) => {
    const hours = parseInt(delayValue, 10);
    if (isNaN(hours) || hours < 1) return;

    const res = await fetch(`/api/automations/rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay_hours: hours }),
    });
    if (res.ok) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId ? { ...r, delay_hours: hours } : r,
        ),
      );
      setEditingDelay(null);
    }
  };

  const formatDelay = (hours: number) => {
    if (hours < 24) return `${hours} שעות`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} ימים`;
    return `${days} ימים ו-${remainingHours} שעות`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings2 className="size-6" />
          הגדרות
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ניהול כללי אוטומציה ומעקב
        </p>
      </div>

      {/* Automation Rules */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="size-5" />
          כללי אוטומציה
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          כללים אלו רצים אוטומטית ויוצרים מעקבים ותזכורות
        </p>

        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className={`border-border transition-opacity ${!rule.is_active ? "opacity-50" : ""}`}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Icon */}
                <span className="text-2xl shrink-0">
                  {triggerIcons[rule.trigger_type] ?? "⚙️"}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {triggerLabels[rule.trigger_type] ?? rule.name}
                    </span>
                    {rule.is_active && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-500">
                        פעיל
                      </span>
                    )}
                  </div>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.description}
                    </p>
                  )}

                  {/* Delay */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="size-3 text-muted-foreground" />
                    {editingDelay === rule.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          value={delayValue}
                          onChange={(e) => setDelayValue(e.target.value)}
                          className="h-6 w-16 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveDelay(rule.id);
                            if (e.key === "Escape") setEditingDelay(null);
                          }}
                        />
                        <span className="text-xs text-muted-foreground">שעות</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => saveDelay(rule.id)}
                        >
                          שמור
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => {
                          setEditingDelay(rule.id);
                          setDelayValue(String(rule.delay_hours));
                        }}
                      >
                        השהייה: {formatDelay(rule.delay_hours)}
                      </button>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleRule(rule)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {rule.is_active ? (
                    <ToggleRight className="size-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="size-8" />
                  )}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
