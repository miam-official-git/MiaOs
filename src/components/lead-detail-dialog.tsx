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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { Loader2, Phone, Mail, User, Archive, Trash2, CalendarPlus, PhoneCall, UserCheck } from "lucide-react";
import type { ActivityLog } from "@/types/database";
import { useAuth } from "@/components/auth-provider";
import { LogCallDialog } from "@/components/log-call-dialog";

const leadTypeLabels: Record<string, string> = {
  vocal_lesson: "פיתוח קול",
  chuppah: "חופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  musical_production: "הפקה מוזיקלית",
  collaboration: "שיתוף פעולה",
  international_event: "אירוע בחו״ל",
  consultation: "פגישת ייעוץ",
  marriage_proposal: "הצעת נישואין",
  other: "אחר",
};

const metadataLabels: Record<string, string> = {
  wedding_date: "תאריך חתונה",
  venue: "אולם",
  venue_city: "עיר האולם",
  partner_name: "בן/בת זוג",
  event_date: "תאריך אירוע",
  event_location: "מיקום אירוע",
  event_type: "סוג אירוע",
  guest_count: "כמות אורחים",
  lesson_format: "פורמט שיעור",
  age: "גיל",
  shoot_date: "תאריך צילומים",
  shoot_location: "מיקום צילומים",
  shoot_duration: "אורך צילומים",
  brand_info: "מותג",
  project_type: "סוג פרויקט",
  deadline: "דדליין",
  collab_details: "פרטי שיתוף פעולה",
  focus_area: "תחום מיקוד",
  meeting_type: "סוג פגישה",
  proposal_date: "תאריך הצעה",
  proposal_location: "מיקום הצעה",
  service_details: "פרטי שירות",
  source: "מקור הגעה",
};

const statusOptions = [
  { value: "new", label: "חדש" },
  { value: "contacted", label: "נוצר קשר" },
  { value: "qualified", label: "מתאים" },
  { value: "quoted", label: "הוצעה הצעה" },
  { value: "negotiating", label: 'במו"מ' },
  { value: "converted", label: "הומר" },
  { value: "rejected", label: "נדחה" },
  { value: "lost", label: "אבוד" },
  { value: "archived", label: "בארכיון" },
];

interface LeadDetail {
  id: string;
  contact_id: string;
  lead_type: string;
  status: string;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contacts: { full_name: string; phone: string | null; email: string | null };
  activity_log: ActivityLog[];
}

interface LeadDetailDialogProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onCreateBooking?: (leadId: string) => void;
}

export function LeadDetailDialog({
  leadId,
  open,
  onOpenChange,
  onSaved,
  onCreateBooking,
}: LeadDetailDialogProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) return;
      const data: LeadDetail = await res.json();
      setLead(data);
      setEditStatus(data.status);
      setEditNotes(data.notes ?? "");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (open && leadId) {
      fetchLead();
    } else {
      setLead(null);
    }
  }, [open, leadId, fetchLead]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editStatus !== lead.status) body.status = editStatus;
      if (editNotes !== (lead.notes ?? "")) body.notes = editNotes;

      if (Object.keys(body).length === 0) {
        onOpenChange(false);
        return;
      }

      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}?action=archive`, { method: "DELETE" });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const handleConvertToClient = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: lead.contact_id,
          lead_id: lead.id,
          client_type: lead.lead_type,
        }),
      });
      if (res.ok) {
        if (lead.status !== "converted") {
          await fetch(`/api/leads/${lead.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "converted" }),
          });
        }
        onSaved();
        onOpenChange(false);
      } else {
        const err = await res.json();
        alert(err.error ?? "שגיאה ביצירת לקוח");
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : lead ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2 flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>{lead.contacts.full_name}</DialogTitle>
                <DialogDescription>
                  {leadTypeLabels[lead.lead_type] ?? lead.lead_type}
                </DialogDescription>
              </DialogHeader>

              {/* Contact Info */}
              <div className="flex flex-col gap-2 text-sm text-foreground">
                {lead.contacts.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <span dir="ltr">{lead.contacts.phone}</span>
                  </div>
                )}
                {lead.contacts.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <span>{lead.contacts.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span>נוצר: {formatDate(lead.created_at)}</span>
                </div>
              </div>

              <Separator />

              {/* Editable Fields */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    סטטוס
                  </label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus(val ?? "")} disabled={!isAdmin}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{statusOptions.find(o => o.value === editStatus)?.label}</SelectValue>
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

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    הערות
                  </label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="הוסף הערות..."
                    rows={3}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              {/* Metadata */}
              {lead.metadata &&
                Object.keys(lead.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-foreground">
                        מידע נוסף
                      </h4>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {Object.entries(lead.metadata).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-muted-foreground">{metadataLabels[key] ?? key}: </span>
                            <span>{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              {/* Activity Log */}
              {lead.activity_log.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-foreground">
                      לוג פעילות
                    </h4>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {lead.activity_log.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-2 rounded-md bg-accent/50 px-3 py-2 text-xs"
                        >
                          <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                          <div className="flex-1">
                            <span className="font-medium text-foreground">
                              {entry.action}
                            </span>
                            {entry.details && Object.keys(entry.details).length > 0 && (
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

              {/* Convert to client */}
              {isAdmin && lead && lead.status !== "converted" && (
                <>
                  <Separator />
                  <Button
                    onClick={handleConvertToClient}
                    disabled={saving}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    <UserCheck className="size-4" />
                    העבר ללקוח
                  </Button>
                </>
              )}

              {/* Confirm bar */}
              {confirmAction && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-foreground">
                    {confirmAction === "archive"
                      ? "להעביר ליד זה לארכיון?"
                      : "למחוק ליד זה? (לא ניתן לשחזר)"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmAction(null)}
                      disabled={saving}
                    >
                      ביטול
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={confirmAction === "archive" ? handleArchive : handleDelete}
                      disabled={saving}
                    >
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      {confirmAction === "archive" ? "העבר לארכיון" : "מחק"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t bg-background px-6 py-3">
              <div className="flex w-full items-center justify-between">
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmAction("archive")}
                      disabled={saving || lead?.status === "archived"}
                    >
                      <Archive className="size-4" />
                      ארכיון
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmAction("delete")}
                      disabled={saving}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      מחיקה
                    </Button>
                  </div>
                ) : <div />}
                <div className="flex items-center gap-2">
                  {isAdmin && leadId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogCallOpen(true)}
                    >
                      <PhoneCall className="size-4" />
                      תעד שיחה
                    </Button>
                  )}
                  {isAdmin && onCreateBooking && leadId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onCreateBooking(leadId);
                      }}
                    >
                      <CalendarPlus className="size-4" />
                      צור הזמנה
                    </Button>
                  )}
                  {isAdmin && (
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      שמור
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>

      <LogCallDialog
        leadId={leadId}
        open={logCallOpen}
        onOpenChange={setLogCallOpen}
        onSaved={() => {
          setLogCallOpen(false);
          if (leadId) fetchLead();
        }}
      />
    </Dialog>
  );
}
