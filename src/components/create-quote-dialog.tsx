"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Send, Copy, Check, ExternalLink } from "lucide-react";
import type { QuoteItem, QuotePaymentTerms } from "@/types/database";

const DEFAULT_TERMS = `1. ביטול עד 30 יום לפני האירוע — החזר מלא של המקדמה.
2. ביטול 14–30 יום לפני — החזר 50% מהמקדמה.
3. ביטול פחות מ-14 יום — ללא החזר.
4. שינוי תאריך כפוף לזמינות ובתיאום מראש.
5. המחיר כולל הופעה אחת בלבד כמפורט לעיל.
6. הגברה ותאורה באחריות הלקוח, אלא אם צוין אחרת.`;

const typeLabels: Record<string, string> = {
  vocal_lesson: "שיעור פיטנס קולי",
  chuppah: "שירה בחופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  other: "אחר",
};

interface BookingForQuote {
  id: string;
  booking_type: string;
  event_date: string;
  total_price: number;
  location_city: string | null;
  leads: {
    contacts: {
      full_name: string;
    };
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingForQuote;
  onCreated?: (quoteId: string) => void;
}

export function CreateQuoteDialog({ open, onOpenChange, booking, onCreated }: Props) {
  const [step, setStep] = useState<"build" | "done">("build");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<{ id: string; url: string; token: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [depositPercent, setDepositPercent] = useState(30);
  const [depositDue, setDepositDue] = useState("בחתימה על ההצעה");
  const [finalDue, setFinalDue] = useState("עד שבוע לפני האירוע");
  const [paymentMethods, setPaymentMethods] = useState("העברה בנקאית, ביט");
  const [generalTerms, setGeneralTerms] = useState(DEFAULT_TERMS);
  const [validDays, setValidDays] = useState(14);

  // Init from booking
  useEffect(() => {
    if (!open) return;
    setStep("build");
    setCreatedQuote(null);

    const contactName = booking.leads?.contacts?.full_name ?? "";
    const typeName = typeLabels[booking.booking_type] ?? booking.booking_type;

    setTitle(`הצעת מחיר — ${typeName}`);
    setDescription(`הצעת מחיר עבור ${contactName}`);

    setItems([
      {
        name: `שכר אמנית — ${typeName}`,
        description: "",
        amount: booking.total_price || 0,
        is_included: true,
      },
    ]);
  }, [open, booking]);

  const totalAmount = items
    .filter((i) => i.is_included)
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const depositAmount = Math.round(totalAmount * (depositPercent / 100));
  const finalAmount = totalAmount - depositAmount;

  const addItem = () => {
    setItems([...items, { name: "", description: "", amount: 0, is_included: true }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: unknown) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      const paymentTerms: QuotePaymentTerms = {
        deposit_percent: depositPercent,
        deposit_amount: depositAmount,
        deposit_due: depositDue,
        final_amount: finalAmount,
        final_due: finalDue,
        payment_methods: paymentMethods.split(",").map((m) => m.trim()).filter(Boolean),
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          title,
          description: description || null,
          items,
          total_amount: totalAmount,
          payment_terms: paymentTerms,
          general_terms: generalTerms || null,
          valid_until: validUntil.toISOString().split("T")[0],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedQuote({ id: data.id, url: data.url, token: data.token });
        setStep("done");
        onCreated?.(data.id);
      }
    } finally {
      setSaving(false);
    }
  }, [booking.id, title, description, items, totalAmount, depositPercent, depositAmount, depositDue, finalAmount, finalDue, paymentMethods, generalTerms, validDays, onCreated]);

  const handleSend = useCallback(async () => {
    if (!createdQuote) return;
    setSending(true);
    try {
      await fetch(`/api/quotes/${createdQuote.id}/send`, { method: "POST" });
    } finally {
      setSending(false);
    }
  }, [createdQuote]);

  const handleCopyLink = () => {
    if (!createdQuote) return;
    navigator.clipboard.writeText(createdQuote.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "build" ? "בניית הצעת מחיר" : "ההצעה מוכנה!"}
          </DialogTitle>
          <DialogDescription>
            {step === "build"
              ? `הזמנה: ${typeLabels[booking.booking_type] ?? booking.booking_type} · ${booking.leads?.contacts?.full_name ?? ""}`
              : "ניתן לשלוח ללקוח בווטסאפ או להעתיק את הלינק"}
          </DialogDescription>
        </DialogHeader>

        {step === "build" ? (
          <div className="flex flex-col gap-5 mt-2">
            {/* Title & description */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">כותרת ההצעה</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">תיאור (אופציונלי)</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-foreground">רכיבי מחיר</label>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  <Plus className="size-3.5" />
                  הוסף רכיב
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border border-border p-3 bg-muted/20">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Input
                        placeholder="שם הרכיב (למשל: שכר אמנית)"
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="תיאור (אופציונלי)"
                        value={item.description ?? ""}
                        onChange={(e) => updateItem(i, "description", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="מחיר"
                          value={item.amount || ""}
                          onChange={(e) => updateItem(i, "amount", Number(e.target.value))}
                          className="text-sm text-center"
                          dir="ltr"
                        />
                      </div>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={item.is_included}
                          onChange={(e) => updateItem(i, "is_included", e.target.checked)}
                          className="rounded"
                        />
                        כלול
                      </label>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(i)}
                          className="p-1 text-red-400 hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                <span className="font-semibold text-foreground">סה״כ</span>
                <span className="text-lg font-bold text-foreground">
                  ₪{totalAmount.toLocaleString("he-IL")}
                </span>
              </div>
            </div>

            {/* Payment terms */}
            <div>
              <label className="text-xs font-medium text-foreground mb-2 block">תנאי תשלום</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">אחוז מקדמה</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={depositPercent}
                      onChange={(e) => setDepositPercent(Number(e.target.value))}
                      className="w-20 text-center"
                      dir="ltr"
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">
                      % = ₪{depositAmount.toLocaleString("he-IL")}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">מועד מקדמה</label>
                  <Input value={depositDue} onChange={(e) => setDepositDue(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">מועד יתרה</label>
                  <Input value={finalDue} onChange={(e) => setFinalDue(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">אמצעי תשלום</label>
                  <Input
                    value={paymentMethods}
                    onChange={(e) => setPaymentMethods(e.target.value)}
                    placeholder="העברה, ביט, מזומן"
                  />
                </div>
              </div>
            </div>

            {/* General terms */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">תנאים כלליים</label>
              <textarea
                value={generalTerms}
                onChange={(e) => setGeneralTerms(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring resize-y"
              />
            </div>

            {/* Validity */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">תוקף ההצעה (ימים)</label>
              <Input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(Number(e.target.value))}
                className="w-24"
                dir="ltr"
                min={1}
              />
            </div>

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim() || items.length === 0}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "צור הצעת מחיר"
              )}
            </Button>
          </div>
        ) : (
          /* Done step */
          <div className="flex flex-col gap-4 mt-4">
            <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-6 text-center">
              <div className="text-3xl mb-2">✓</div>
              <p className="font-semibold text-foreground">ההצעה נוצרה בהצלחה</p>
              <p className="text-sm text-muted-foreground mt-1">
                סה״כ: ₪{totalAmount.toLocaleString("he-IL")}
              </p>
            </div>

            {/* Link */}
            <div className="rounded-xl border border-border p-3 flex items-center gap-2">
              <input
                readOnly
                value={createdQuote?.url ?? ""}
                className="flex-1 bg-transparent text-sm text-muted-foreground outline-none truncate"
                dir="ltr"
              />
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {copied ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4 text-muted-foreground" />
                )}
              </button>
              <a
                href={createdQuote?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ExternalLink className="size-4 text-muted-foreground" />
              </a>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Send className="size-4" />
                    שלח בווטסאפ
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                סגור
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
