"use client";

import { useCallback, useEffect, useState } from "react";
import { TransactionStatusBadge } from "@/components/transaction-status-badge";
import { Loader2, Wallet } from "lucide-react";

const paymentMethodLabels: Record<string, string> = {
  bit: "ביט",
  paybox: "פייבוקס",
  cash: "מזומן",
  check: "צ׳ק",
  bank_transfer: "העברה בנקאית",
  morning_api: "מורנינג",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    month: "short",
    day: "numeric",
  });
}

interface Props {
  contactId: string;
}

export function ContactPaymentsTab({ contactId }: Props) {
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/payments`);
      if (res.ok) setPayments(await res.json());
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
          <p className="text-xs text-muted-foreground mb-1">שולם</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400" dir="ltr">
            ₪{totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm text-center">
          <p className="text-xs text-muted-foreground mb-1">ממתין</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400" dir="ltr">
            ₪{totalPending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Payment List */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">תשלומים</h3>
          <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
            {payments.length}
          </span>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-3 text-center">
            אין תשלומים
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {payments.map((p) => (
              <div
                key={p.id as string}
                className="flex items-center justify-between gap-2 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground" dir="ltr">
                    ₪{Number(p.amount ?? 0).toLocaleString()}
                  </span>
                  <TransactionStatusBadge status={p.status as string} />
                  {p.payment_method ? (
                    <span className="text-xs text-muted-foreground">
                      {paymentMethodLabels[(p.payment_method as string)] ??
                        (p.payment_method as string)}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(p.created_at as string)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
