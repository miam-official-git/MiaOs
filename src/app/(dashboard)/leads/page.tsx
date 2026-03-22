"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/lead-filters";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { LeadDetailDialog } from "@/components/lead-detail-dialog";
import { CreateLeadDialog } from "@/components/create-lead-dialog";
import { BookingDialog } from "@/components/booking-dialog";
import { useLeadsRealtime } from "@/lib/realtime";
import { ChevronLeft, ChevronRight, Eye, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const leadTypeLabels: Record<string, string> = {
  vocal_lesson: "שיעור פיטנס קולי",
  chuppah: "שירה בחופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  other: "אחר",
};

interface LeadRow {
  id: string;
  lead_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  contacts: { full_name: string; phone: string | null; email: string | null };
}

interface LeadsResponse {
  leads: LeadRow[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

function LeadsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const status = searchParams.get("status") ?? "";
  const leadType = searchParams.get("lead_type") ?? "";
  const search = searchParams.get("search") ?? "";

  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bookingLeadId, setBookingLeadId] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (status) params.set("status", status);
      if (leadType) params.set("lead_type", leadType);
      if (search) params.set("search", search);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [page, status, leadType, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Supabase Realtime — refetch on any leads table change
  useLeadsRealtime(
    useCallback(() => {
      fetchLeads();
    }, [fetchLeads]),
  );

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openDetail = (id: string) => {
    setSelectedLeadId(id);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">לידים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ניהול לידים ומעקב אחרי סטטוס
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" />
            ליד חדש
          </Button>
        )}
      </div>

      {/* Filters */}
      <LeadFilters />

      {/* Table */}
      <div className="rounded-lg border border-border bg-card/50">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-right text-muted-foreground">שם</TableHead>
                <TableHead className="text-right text-muted-foreground">
                  טלפון
                </TableHead>
                <TableHead className="text-right text-muted-foreground">סוג</TableHead>
                <TableHead className="text-right text-muted-foreground">
                  סטטוס
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  הערות
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  תאריך
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  פעולות
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.leads.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    לא נמצאו לידים
                  </TableCell>
                </TableRow>
              ) : (
                data?.leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-border hover:bg-accent/50"
                  >
                    <TableCell className="font-medium text-foreground">
                      {lead.contacts.full_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground" dir="ltr">
                      {lead.contacts.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {leadTypeLabels[lead.lead_type] ?? lead.lead_type}
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="max-w-32 truncate text-muted-foreground">
                      {lead.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDetail(lead.id)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronRight className="size-4" />
            הקודם
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1,
              )
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) {
                  acc.push("...");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1 text-muted-foreground/70">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => goToPage(p as number)}
                    className="min-w-8"
                  >
                    {p}
                  </Button>
                ),
              )}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            הבא
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      )}

      {/* Total count */}
      {data && (
        <p className="text-center text-xs text-muted-foreground/70">
          {data.total} לידים סה״כ
        </p>
      )}

      {/* Create Dialog */}
      <CreateLeadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchLeads}
      />

      {/* Detail Dialog */}
      <LeadDetailDialog
        leadId={selectedLeadId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchLeads}
        onCreateBooking={(lid) => {
          setBookingLeadId(lid);
          setBookingDialogOpen(true);
        }}
      />

      {/* Booking Dialog (from lead conversion) */}
      <BookingDialog
        mode="create"
        leadId={bookingLeadId ?? undefined}
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        onSaved={fetchLeads}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}
