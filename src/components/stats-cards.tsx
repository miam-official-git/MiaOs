'use client';

import {
  UserPlus,
  Phone,
  UserCheck,
  CalendarCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsCardsProps {
  stats: {
    new_leads: number;
    contacted_leads: number;
    qualified_leads: number;
    confirmed_bookings: number;
    outstanding_debt: number;
  };
  potentialRevenue?: number;
  expiredOptions?: number;
}

interface KpiCard {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  border: string;
  alert?: boolean;
}

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

export function StatsCards({ stats, potentialRevenue = 0, expiredOptions = 0 }: StatsCardsProps) {
  const cards: KpiCard[] = [
    {
      label: 'לידים חדשים',
      value: stats.new_leads,
      icon: UserPlus,
      color: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'נוצר קשר',
      value: stats.contacted_leads,
      icon: Phone,
      color: 'text-yellow-400',
      iconBg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    {
      label: 'מתאימים',
      value: stats.qualified_leads,
      icon: UserCheck,
      color: 'text-green-400',
      iconBg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label: 'הזמנות מאושרות',
      value: stats.confirmed_bookings,
      icon: CalendarCheck,
      color: 'text-purple-400',
      iconBg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'פוטנציאל רווח (אופציות)',
      value: formatCurrency(potentialRevenue),
      icon: TrendingUp,
      color: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'חוב פתוח',
      value: formatCurrency(stats.outstanding_debt),
      icon: AlertTriangle,
      color: 'text-red-400',
      iconBg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    ...(expiredOptions > 0
      ? [
          {
            label: 'אופציות שפג תוקפן',
            value: expiredOptions,
            icon: Clock as LucideIcon,
            color: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            alert: true,
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className={`border ${card.border} ${card.alert ? 'animate-pulse' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={`rounded-md p-2 ${card.iconBg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold text-foreground`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
