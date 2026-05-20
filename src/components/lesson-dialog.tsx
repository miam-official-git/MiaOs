"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { AttendanceStatus, PaymentStatus } from "@/types/database";
import { useAuth } from "@/components/auth-provider";

interface ClientOption {
  lead_id: string;
  full_name: string;
  phone: string | null;
}

interface LessonDetail {
  id: string;
  lead_id: string;
  lesson_number: number;
  total_lessons: number;
  scheduled_at: string;
  duration_minutes: number;
  attendance_status: AttendanceStatus;
  payment_status: PaymentStatus;
  payment_amount: number | null;
  mia_notes: string | null;
  leads?: { id: string; contact_id: string; contacts: { full_name: string; phone: string | null } };
}

interface LessonDialogProps {
  lessonId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const attendanceOptions: { value: AttendanceStatus; label: string }[] = [
  { value: "scheduled", label: "מתוכנן" },
  { value: "attended", label: "נכח/ה" },
  { value: "no_show", label: "לא הגיע/ה" },
  { value: "cancelled", label: "בוטל" },
];

const paymentOptions: { value: PaymentStatus; label: string }[] = [
  { value: "pending", label: "ממתין" },
  { value: "paid", label: "שולם" },
  { value: "overdue", label: "באיחור" },
];

export function LessonDialog({
  lessonId,
  open,
  onOpenChange,
  onSaved,
}: LessonDialogProps) {
  const isEdit = !!lessonId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [leadId, setLeadId] = useState("");
  const [lessonNumber, setLessonNumber] = useState(1);
  const [totalLessons, setTotalLessons] = useState(1);
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("scheduled");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [miaNotes, setMiaNotes] = useState("");
  const [studentHistory, setStudentHistory] = useState<{ id: string; lesson_number: number; total_lessons: number; scheduled_at: string; attendance_status: string; payment_status: string; mia_notes: string | null }[]>([]);
  const [showStudentCard, setShowStudentCard] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const resetForm = useCallback(() => {
    setLeadId("");
    setSelectedName("");
    setSearchQuery("");
    setLessonNumber(1);
    setTotalLessons(1);
    setScheduledAt("");
    setDurationMinutes(60);
    setAttendanceStatus("scheduled");
    setPaymentStatus("pending");
    setPaymentAmount("");
    setMiaNotes("");
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients?client_type=vocal_lesson&status=active");
      if (!res.ok) return;
      const data = await res.json();
      setClients(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.clients.map((c: any) => ({
          lead_id: c.lead_id,
          full_name: c.contacts.full_name,
          phone: c.contacts.phone,
        })),
      );
    } catch {
      // ignore
    }
  }, []);

  // Fetch lesson detail for edit mode
  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}`);
      if (!res.ok) return;
      const data: LessonDetail = await res.json();
      setLeadId(data.lead_id);
      setSelectedName(data.leads?.contacts?.full_name ?? "");
      setLessonNumber(data.lesson_number);
      setTotalLessons(data.total_lessons);
      setScheduledAt(data.scheduled_at.slice(0, 16)); // datetime-local format
      setDurationMinutes(data.duration_minutes);
      setAttendanceStatus(data.attendance_status);
      setPaymentStatus(data.payment_status);
      setPaymentAmount(data.payment_amount?.toString() ?? "");
      setMiaNotes(data.mia_notes ?? "");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (open) {
      fetchClients();
      if (isEdit) {
        fetchLesson();
      } else {
        resetForm();
      }
    }
  }, [open, isEdit, fetchClients, fetchLesson, resetForm]);

  // Fetch student lesson history when in edit mode
  useEffect(() => {
    if (!open || !isEdit || !leadId) {
      setStudentHistory([]);
      return;
    }
    fetch(`/api/lessons?lead_id=${leadId}&limit=50`)
      .then((r) => r.ok ? r.json() : { lessons: [] })
      .then((d) => setStudentHistory(d.lessons ?? []))
      .catch(() => setStudentHistory([]));
  }, [open, isEdit, leadId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/lessons/${lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attendance_status: attendanceStatus,
            payment_status: paymentStatus,
            payment_amount: paymentAmount ? Number(paymentAmount) : null,
            mia_notes: miaNotes || null,
            scheduled_at: scheduledAt,
            duration_minutes: durationMinutes,
            lesson_number: lessonNumber,
            total_lessons: totalLessons,
          }),
        });
        if (res.ok) {
          onSaved();
          onOpenChange(false);
        }
      } else {
        const res = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            lesson_number: lessonNumber,
            total_lessons: totalLessons,
            scheduled_at: scheduledAt,
            duration_minutes: durationMinutes,
            attendance_status: attendanceStatus,
            payment_status: paymentStatus,
            payment_amount: paymentAmount ? Number(paymentAmount) : null,
            mia_notes: miaNotes || null,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEdit ? "עריכת שיעור" : "שיעור חדש"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "עדכון פרטי השיעור" : "הוספת שיעור חדש למערכת"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {/* Student autocomplete */}
              <div className="relative">
                <label className="mb-1 block text-sm font-medium text-foreground">
                  תלמיד/ה
                </label>
                {isEdit ? (
                  <Input value={selectedName} disabled />
                ) : (
                  <>
                    <Input
                      placeholder="הקלד שם לחיפוש..."
                      value={searchQuery || selectedName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        setSelectedName("");
                        setLeadId("");
                        setShowSuggestions(val.length > 0);
                      }}
                      onFocus={() => {
                        if (searchQuery.length > 0 || clients.length > 0) {
                          setShowSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                    />
                    {showSuggestions && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md max-h-48 overflow-y-auto"
                      >
                        {clients
                          .filter((c) =>
                            !searchQuery || c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((c) => (
                            <button
                              key={c.lead_id}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors text-start"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setLeadId(c.lead_id);
                                setSelectedName(c.full_name);
                                setSearchQuery("");
                                setShowSuggestions(false);
                              }}
                            >
                              <span className="font-medium text-foreground">{c.full_name}</span>
                              {c.phone && (
                                <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                              )}
                            </button>
                          ))}
                        {clients.filter((c) =>
                          !searchQuery || c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            לא נמצאו לקוחות
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Lesson number & total */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    שיעור מספר
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={lessonNumber}
                    onChange={(e) => setLessonNumber(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    סה״כ שיעורים
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={totalLessons}
                    onChange={(e) => setTotalLessons(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Date & duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    תאריך ושעה
                  </label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    משך (דקות)
                  </label>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Payment amount */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  סכום תשלום (₪)
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <Separator />

              {/* Attendance status buttons */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  נוכחות
                </label>
                <div className="flex flex-wrap gap-2">
                  {attendanceOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={attendanceStatus === opt.value ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setAttendanceStatus(opt.value)}
                      disabled={!isAdmin}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Payment status */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  סטטוס תשלום
                </label>
                <Select
                  value={paymentStatus}
                  onValueChange={(val) => setPaymentStatus(val as PaymentStatus)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{paymentOptions.find(o => o.value === paymentStatus)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Mia notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  הערות מיה
                </label>
                <Textarea
                  value={miaNotes}
                  onChange={(e) => setMiaNotes(e.target.value)}
                  placeholder="הערות על השיעור..."
                  rows={3}
                />
              </div>
            </div>

            {/* Student Card — lesson history */}
            {isEdit && studentHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <button
                    type="button"
                    onClick={() => setShowStudentCard(!showStudentCard)}
                    className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-foreground/80"
                  >
                    <span>כרטיס תלמידה ({studentHistory.length} שיעורים)</span>
                    <span className="text-xs text-muted-foreground">
                      {showStudentCard ? "הסתר ▲" : "הצג ▼"}
                    </span>
                  </button>

                  {showStudentCard && (
                    <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>התקדמות</span>
                          <span>{studentHistory.filter(l => l.attendance_status === "attended").length}/{studentHistory[0]?.total_lessons ?? "?"}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{
                              width: `${Math.min(100, (studentHistory.filter(l => l.attendance_status === "attended").length / (studentHistory[0]?.total_lessons || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {studentHistory.map((h) => (
                        <div
                          key={h.id}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                            h.id === lessonId ? "bg-accent/80 border border-border" : "bg-accent/30"
                          }`}
                        >
                          <span className="font-medium text-foreground">#{h.lesson_number}</span>
                          <span className="text-muted-foreground">
                            {new Date(h.scheduled_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                          </span>
                          <span className={
                            h.attendance_status === "attended" ? "text-green-400" :
                            h.attendance_status === "no_show" ? "text-red-400" :
                            h.attendance_status === "cancelled" ? "text-zinc-400" : "text-blue-400"
                          }>
                            {h.attendance_status === "attended" ? "✓" : h.attendance_status === "no_show" ? "✗" : h.attendance_status === "cancelled" ? "–" : "◯"}
                          </span>
                          <span className={h.payment_status === "paid" ? "text-green-400" : h.payment_status === "overdue" ? "text-red-400" : "text-yellow-400"}>
                            {h.payment_status === "paid" ? "₪" : h.payment_status === "overdue" ? "₪!" : "₪?"}
                          </span>
                          {h.mia_notes && (
                            <span className="truncate text-muted-foreground/70 flex-1">{h.mia_notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || (!isEdit && !leadId)}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "שמור" : "צור שיעור"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
