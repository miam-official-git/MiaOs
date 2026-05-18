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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneCall } from "lucide-react";

interface LogCallDialogProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function toLocalDatetime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LogCallDialog({
  leadId,
  open,
  onOpenChange,
  onSaved,
}: LogCallDialogProps) {
  const [callDate, setCallDate] = useState(() => toLocalDatetime(new Date()));
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setCallDate(toLocalDatetime(new Date()));
    setSummary("");
    setNextAction("");
  }

  async function handleSave() {
    if (!leadId || !summary.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/log-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime: new Date(callDate).toISOString(),
          summary: summary.trim(),
          next_action: nextAction.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to log call");
      reset();
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error("[log-call] Save error:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="size-5" />
            תיעוד שיחה
          </DialogTitle>
          <DialogDescription>
            תעד שיחת טלפון עם הליד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              תאריך ושעה
            </label>
            <Input
              type="datetime-local"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              תקציר השיחה *
            </label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="מה דובר בשיחה? מה הוחלט?"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              פעולה הבאה
            </label>
            <Textarea
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="מה צריך לעשות בהמשך? (ייצור תזכורת אוטומטית)"
              rows={2}
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
