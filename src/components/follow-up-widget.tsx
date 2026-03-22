'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, DollarSign, Heart, Bell, CheckCircle, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FollowUpType } from '@/types/database';

interface FollowUpItem {
  id: string;
  lead_id: string | null;
  booking_id: string | null;
  type: FollowUpType;
  scheduled_for: string;
  completed_at: string | null;
  notes: string | null;
  leads: {
    id: string;
    contact_id: string;
    contacts: { full_name: string; phone: string | null };
  } | null;
}

const typeIcons: Record<FollowUpType, LucideIcon> = {
  quote_reminder: FileText,
  payment_reminder: DollarSign,
  warm_intro: Heart,
  general: Bell,
};

const typeLabels: Record<FollowUpType, string> = {
  quote_reminder: 'תזכורת הצעה',
  payment_reminder: 'תזכורת תשלום',
  warm_intro: 'חימום ליד',
  general: 'כללי',
};

const typeColors: Record<FollowUpType, string> = {
  quote_reminder: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  payment_reminder: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  warm_intro: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  general: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  });
}

export function FollowUpWidget() {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await fetch('/api/follow-ups?status=pending');
      const json = await res.json();
      setFollowUps(json.follow_ups ?? []);
    } catch (err) {
      console.error('Failed to fetch follow-ups', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  async function markComplete(id: string) {
    try {
      await fetch(`/api/follow-ups/${id}`, { method: 'PATCH' });
      setFollowUps((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to mark follow-up complete', err);
    }
  }

  const top5 = followUps.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">מעקבים ממתינים</CardTitle>
        <Badge variant="outline" className="bg-orange-500/15 text-orange-400 border-orange-500/25">
          {loading ? '...' : followUps.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : top5.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין מעקבים ממתינים</p>
        ) : (
          <div className="space-y-3">
            {top5.map((item) => {
              const Icon = typeIcons[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-md bg-muted p-2">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.leads?.contacts?.full_name ?? 'לא ידוע'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-xs ${typeColors[item.type]}`}>
                          {typeLabels[item.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.scheduled_for)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-green-400"
                    onClick={() => markComplete(item.id)}
                  >
                    <CheckCircle className="h-4 w-4 ml-1" />
                    סמן כבוצע
                  </Button>
                </div>
              );
            })}
            {followUps.length > 5 && (
              <p className="text-center text-sm text-muted-foreground pt-1">
                צפה בכולם ({followUps.length})
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
