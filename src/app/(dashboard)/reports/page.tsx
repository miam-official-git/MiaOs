"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  GraduationCap,
  Calendar,
} from "lucide-react";

const HEBREW_MONTHS = [
  "ינו", "פבר", "מרץ", "אפר", "מאי", "יונ",
  "יול", "אוג", "ספט", "אוק", "נוב", "דצמ",
];

const statusLabels: Record<string, string> = {
  new: "חדש",
  contacted: "פנו",
  qualified: "מתאים",
  quoted: "הצעה",
  negotiating: "מו״מ",
  converted: "הומר",
  rejected: "נדחה",
  lost: "אבד",
  archived: "ארכיון",
};

const typeLabels: Record<string, string> = {
  vocal_lesson: "שיעור",
  chuppah: "חופה",
  private_event: "אירוע",
  modeling: "דוגמנות",
  other: "אחר",
};

const bookingStatusLabels: Record<string, string> = {
  new: "חדש",
  option: "אופציה",
  confirmed: "מאושר",
  completed: "הושלם",
  cancelled: "בוטל",
};

const funnelStages = ["new", "contacted", "qualified", "quoted", "negotiating", "converted"];
const funnelColors = ["bg-blue-500", "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-green-500", "bg-lime-500"];

function formatCurrency(n: number) {
  return `₪${n.toLocaleString("he-IL")}`;
}

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [revenue, setRevenue] = useState<{ months: { month: number; amount: number }[]; total: number } | null>(null);
  const [leads, setLeads] = useState<{ total: number; statusCounts: Record<string, number>; typeCounts: Record<string, number>; conversionRate: number } | null>(null);
  const [lessons, setLessons] = useState<{ total: number; attended: number; noShow: number; cancelled: number; totalRevenue: number; attendanceRate: number; topStudents: { name: string; count: number }[] } | null>(null);
  const [bookings, setBookings] = useState<{ total: number; statusCounts: Record<string, number>; typeCounts: Record<string, number>; totalValue: number; confirmedValue: number; pipelineValue: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, leadRes, lessonRes, bookingRes] = await Promise.all([
        fetch(`/api/reports/revenue?year=${year}`),
        fetch(`/api/reports/leads?year=${year}`),
        fetch(`/api/reports/lessons?year=${year}`),
        fetch(`/api/reports/bookings?year=${year}`),
      ]);

      if (revRes.ok) setRevenue(await revRes.json());
      if (leadRes.ok) setLeads(await leadRes.json());
      if (lessonRes.ok) setLessons(await lessonRes.json());
      if (bookingRes.ok) setBookings(await bookingRes.json());
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxRevMonth = revenue ? Math.max(...revenue.months.map((m) => m.amount), 1) : 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">דוחות</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            סטטיסטיקות ואנליטיקס — {year}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-sm font-medium px-2">{year}</span>
          <Button variant="outline" size="icon-sm" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="w-full justify-start overflow-x-auto rounded-xl bg-muted/60 backdrop-blur-sm p-1">
          <TabsTrigger value="revenue" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <TrendingUp className="size-3.5" />
            הכנסות
          </TabsTrigger>
          <TabsTrigger value="leads" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <Users className="size-3.5" />
            לידים
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <GraduationCap className="size-3.5" />
            שיעורים
          </TabsTrigger>
          <TabsTrigger value="bookings" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <Calendar className="size-3.5" />
            הזמנות
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">הכנסות חודשיות</h3>
                <span className="text-lg font-bold text-foreground">
                  {formatCurrency(revenue?.total ?? 0)}
                </span>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-1.5 h-48">
                {revenue?.months.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">
                      {m.amount > 0 ? formatCurrency(m.amount) : ""}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-blue-500/80 transition-all duration-300"
                      style={{
                        height: `${Math.max((m.amount / maxRevMonth) * 160, m.amount > 0 ? 4 : 0)}px`,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {HEBREW_MONTHS[m.month - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <div className="flex flex-col gap-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{leads?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">סה״כ לידים</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{leads?.conversionRate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">אחוז המרה</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{leads?.statusCounts?.['converted'] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">הומרו</p>
                </CardContent>
              </Card>
            </div>

            {/* Conversion funnel */}
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-4">משפך המרה</h3>
                <div className="flex flex-col gap-2">
                  {funnelStages.map((stage, i) => {
                    const count = leads?.statusCounts?.[stage] ?? 0;
                    const maxCount = leads?.total ?? 1;
                    const width = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16 text-left shrink-0">
                          {statusLabels[stage]}
                        </span>
                        <div className="flex-1 h-7 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${funnelColors[i]} flex items-center pe-2 justify-end transition-all duration-500`}
                            style={{ width: `${width}%` }}
                          >
                            {count > 0 && (
                              <span className="text-[10px] font-medium text-white">{count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* By type */}
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">לפי סוג</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(leads?.typeCounts ?? {}).map(([type, count]) => (
                    <div key={type} className="rounded-xl bg-muted/40 px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{count}</p>
                      <p className="text-[10px] text-muted-foreground">{typeLabels[type] ?? type}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{lessons?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">סה״כ שיעורים</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{lessons?.attendanceRate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">נוכחות</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{lessons?.noShow ?? 0}</p>
                  <p className="text-xs text-muted-foreground">לא הגיעו</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(lessons?.totalRevenue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">הכנסות</p>
                </CardContent>
              </Card>
            </div>

            {/* Top students */}
            {lessons?.topStudents && lessons.topStudents.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">תלמידים מובילים</h3>
                  <div className="flex flex-col gap-2">
                    {lessons.topStudents.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm text-foreground flex-1">{s.name}</span>
                        <span className="text-sm font-medium text-foreground">{s.count} שיעורים</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{bookings?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">סה״כ הזמנות</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{formatCurrency(bookings?.confirmedValue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">ערך מאושר</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">{formatCurrency(bookings?.pipelineValue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">ערך צינור</p>
                </CardContent>
              </Card>
            </div>

            {/* By status */}
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">לפי סטטוס</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(bookings?.statusCounts ?? {}).map(([status, count]) => (
                    <div key={status} className="rounded-xl bg-muted/40 px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{count}</p>
                      <p className="text-[10px] text-muted-foreground">{bookingStatusLabels[status] ?? status}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By type */}
            <Card className="border-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">לפי סוג</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(bookings?.typeCounts ?? {}).map(([type, count]) => (
                    <div key={type} className="rounded-xl bg-muted/40 px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{count}</p>
                      <p className="text-[10px] text-muted-foreground">{typeLabels[type] ?? type}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
