"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { QuoteItem, QuotePaymentTerms } from "@/types/database";

const typeLabels: Record<string, string> = {
  vocal_lesson: "שיעור פיטנס קולי",
  chuppah: "שירה בחופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  other: "אחר",
};

interface QuoteData {
  id: string;
  token: string;
  title: string;
  description: string | null;
  items: QuoteItem[];
  total_amount: number;
  payment_terms: QuotePaymentTerms;
  general_terms: string | null;
  valid_until: string | null;
  signed_at: string | null;
  signer_name: string | null;
  created_at: string;
  bookings: {
    booking_type: string;
    event_date: string;
    event_end_date: string | null;
    event_start_time: string | null;
    event_end_time: string | null;
    location_city: string | null;
    location_address: string | null;
    leads: {
      contacts: {
        full_name: string;
        phone: string | null;
        email: string | null;
      };
    };
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(n: number) {
  return `₪${n.toLocaleString("he-IL")}`;
}

function SignatureCanvas({
  onSign,
}: {
  onSign: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const endDraw = () => {
    setDrawing(false);
    if (hasDrawn && canvasRef.current) {
      onSign(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSign("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full touch-none cursor-crosshair"
          style={{ height: "150px" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm">חתום/י כאן ✍️</span>
          </div>
        )}
      </div>
      {hasDrawn && (
        <button
          onClick={clear}
          className="self-start text-xs text-gray-500 underline hover:text-gray-700"
        >
          נקה חתימה
        </button>
      )}
    </div>
  );
}

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signature form
  const [signerName, setSignerName] = useState("");
  const [signerIdNumber, setSignerIdNumber] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quote/${token}`);
      if (!res.ok) {
        setError("ההצעה לא נמצאה");
        return;
      }
      const data = await res.json();
      setQuote(data);
      if (data.signed_at) setSigned(true);
    } catch {
      setError("שגיאה בטעינת ההצעה");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleSign = async () => {
    if (!signerName.trim() || !signatureData) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/quote/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_id_number: signerIdNumber.trim() || null,
          signature_data: signatureData,
        }),
      });
      if (res.ok) {
        setSigned(true);
      }
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">טוען הצעה...</div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700 mb-2">😕</p>
          <p className="text-gray-500">{error ?? "ההצעה לא נמצאה"}</p>
        </div>
      </div>
    );
  }

  const booking = quote.bookings;
  const contact = booking?.leads?.contacts;
  const items = quote.items ?? [];
  const pt = quote.payment_terms;
  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Mia Mesharki
          </h1>
          <p className="text-sm text-gray-500 mt-1">זמרת · מבצעת · מופעים</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Quote title */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{quote.title}</h2>
            {signed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                ✓ נחתם
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                פג תוקף
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                ממתין לאישור
              </span>
            )}
          </div>

          {quote.description && (
            <p className="text-gray-600 text-sm mb-4">{quote.description}</p>
          )}

          <div className="text-xs text-gray-400">
            תאריך הצעה: {formatDate(quote.created_at)}
            {quote.valid_until && (
              <span> · תקפה עד: {formatDate(quote.valid_until)}</span>
            )}
          </div>
        </div>

        {/* Client & Event details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">פרטי האירוע</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">לקוח:</span>
              <p className="font-medium text-gray-900">{contact?.full_name ?? "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">סוג:</span>
              <p className="font-medium text-gray-900">
                {typeLabels[booking?.booking_type] ?? booking?.booking_type}
              </p>
            </div>
            <div>
              <span className="text-gray-500">תאריך:</span>
              <p className="font-medium text-gray-900">
                {booking?.event_date ? formatDate(booking.event_date) : "—"}
              </p>
            </div>
            {booking?.event_start_time && (
              <div>
                <span className="text-gray-500">שעות:</span>
                <p className="font-medium text-gray-900" dir="ltr">
                  {booking.event_start_time.slice(0, 5)}
                  {booking.event_end_time && `–${booking.event_end_time.slice(0, 5)}`}
                </p>
              </div>
            )}
            {booking?.location_city && (
              <div className="col-span-2">
                <span className="text-gray-500">מיקום:</span>
                <p className="font-medium text-gray-900">
                  {booking.location_city}
                  {booking.location_address && `, ${booking.location_address}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">פירוט מחיר</h3>
          <div className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <div key={i} className="flex items-start justify-between py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 shrink-0 ms-4">
                  {item.is_included ? formatCurrency(item.amount) : "על חשבון הלקוח"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-gray-900">
            <span className="text-base font-bold text-gray-900">סה״כ</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(quote.total_amount)}
            </span>
          </div>
        </div>

        {/* Payment terms */}
        {pt && (pt.deposit_amount > 0 || pt.notes) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">תנאי תשלום</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {pt.deposit_amount > 0 && (
                <div className="flex justify-between">
                  <span>מקדמה ({pt.deposit_percent}%)</span>
                  <span className="font-medium">
                    {formatCurrency(pt.deposit_amount)} — {pt.deposit_due}
                  </span>
                </div>
              )}
              {pt.final_amount > 0 && (
                <div className="flex justify-between">
                  <span>יתרה</span>
                  <span className="font-medium">
                    {formatCurrency(pt.final_amount)} — {pt.final_due}
                  </span>
                </div>
              )}
              {pt.payment_methods?.length > 0 && (
                <p className="text-xs text-gray-500 pt-2">
                  אמצעי תשלום: {pt.payment_methods.join(", ")}
                </p>
              )}
              {pt.notes && (
                <p className="text-xs text-gray-500">{pt.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* General terms */}
        {quote.general_terms && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">תנאים כלליים</h3>
            <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
              {quote.general_terms}
            </div>
          </div>
        )}

        {/* Signature */}
        {signed ? (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center">
            <p className="text-green-700 font-semibold text-lg mb-1">✓ ההצעה נחתמה בהצלחה</p>
            <p className="text-green-600 text-sm">
              נחתם על ידי: {quote.signer_name}
              {quote.signed_at && ` · ${formatDate(quote.signed_at)}`}
            </p>
          </div>
        ) : isExpired ? (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
            <p className="text-red-700 font-semibold">פג תוקף ההצעה</p>
            <p className="text-red-600 text-sm mt-1">
              נא ליצור קשר לקבלת הצעה מעודכנת
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              אישור וחתימה
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">שם מלא *</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="שם מלא של החותם/ת"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  ת.ז. (אופציונלי)
                </label>
                <input
                  type="text"
                  value={signerIdNumber}
                  onChange={(e) => setSignerIdNumber(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="מספר תעודת זהות"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">חתימה *</label>
                <SignatureCanvas onSign={setSignatureData} />
              </div>

              <button
                onClick={handleSign}
                disabled={!signerName.trim() || !signatureData || signing}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {signing ? "שומר..." : "אישור וחתימה"}
              </button>

              <p className="text-center text-[11px] text-gray-400">
                בלחיצה על &quot;אישור וחתימה&quot; אני מאשר/ת את תנאי ההצעה
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-8">
          <p>Mia Mesharki · הצעת מחיר #{quote.token.slice(0, 8)}</p>
          <p className="mt-1">מופק על ידי Mia-OS</p>
        </div>
      </main>
    </div>
  );
}
