"use client";

import { useCallback, useEffect, useState } from "react";
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
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { ConflictWarning } from "@/components/conflict-warning";
import { QuoteBuilder, type QuoteComponent } from "@/components/quote-builder";
import { Loader2 } from "lucide-react";
import type {
  BookingStatus,
  LeadType,
  ActivityLog,
  ComponentType,
} from "@/types/database";

// ---- Constants ----

const bookingTypeOptions: { value: LeadType; label: string }[] = [
  { value: "vocal_lesson", label: "שיעור פיטנס קולי" },
  { value: "chuppah", label: "שירה בחופה" },
  { value: "private_event", label: "אירוע פרטי" },
  { value: "modeling", label: "דוגמנות" },
  { value: "other", label: "אחר" },
];

const bookingStatusOptions: { value: BookingStatus; label: string }[] = [
  { value: "new", label: "חדש" },
  { value: "option", label: "אופציה" },
  { value: "confirmed", label: "מאושר" },
  { value: "completed", label: "הושלם" },
  { value: "cancelled", label: "בוטל" },
];

// ---- Types ----

interface ConflictBooking {
  id: string;
  booking_type: string;
  event_date: string;
  status: string;
  contact_name?: string;
}

interface BookingDetail {
  id: string;
  lead_id: string;
  booking_type: LeadType;
  status: BookingStatus;
  event_date: string;
  event_end_date: string | null;
  location_city: string | null;
  location_address: string | null;
  notes: string | null;
  components: QuoteComponent[];
  contact?: { full_name: string; phone: string | null; email: string | null };
  activity_log?: ActivityLog[];
}

interface BookingDialogProps {
  mode: "create" | "edit";
  leadId?: string;
  bookingId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

// ---- Helpers ----

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---- Component ----

export function BookingDialog({
  mode,
  leadId,
  bookingId,
  open,
  onOpenChange,
  onSaved,
}: BookingDialogProps) {
  // Form state
  const [bookingType, setBookingType] = useState<LeadType>("chuppah");
  const [status, setStatus] = useState<BookingStatus>("new");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [components, setComponents] = useState<QuoteComponent[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictBooking[]>([]);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [warmIntroDone, setWarmIntroDone] = useState(false);

  // ---- Load existing booking (edit mode) ----

  const fetchBooking = useCallback(async () => {
    if (mode !== "edit" || !bookingId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) return;
      const data: BookingDetail = await res.json();
      setBooking(data);
      setBookingType(data.booking_type);
      setStatus(data.status);
      setEventDate(data.event_date?.slice(0, 16) ?? "");
      setEventEndDate(data.event_end_date?.slice(0, 16) ?? "");
      setLocationCity(data.location_city ?? "");
      setLocationAddress(data.location_address ?? "");
      setNotes(data.notes ?? "");
      setComponents(
        (data.components ?? []).map((c) => ({
          id: c.id,
          component_type: c.component_type,
          description: c.description ?? "",
          cost: c.cost,
          is_revenue: c.is_revenue,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [mode, bookingId]);

  // ---- Auto-populate from lead data (create mode) ----

  const fetchLeadData = useCallback(async () => {
    if (mode !== "create" || !leadId) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) return;
      const lead = await res.json();

      if (lead.lead_type) setBookingType(lead.lead_type);

      const meta = lead.metadata ?? {};
      const dateStr = meta.wedding_date || meta.event_date || meta.proposal_date || meta.shoot_date;
      if (dateStr) {
        const defaultStartTimes: Record<string, string> = {
          chuppah: "18:00",
          private_event: "19:00",
          vocal_lesson: "10:00",
        };
        const defaultEndTimes: Record<string, string> = {
          chuppah: "23:00",
          private_event: "23:00",
          vocal_lesson: "11:00",
        };
        const type = lead.lead_type || "other";
        const startTime = defaultStartTimes[type] ?? "18:00";
        const endTime = defaultEndTimes[type] ?? "23:00";
        setEventDate(`${dateStr}T${startTime}`);
        setEventEndDate(`${dateStr}T${endTime}`);
      }

      if (meta.venue) setLocationAddress(String(meta.venue));
      if (meta.city || meta.venue_city) setLocationCity(String(meta.city || meta.venue_city));
      if (meta.event_location) setLocationCity(String(meta.event_location));
    } catch {
      /* ignore — user can fill manually */
    }
  }, [mode, leadId]);

  // Check if warm intro is done for chuppah bookings
  useEffect(() => {
    if (!open || bookingType !== "chuppah") {
      setWarmIntroDone(true); // non-chuppah always unlocked
      return;
    }
    const lid = mode === "edit" ? booking?.lead_id : leadId;
    if (!lid) { setWarmIntroDone(false); return; }

    fetch(`/api/follow-ups?lead_id=${lid}&type=warm_intro&status=done`)
      .then((r) => r.ok ? r.json() : { follow_ups: [] })
      .then((d) => setWarmIntroDone((d.follow_ups ?? []).length > 0))
      .catch(() => setWarmIntroDone(false));
  }, [open, bookingType, leadId, booking?.lead_id, mode]);

  useEffect(() => {
    if (open) {
      if (mode === "edit") {
        fetchBooking();
      } else {
        // Reset form for create mode
        setBooking(null);
        setBookingType("chuppah");
        setStatus("new");
        setEventDate("");
        setEventEndDate("");
        setLocationCity("");
        setLocationAddress("");
        setNotes("");
        setComponents([]);
        setConflicts([]);
        fetchLeadData();
      }
    }
  }, [open, mode, fetchBooking, fetchLeadData]);

  // ---- Conflict detection ----

  useEffect(() => {
    if (!eventDate) {
      setConflicts([]);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ date: eventDate });
    if (eventEndDate) params.set("end_date", eventEndDate);
    if (mode === "edit" && bookingId) params.set("exclude_id", bookingId);

    fetch(`/api/bookings/conflicts?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { conflicts: [] }))
      .then((data) => setConflicts(data.conflicts ?? []))
      .catch(() => {
        /* aborted or network error */
      });

    return () => controller.abort();
  }, [eventDate, eventEndDate, mode, bookingId]);

  // ---- Save ----

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === "create") {
        const body = {
          lead_id: leadId,
          booking_type: bookingType,
          event_date: eventDate,
          event_end_date: eventEndDate || undefined,
          location_city: locationCity || undefined,
          location_address: locationAddress || undefined,
          notes: notes || undefined,
          components: components.map((c) => ({
            component_type: c.component_type,
            description: c.description || undefined,
            cost: c.cost,
            is_revenue: c.is_revenue,
          })),
        };
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          onSaved();
          onOpenChange(false);
        }
      } else if (mode === "edit" && bookingId) {
        const body: Record<string, unknown> = {};
        if (booking) {
          if (status !== booking.status) body.status = status;
          if (eventDate !== booking.event_date?.slice(0, 16)) body.event_date = eventDate;
          if (eventEndDate !== (booking.event_end_date?.slice(0, 16) ?? ""))
            body.event_end_date = eventEndDate || null;
          if (locationCity !== (booking.location_city ?? ""))
            body.location_city = locationCity || null;
          if (locationAddress !== (booking.location_address ?? ""))
            body.location_address = locationAddress || null;
          if (notes !== (booking.notes ?? "")) body.notes = notes || null;
        }
        if (Object.keys(body).length > 0) {
          const res = await fetch(`/api/bookings/${bookingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            onSaved();
            onOpenChange(false);
          }
        } else {
          onOpenChange(false);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  // ---- Component CRUD (edit mode — persisted immediately) ----

  async function handleAddComponent(comp: Omit<QuoteComponent, "id">) {
    if (mode === "edit" && bookingId) {
      const res = await fetch(`/api/bookings/${bookingId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comp),
      });
      if (res.ok) {
        const added = await res.json();
        setComponents((prev) => [...prev, added]);
      }
    } else {
      setComponents((prev) => [...prev, { ...comp }]);
    }
  }

  async function handleRemoveComponent(componentId: string) {
    if (mode === "edit" && bookingId) {
      const res = await fetch(`/api/bookings/${bookingId}/components`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ component_id: componentId }),
      });
      if (res.ok) {
        setComponents((prev) => prev.filter((c) => c.id !== componentId));
      }
    } else {
      setComponents((prev) => prev.filter((c) => c.id !== componentId));
    }
  }

  // ---- Render ----

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2 flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>
                  {mode === "create" ? "הזמנה חדשה" : "עריכת הזמנה"}
                </DialogTitle>
                {mode === "edit" && booking?.contact && (
                  <DialogDescription>
                    {booking.contact.full_name}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Form fields */}
              <div className="flex flex-col gap-3">
              {/* Booking type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  סוג הזמנה
                </label>
                <Select
                  value={bookingType}
                  onValueChange={(val) => setBookingType(val as LeadType)}
                  disabled={mode === "edit"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{bookingTypeOptions.find(o => o.value === bookingType)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {bookingTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status (edit only) */}
              {mode === "edit" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    סטטוס
                  </label>
                  <Select
                    value={status}
                    onValueChange={(val) => setStatus(val as BookingStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{bookingStatusOptions.find(o => o.value === status)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {bookingStatusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Event dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    תאריך ושעת התחלה
                  </label>
                  <Input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    תאריך ושעת סיום
                  </label>
                  <Input
                    type="datetime-local"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Conflict warning */}
              <ConflictWarning conflicts={conflicts} />

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    עיר
                  </label>
                  <Input
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    placeholder="תל אביב"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    כתובת
                  </label>
                  <Input
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="רחוב, מספר"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  הערות
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות להזמנה..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Quote builder */}
            <QuoteBuilder
              components={components}
              onChange={setComponents}
              onAdd={mode === "edit" && bookingId ? handleAddComponent : undefined}
              onRemove={mode === "edit" && bookingId ? handleRemoveComponent : undefined}
              locked={bookingType === "chuppah" && !warmIntroDone}
              lockedMessage="חופה: יש לבצע חימום אישי (הודעה קולית) לפני שליחת הצעת מחיר. סמן מעקב 'חימום ליד' כבוצע כדי לפתוח."
            />

            {/* Activity log (edit mode) */}
            {mode === "edit" &&
              booking?.activity_log &&
              booking.activity_log.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-foreground">
                      לוג פעילות
                    </h4>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {booking.activity_log.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-2 rounded-md bg-accent/50 px-3 py-2 text-xs"
                        >
                          <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                          <div className="flex-1">
                            <span className="font-medium text-foreground">
                              {entry.action}
                            </span>
                            {entry.details &&
                              Object.keys(entry.details).length > 0 && (
                                <span className="text-muted-foreground">
                                  {" — "}
                                  {JSON.stringify(entry.details)}
                                </span>
                              )}
                            <div className="mt-0.5 text-muted-foreground/70">
                              {formatDate(entry.created_at)} · {entry.actor}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

            </div>

            <DialogFooter className="border-t bg-background px-6 py-3">
              <Button
                onClick={handleSave}
                disabled={saving || !eventDate}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {mode === "create" ? "צור הזמנה" : "שמור"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
