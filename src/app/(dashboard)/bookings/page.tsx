"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingDialog } from "@/components/booking-dialog";
import { CreateQuoteDialog } from "@/components/create-quote-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Eye,
  ClipboardList,
  FileText,
} from "lucide-react";

const typeLabels: Record<string, string> = {
  vocal_lesson: "שיעור",
  chuppah: "חופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  other: "אחר",
};

const statusLabels: Record<string, string> = {
  new: "חדש",
  option: "אופציה",
  confirmed: "מאושר",
  completed: "הושלם",
  cancelled: "בוטל",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500",
  option: "bg-amber-500/10 text-amber-500",
  confirmed: "bg-green-500/10 text-green-500",
  completed: "bg-emerald-600/10 text-emerald-600",
  cancelled: "bg-red-500/10 text-red-500",
};

const bookingTypeOptions = [
  { value: "", label: "כל הסוגים" },
  { value: "vocal_lesson", label: "שיעור" },
  { value: "chuppah", label: "חופה" },
  { value: "private_event", label: "אירוע" },
  { value: "modeling", label: "דוגמנות" },
  { value: "other", label: "אחר" },
];

const statusOptions = [
  { value: "", label: "כל הסטטוסים" },
  { value: "new", label: "חדש" },
  { value: "option", label: "אופציה" },
  { value: "confirmed", label: "מאושר" },
  { value: "completed", label: "הושלם" },
  { value: "cancelled", label: "בוטל" },
];

interface BookingRow {
  id: string;
  booking_type: string;
  status: string;
  event_date: string;
  event_end_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  total_price: number;
  location_city: string | null;
  quote_sent_at: string | null;
  quote_signed_at: string | null;
  leads: {
    id: string;
    contact_id: string;
    contacts: {
      full_name: string;
      phone: string | null;
      email: string | null;
    };
  };
}

interface BookingsResponse {
  bookings: BookingRow[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

function formatCurrency(n: number) {
  return `₪${n.toLocaleString("he-IL")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const statusFilter = searchParams.get("status") ?? "";
  const typeFilter = searchParams.get("booking_type") ?? "";

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteBooking, setQuoteBooking] = useState<BookingRow | null>(null);

  const totalPages = Math.ceil(total / LIMIT);

  const updateUrl = useCallback(
    (p: number, status: string, type: string) => {
      const params = new URLSearchParams();
      if (p > 1) params.set("page", String(p));
      if (status) params.set("status", status);
      if (type) params.set("booking_type", type);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname],
  );

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("booking_type", typeFilter);

      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (res.ok) {
        const data: BookingsResponse = await res.json();
        setBookings(data.bookings);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleEdit = (id: string) => {
    setEditBookingId(id);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditBookingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">הזמנות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} הזמנות
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={typeFilter}
          onValueChange={(val) => updateUrl(1, statusFilter, val ?? "")}
        >
          <SelectTrigger size="sm" className="flex-1 sm:w-32 sm:flex-none">
            <SelectValue placeholder="כל הסוגים">
              {bookingTypeOptions.find((o) => o.value === typeFilter)?.label ?? "כל הסוגים"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {bookingTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(val) => updateUrl(1, val ?? "", typeFilter)}
        >
          <SelectTrigger size="sm" className="flex-1 sm:w-36 sm:flex-none">
            <SelectValue placeholder="כל הסטטוסים">
              {statusOptions.find((o) => o.value === statusFilter)?.label ?? "כל הסטטוסים"}
            </SelectValue>
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ClipboardList className="size-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">אין הזמנות</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-2xl border border-border bg-card/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">לקוח</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">סוג</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">תאריך</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">שעה</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">מיקום</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">מחיר</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">סטטוס</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">הצעה</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const contact = b.leads?.contacts;
                  const contactId = b.leads?.contact_id;
                  const hasQuote = !!b.quote_sent_at;
                  const quoteSigned = !!b.quote_signed_at;

                  return (
                    <tr
                      key={b.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {contactId ? (
                          <Link
                            href={`/contacts/${contactId}`}
                            className="font-medium text-foreground hover:text-blue-500 transition-colors"
                          >
                            {contact?.full_name ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {typeLabels[b.booking_type] ?? b.booking_type}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatDate(b.event_date)}
                        {b.event_end_date && b.event_end_date !== b.event_date && (
                          <span className="text-muted-foreground"> — {formatDate(b.event_end_date)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                        {b.event_start_time
                          ? `${formatTime(b.event_start_time)}${b.event_end_time ? `–${formatTime(b.event_end_time)}` : ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {b.location_city ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formatCurrency(b.total_price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[b.status] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {statusLabels[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasQuote ? (
                          quoteSigned ? (
                            <span className="text-xs text-green-500 font-medium">חתום ✓</span>
                          ) : (
                            <span className="text-xs text-amber-500 font-medium">נשלח</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setQuoteBooking(b);
                              setQuoteDialogOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                            title="הצעת מחיר"
                          >
                            <FileText className="size-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(b.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                            title="צפייה"
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {bookings.map((b) => {
              const contact = b.leads?.contacts;
              const contactId = b.leads?.contact_id;

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-border bg-card/50 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      {contactId ? (
                        <Link
                          href={`/contacts/${contactId}`}
                          className="font-medium text-foreground hover:text-blue-500 transition-colors"
                        >
                          {contact?.full_name ?? "—"}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">—</span>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {typeLabels[b.booking_type] ?? b.booking_type}
                        {b.location_city && ` · ${b.location_city}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${statusColors[b.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {statusLabels[b.status] ?? b.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-foreground">{formatDate(b.event_date)}</span>
                      {b.event_start_time && (
                        <span className="text-muted-foreground" dir="ltr">
                          {formatTime(b.event_start_time)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {formatCurrency(b.total_price)}
                      </span>
                      <button
                        onClick={() => {
                          setQuoteBooking(b);
                          setQuoteDialogOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                      >
                        <FileText className="size-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(b.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages}
                onClick={() => updateUrl(page + 1, statusFilter, typeFilter)}
              >
                <ChevronRight className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => updateUrl(page - 1, statusFilter, typeFilter)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      {dialogOpen && editBookingId && (
        <BookingDialog
          mode="edit"
          bookingId={editBookingId}
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onSaved={fetchBookings}
        />
      )}

      {/* Quote Dialog */}
      {quoteDialogOpen && quoteBooking && (
        <CreateQuoteDialog
          open={quoteDialogOpen}
          onOpenChange={(open) => {
            setQuoteDialogOpen(open);
            if (!open) setQuoteBooking(null);
          }}
          booking={quoteBooking}
          onCreated={() => fetchBookings()}
        />
      )}
    </div>
  );
}

export default function BookingsManagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BookingsContent />
    </Suspense>
  );
}
