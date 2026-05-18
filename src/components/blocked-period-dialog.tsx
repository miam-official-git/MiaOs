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
import { Loader2, Ban } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialDate?: string;
}

export function BlockedPeriodDialog({
  open,
  onOpenChange,
  onCreated,
  initialDate,
}: Props) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(initialDate ?? "");
  const [endDate, setEndDate] = useState(initialDate ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle("");
    setStartDate("");
    setEndDate("");
    setReason("");
  }

  async function handleSave() {
    if (!title.trim() || !startDate || !endDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/blocked-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create blocked period");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      console.error("[blocked-period] Save error:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-red-500" />
            חסימת תקופה
          </DialogTitle>
          <DialogDescription>
            סמן ימים שבהם מייה לא זמינה להופעות
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">כותרת *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='למשל: "חופה ביוון", "חופשה משפחתית"'
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">מתאריך *</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">עד תאריך *</label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">הערות</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="פרטים נוספים (אופציונלי)"
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
            disabled={saving || !title.trim() || !startDate || !endDate}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            חסום תקופה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
