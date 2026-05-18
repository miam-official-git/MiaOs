"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Phone,
  Video,
  Mail,
  StickyNote,
} from "lucide-react";

const commTypes = [
  { value: "phone_call", label: "שיחת טלפון", icon: Phone, color: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800" },
  { value: "meeting", label: "פגישה", icon: Video, color: "bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800" },
  { value: "email", label: "אימייל", icon: Mail, color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800" },
  { value: "note", label: "הערה", icon: StickyNote, color: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-700" },
] as const;

const directions = [
  { value: "inbound", label: "נכנס" },
  { value: "outbound", label: "יוצא" },
] as const;

interface Props {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged: () => void;
}

export function LogCommunicationDialog({
  contactId,
  open,
  onOpenChange,
  onLogged,
}: Props) {
  const [commType, setCommType] = useState<string>("phone_call");
  const [direction, setDirection] = useState<string>("outbound");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  const showDirection = commType !== "note";

  function reset() {
    setCommType("phone_call");
    setDirection("outbound");
    setSummary("");
  }

  async function handleSave() {
    if (!summary.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comm_type: commType,
          direction: showDirection ? direction : null,
          summary: summary.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to log communication");
      reset();
      onOpenChange(false);
      onLogged();
    } catch (error) {
      console.error("[log-comm] Save error:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>רישום תקשורת</DialogTitle>
          <DialogDescription>
            תעד שיחה, פגישה, אימייל או הערה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector — pill grid */}
          <div>
            <label className="text-sm font-medium mb-2 block">סוג</label>
            <div className="grid grid-cols-2 gap-2">
              {commTypes.map((t) => {
                const Icon = t.icon;
                const active = commType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCommType(t.value)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? `${t.color} border-current ring-1 ring-current/20`
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70"
                    }`}
                  >
                    <Icon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direction — segmented control */}
          {showDirection && (
            <div>
              <label className="text-sm font-medium mb-2 block">כיוון</label>
              <div className="flex rounded-xl bg-muted/60 p-1">
                {directions.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDirection(d.value)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      direction === d.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              תוכן *
            </label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                commType === "phone_call"
                  ? "מה דובר בשיחה?"
                  : commType === "meeting"
                    ? "סיכום הפגישה..."
                    : commType === "email"
                      ? "תוכן המייל / נושא..."
                      : "כתוב הערה..."
              }
              rows={4}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !summary.trim()}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
