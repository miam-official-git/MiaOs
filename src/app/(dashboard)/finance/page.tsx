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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionStatusBadge } from "@/components/transaction-status-badge";
import { TransactionDialog } from "@/components/transaction-dialog";
import { WhatsAppReminder } from "@/components/whatsapp-reminder";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Eye,
  DollarSign,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";
import type { FinanceTransaction, Debtor, ComponentType } from "@/types/database";
import { useAuth } from "@/components/auth-provider";

const componentTypeLabels: Record<string, string> = {
  talent_fee: "שכר אמן",
  pianist: "פסנתרן",
  soundman: "איש סאונד",
  travel: "נסיעות",
  flights: "טיסות",
  accommodation: "לינה",
  other: "אחר",
};

const bookingTypeLabels: Record<string, string> = {
  vocal_lesson: "שיעור שירה",
  chuppah: "חופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  other: "אחר",
};

const paymentMethodLabels: Record<string, string> = {
  bit: "ביט",
  paybox: "פייבוקס",
  cash: "מזומן",
  check: "צ'ק",
  bank_transfer: "העברה בנקאית",
  morning_api: "מורנינג",
};

interface TransactionRow extends FinanceTransaction {
  bookings?: { id: string; booking_type: string; event_date: string; status: string } | null;
  lessons?: { id: string; lesson_number: number; scheduled_at: string } | null;
}

interface TransactionsResponse {
  transactions: TransactionRow[];
  total: number;
  page: number;
  limit: number;
}

interface DebtorsResponse {
  debtors: Debtor[];
  total_debt: number;
}

interface SupplierComponent {
  id: string;
  booking_id: string;
  component_type: ComponentType;
  description: string | null;
  cost: number;
  created_at: string;
}

interface SupplierEvent {
  booking_id: string;
  booking_type: string;
  event_date: string;
  status: string;
  location_city: string | null;
  client_name: string;
  components: SupplierComponent[];
  total_expense: number;
}

interface SuppliersResponse {
  events: SupplierEvent[];
  total_expenses: number;
}

const LIMIT = 20;

function FinanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const tab = searchParams.get("tab") ?? "transactions";

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [txData, setTxData] = useState<TransactionsResponse | null>(null);
  const [debtorData, setDebtorData] = useState<DebtorsResponse | null>(null);
  const [supplierData, setSupplierData] = useState<SuppliersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [debtorLoading, setDebtorLoading] = useState(true);
  const [supplierLoading, setSupplierLoading] = useState(true);

  // Summary stats
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<FinanceTransaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/finance/transactions?${params.toString()}`);
      if (res.ok) {
        setTxData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchDebtors = useCallback(async () => {
    setDebtorLoading(true);
    try {
      const res = await fetch("/api/finance/debtors");
      if (res.ok) {
        setDebtorData(await res.json());
      }
    } finally {
      setDebtorLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setSupplierLoading(true);
    try {
      const res = await fetch("/api/finance/suppliers");
      if (res.ok) {
        setSupplierData(await res.json());
      }
    } finally {
      setSupplierLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      // Fetch all transactions for summary (no pagination)
      const res = await fetch("/api/finance/transactions?limit=100&page=1");
      if (!res.ok) return;
      const data: TransactionsResponse = await res.json();
      const now = new Date();

      let completed = 0;
      let pending = 0;
      let overdue = 0;

      for (const tx of data.transactions) {
        if (tx.status === "completed") {
          completed += tx.amount;
        } else if (tx.status === "pending") {
          pending += tx.amount;
          if (tx.due_date && new Date(tx.due_date) < now) {
            overdue += tx.amount;
          }
        }
      }

      setTotalCompleted(completed);
      setTotalPending(pending);
      setTotalOverdue(overdue);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchDebtors();
    fetchSuppliers();
    fetchSummary();
  }, [fetchTransactions, fetchDebtors, fetchSuppliers, fetchSummary]);

  const totalPages = txData ? Math.ceil(txData.total / LIMIT) : 0;

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    params.delete("page");
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
    });
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString("he-IL")}`;
  };

  const openCreate = () => {
    setEditTransaction(null);
    setDialogOpen(true);
  };

  const openEdit = (tx: FinanceTransaction) => {
    setEditTransaction(tx);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    fetchTransactions();
    fetchDebtors();
    fetchSummary();
  };

  const linkedLabel = (tx: TransactionRow): string => {
    if (tx.bookings) {
      return `הזמנה — ${formatDate(tx.bookings.event_date)}`;
    }
    if (tx.lessons) {
      return `שיעור #${tx.lessons.lesson_number}`;
    }
    return "—";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">כספים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ניהול עסקאות, תשלומים וחייבים
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            עסקה חדשה
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-500/10 p-2">
              <DollarSign className="size-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">סה&quot;כ הכנסות</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(totalCompleted)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <Clock className="size-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ממתין לתשלום</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-red-500/10 p-2">
              <AlertTriangle className="size-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">חוב באיחור</p>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(totalOverdue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="transactions">עסקאות</TabsTrigger>
          <TabsTrigger value="debtors">חייבים</TabsTrigger>
          <TabsTrigger value="suppliers">ספקים</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <div className="rounded-lg border border-border bg-card/50">
            {loading && !txData ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-right text-muted-foreground">סכום</TableHead>
                    <TableHead className="text-right text-muted-foreground">אמצעי תשלום</TableHead>
                    <TableHead className="text-right text-muted-foreground">סטטוס</TableHead>
                    <TableHead className="text-right text-muted-foreground">קשור ל</TableHead>
                    <TableHead className="text-right text-muted-foreground">תאריך</TableHead>
                    <TableHead className="text-right text-muted-foreground">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txData?.transactions.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell
                        colSpan={6}
                        className="py-12 text-center text-muted-foreground"
                      >
                        לא נמצאו עסקאות
                      </TableCell>
                    </TableRow>
                  ) : (
                    txData?.transactions.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className="border-border hover:bg-accent/50"
                      >
                        <TableCell className="font-medium text-foreground" dir="ltr">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.payment_method
                            ? paymentMethodLabels[tx.payment_method] ?? tx.payment_method
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <TransactionStatusBadge status={tx.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {linkedLabel(tx)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(tx)}
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
            <div className="mt-4 flex items-center justify-center gap-2">
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

          {txData && (
            <p className="mt-2 text-center text-xs text-muted-foreground/70">
              {txData.total} עסקאות סה&quot;כ
            </p>
          )}
        </TabsContent>

        {/* Debtors Tab */}
        <TabsContent value="debtors">
          <div className="rounded-lg border border-border bg-card/50">
            {debtorLoading && !debtorData ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-right text-muted-foreground">שם</TableHead>
                    <TableHead className="text-right text-muted-foreground">טלפון</TableHead>
                    <TableHead className="text-right text-muted-foreground">סוג שירות</TableHead>
                    <TableHead className="text-right text-muted-foreground">סכום</TableHead>
                    <TableHead className="text-right text-muted-foreground">תאריך שירות</TableHead>
                    <TableHead className="text-right text-muted-foreground">תזכורת אחרונה</TableHead>
                    <TableHead className="text-right text-muted-foreground">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtorData?.debtors.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-muted-foreground"
                      >
                        אין חייבים
                      </TableCell>
                    </TableRow>
                  ) : (
                    debtorData?.debtors.map((debtor) => (
                      <TableRow
                        key={debtor.transaction_id}
                        className="border-border hover:bg-accent/50"
                      >
                        <TableCell className="font-medium text-foreground">
                          {debtor.full_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground" dir="ltr">
                          {debtor.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {debtor.source_type === "booking" ? "הזמנה" : "שיעור"}
                        </TableCell>
                        <TableCell className="font-medium text-foreground" dir="ltr">
                          {formatCurrency(debtor.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(debtor.service_date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {debtor.debtor_reminder_sent_at
                            ? formatDate(debtor.debtor_reminder_sent_at)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <WhatsAppReminder
                            transactionId={debtor.transaction_id}
                            phone={debtor.phone}
                            name={debtor.full_name}
                            amount={debtor.amount}
                            serviceType={debtor.source_type}
                            onSent={fetchDebtors}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {debtorData && (
            <p className="mt-2 text-center text-xs text-muted-foreground/70">
              {debtorData.debtors.length} חייבים | סה&quot;כ חוב:{" "}
              {formatCurrency(debtorData.total_debt)}
            </p>
          )}
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          {supplierLoading && !supplierData ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : supplierData?.events.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              אין הוצאות ספקים
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {supplierData?.events.map((event) => (
                <div
                  key={event.booking_id}
                  className="rounded-lg border border-border bg-card/50 overflow-hidden"
                >
                  {/* Event header */}
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-accent/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Users className="size-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-foreground">
                          {event.client_name}
                        </span>
                        <span className="mx-2 text-muted-foreground/50">|</span>
                        <span className="text-sm text-muted-foreground">
                          {bookingTypeLabels[event.booking_type] ?? event.booking_type}
                        </span>
                        {event.location_city && (
                          <>
                            <span className="mx-2 text-muted-foreground/50">|</span>
                            <span className="text-sm text-muted-foreground">
                              {event.location_city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(event.event_date)}
                      </div>
                      <div className="text-sm font-bold text-foreground" dir="ltr">
                        {formatCurrency(event.total_expense)}
                      </div>
                    </div>
                  </div>

                  {/* Components table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-right text-muted-foreground">סוג</TableHead>
                        <TableHead className="text-right text-muted-foreground">תיאור</TableHead>
                        <TableHead className="text-right text-muted-foreground">עלות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {event.components.map((comp) => (
                        <TableRow key={comp.id} className="border-border">
                          <TableCell className="text-foreground">
                            {componentTypeLabels[comp.component_type] ?? comp.component_type}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {comp.description ?? "—"}
                          </TableCell>
                          <TableCell className="font-medium text-foreground" dir="ltr">
                            {formatCurrency(comp.cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}

          {supplierData && (
            <p className="mt-2 text-center text-xs text-muted-foreground/70">
              {supplierData.events.length} אירועים | סה&quot;כ הוצאות:{" "}
              {formatCurrency(supplierData.total_expenses)}
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editTransaction}
        onSaved={handleSaved}
      />
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FinanceContent />
    </Suspense>
  );
}
