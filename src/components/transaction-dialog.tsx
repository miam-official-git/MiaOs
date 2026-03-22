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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { FinanceTransaction } from "@/types/database";

const paymentMethodOptions = [
  { value: "bit", label: "ביט" },
  { value: "paybox", label: "פייבוקס" },
  { value: "cash", label: "מזומן" },
  { value: "check", label: "צ'ק" },
  { value: "bank_transfer", label: "העברה בנקאית" },
  { value: "morning_api", label: "מורנינג" },
];

const statusOptions = [
  { value: "pending", label: "ממתין" },
  { value: "completed", label: "הושלם" },
  { value: "failed", label: "נכשל" },
  { value: "refunded", label: "הוחזר" },
];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinanceTransaction | null;
  onSaved: () => void;
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSaved,
}: TransactionDialogProps) {
  const isEdit = !!transaction;

  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    transaction?.payment_method ?? "",
  );
  const [status, setStatus] = useState(transaction?.status ?? "pending");
  const [bookingId, setBookingId] = useState(transaction?.booking_id ?? "");
  const [lessonId, setLessonId] = useState(transaction?.lesson_id ?? "");
  const [dueDate, setDueDate] = useState(transaction?.due_date ?? "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setAmount(transaction?.amount?.toString() ?? "");
    setPaymentMethod(transaction?.payment_method ?? "");
    setStatus(transaction?.status ?? "pending");
    setBookingId(transaction?.booking_id ?? "");
    setLessonId(transaction?.lesson_id ?? "");
    setDueDate(transaction?.due_date ?? "");
    setNotes(transaction?.notes ?? "");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(
          `/api/finance/transactions/${transaction.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              payment_method: paymentMethod || null,
              notes: notes || null,
            }),
          },
        );
        if (res.ok) {
          onSaved();
          onOpenChange(false);
        }
      } else {
        const res = await fetch("/api/finance/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numAmount,
            payment_method: paymentMethod || null,
            status,
            booking_id: bookingId || null,
            lesson_id: lessonId || null,
            due_date: dueDate || null,
            notes: notes || null,
          }),
        });
        if (res.ok) {
          onSaved();
          onOpenChange(false);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת עסקה" : "עסקה חדשה"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "עדכון פרטי העסקה" : "הוספת עסקה חדשה למערכת"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              סכום (₪)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isEdit}
              dir="ltr"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              אמצעי תשלום
            </label>
            <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="בחר אמצעי תשלום">{paymentMethod ? paymentMethodOptions.find(o => o.value === paymentMethod)?.label : undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              סטטוס
            </label>
            <Select value={status} onValueChange={(val) => { if (val) setStatus(val as typeof status); }}>
              <SelectTrigger className="w-full">
                <SelectValue>{statusOptions.find(o => o.value === status)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Booking ID */}
          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                מזהה הזמנה (אופציונלי)
              </label>
              <Input
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="UUID"
                dir="ltr"
              />
            </div>
          )}

          {/* Lesson ID */}
          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                מזהה שיעור (אופציונלי)
              </label>
              <Input
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                placeholder="UUID"
                dir="ltr"
              />
            </div>
          )}

          {/* Due Date */}
          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                תאריך יעד לתשלום
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                dir="ltr"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              הערות
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "עדכון" : "צור עסקה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
