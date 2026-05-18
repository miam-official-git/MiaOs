'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LeadType, LeadStatus } from '@/types/database';

interface RecentLead {
  id: string;
  contact_id: string;
  lead_type: LeadType;
  status: LeadStatus;
  rejection_reason: string | null;
  metadata: object;
  notes: string | null;
  created_at: string;
  contacts: { full_name: string; phone: string; email: string | null };
}

interface RecentLeadsProps {
  leads: RecentLead[];
}

const statusLabels: Record<LeadStatus, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  qualified: 'מתאים',
  quoted: 'הוצעה הצעה',
  negotiating: 'במו"מ',
  rejected: 'נדחה',
  converted: 'הומר',
  lost: 'אבוד',
  archived: 'בארכיון',
};

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  contacted: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  qualified: 'bg-green-500/15 text-green-400 border-green-500/25',
  quoted: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  negotiating: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/25',
  converted: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  lost: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  archived: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  });
}

export function RecentLeads({ leads }: RecentLeadsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">לידים אחרונים</CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין לידים עדיין</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">סוג</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link
                      href="/leads"
                      className="text-foreground hover:text-foreground/80 hover:underline"
                    >
                      {lead.contacts.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground" dir="ltr">
                    {lead.contacts.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {typeLabels[lead.lead_type]}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[lead.status]}
                    >
                      {statusLabels[lead.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
