"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AttendanceBadge } from "@/components/attendance-badge";
import { PaymentBadge } from "@/components/payment-badge";
import { LessonDialog } from "@/components/lesson-dialog";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface LessonRow {
  id: string;
  lead_id: string;
  lesson_number: number;
  total_lessons: number;
  scheduled_at: string;
  duration_minutes: number;
  attendance_status: string;
  payment_status: string;
  payment_amount: number | null;
  mia_notes: string | null;
  leads: {
    id: string;
    contact_id: string;
    contacts: { full_name: string; phone: string | null };
  };
}

interface LessonsResponse {
  lessons: LessonRow[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

const attendanceFilterOptions = [
  { value: "all", label: "כל הנוכחות" },
  { value: "scheduled", label: "מתוכנן" },
  { value: "attended", label: "נכח/ה" },
  { value: "no_show", label: "לא הגיע/ה" },
  { value: "cancelled", label: "בוטל" },
];

const paymentFilterOptions = [
  { value: "all", label: "כל התשלומים" },
  { value: "pending", label: "ממתין" },
  { value: "paid", label: "שולם" },
  { value: "overdue", label: "באיחור" },
];

function LessonsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const attendanceStatus = searchParams.get("attendance_status") ?? "";
  const paymentStatus = searchParams.get("payment_status") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";

  const [data, setData] = useState<LessonsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (attendanceStatus) params.set("attendance_status", attendanceStatus);
      if (paymentStatus) params.set("payment_status", paymentStatus);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/lessons?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [page, attendanceStatus, paymentStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openDetail = (id: string) => {
    setSelectedLessonId(id);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setSelectedLessonId(null);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">שיעורים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ניהול שיעורים, נוכחות ותשלומים
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            שיעור חדש
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={attendanceStatus || "all"}
          onValueChange={(val) => setFilter("attendance_status", val ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue>{attendanceFilterOptions.find(o => o.value === (attendanceStatus || "all"))?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {attendanceFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentStatus || "all"}
          onValueChange={(val) => setFilter("payment_status", val ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue>{paymentFilterOptions.find(o => o.value === (paymentStatus || "all"))?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {paymentFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setFilter("date_from", e.target.value)}
          className="w-40"
          placeholder="מתאריך"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setFilter("date_to", e.target.value)}
          className="w-40"
          placeholder="עד תאריך"
        />
      </div>

      {/* Mobile card view */}
      <div className="flex flex-col gap-3 md:hidden">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data?.lessons.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">לא נמצאו שיעורים</div>
        ) : (
          data?.lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => openDetail(lesson.id)}
              className="cursor-pointer rounded-lg border border-border bg-card/50 p-4 transition-colors active:bg-accent/50"
            >
              <div className="flex items-center justify-between mb-2">
                <Link
                  href={`/contacts/${lesson.leads.contact_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-foreground text-base hover:underline hover:text-primary transition-colors"
                >
                  {lesson.leads.contacts.full_name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  שיעור {lesson.lesson_number}/{lesson.total_lessons}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                <span>{formatDate(lesson.scheduled_at)}</span>
                <span>{lesson.duration_minutes} דק׳</span>
              </div>
              <div className="flex items-center gap-2">
                <AttendanceBadge status={lesson.attendance_status} />
                <PaymentBadge status={lesson.payment_status} />
              </div>
              {lesson.mia_notes && (
                <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-2">
                  {lesson.mia_notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block rounded-lg border border-border bg-card/50">
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-right text-muted-foreground">תלמיד/ה</TableHead>
                <TableHead className="text-right text-muted-foreground">שיעור #</TableHead>
                <TableHead className="text-right text-muted-foreground">תאריך</TableHead>
                <TableHead className="text-right text-muted-foreground">משך</TableHead>
                <TableHead className="text-right text-muted-foreground">נוכחות</TableHead>
                <TableHead className="text-right text-muted-foreground">תשלום</TableHead>
                <TableHead className="text-right text-muted-foreground">הערות מיה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.lessons.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    לא נמצאו שיעורים
                  </TableCell>
                </TableRow>
              ) : (
                data?.lessons.map((lesson) => (
                  <TableRow
                    key={lesson.id}
                    className="border-border hover:bg-accent/50 cursor-pointer"
                    onClick={() => openDetail(lesson.id)}
                  >
                    <TableCell className="font-medium text-foreground">
                      <Link
                        href={`/contacts/${lesson.leads.contact_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {lesson.leads.contacts.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lesson.lesson_number}/{lesson.total_lessons}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(lesson.scheduled_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lesson.duration_minutes} דק׳
                    </TableCell>
                    <TableCell>
                      <AttendanceBadge status={lesson.attendance_status} />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge status={lesson.payment_status} />
                    </TableCell>
                    <TableCell className="max-w-32 truncate text-muted-foreground">
                      {lesson.mia_notes ?? "—"}
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
          {data.total} שיעורים סה״כ
        </p>
      )}

      {/* Lesson Dialog */}
      <LessonDialog
        lessonId={selectedLessonId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchLessons}
      />
    </div>
  );
}

export default function LessonsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LessonsContent />
    </Suspense>
  );
}
