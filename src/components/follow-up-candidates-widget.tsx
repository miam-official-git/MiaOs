'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageCircle, CalendarPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FollowUpCandidate, LeadType } from '@/types/database';

const typeLabels: Record<LeadType, string> = {
  vocal_lesson: 'פיתוח קול',
  chuppah: 'חופה',
  private_event: 'אירוע פרטי',
  modeling: 'דוגמנות',
  musical_production: 'הפקה מוזיקלית',
  collaboration: 'שיתוף פעולה',
  international_event: 'אירוע בחו״ל',
  consultation: 'פגישת ייעוץ',
  marriage_proposal: 'הצעת נישואין',
  other: 'אחר',
};

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

function buildWhatsAppLink(phone: string, name: string): string {
  const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '972');
  const message = encodeURIComponent(
    `היי ${name}, חזרתי אליך בנוגע להצעת המחיר ששלחתי. אשמח לשמוע אם יש שאלות או אם תרצה להתקדם 😊`
  );
  return `https://wa.me/${cleanPhone}?text=${message}`;
}

function parseDays(timeSinceQuote: string): string {
  // PostgreSQL interval like "5 days 03:20:00" — extract the day count
  const match = timeSinceQuote.match(/(\d+)\s*day/);
  return match ? match[1] : '?';
}

export function FollowUpCandidatesWidget() {
  const [candidates, setCandidates] = useState<FollowUpCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch('/api/follow-ups/candidates');
      const json = await res.json();
      setCandidates(json.candidates ?? []);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  async function createFollowUp(candidate: FollowUpCandidate) {
    try {
      await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: candidate.lead_id,
          booking_id: candidate.booking_id,
          type: 'quote_reminder',
          scheduled_for: new Date().toISOString(),
          notes: `מעקב אוטומטי - הצעה לא נחתמה (${parseDays(candidate.time_since_quote)} ימים)`,
        }),
      });
      // Remove from candidates list after creating follow-up
      setCandidates((prev) => prev.filter((c) => c.booking_id !== candidate.booking_id));
    } catch (err) {
      console.error('Failed to create follow-up', err);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">הצעות לא חתומות</CardTitle>
        <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/25">
          {loading ? '...' : candidates.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין הצעות ממתינות לחתימה</p>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div
                key={candidate.booking_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {candidate.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {typeLabels[candidate.booking_type]}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatCurrency(candidate.total_price)}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-red-500/15 text-red-400 border-red-500/25"
                    >
                      {parseDays(candidate.time_since_quote)} ימים
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {candidate.phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-400 hover:text-green-300"
                      render={
                        <a
                          href={buildWhatsAppLink(candidate.phone, candidate.full_name)}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-blue-400"
                    onClick={() => createFollowUp(candidate)}
                  >
                    <CalendarPlus className="h-4 w-4 ml-1" />
                    ליצור מעקב
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
