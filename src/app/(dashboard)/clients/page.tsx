"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  UserCheck,
  Phone,
  Mail,
  ChevronDown,
} from "lucide-react";

const clientTypeLabels: Record<string, string> = {
  vocal_lesson: "פיתוח קול",
  chuppah: "חופה",
  private_event: "אירוע פרטי",
  modeling: "דוגמנות",
  musical_production: "הפקה מוזיקלית",
  collaboration: "שיתוף פעולה",
  international_event: "אירוע בחו״ל",
  consultation: "פגישת ייעוץ",
  marriage_proposal: "הצעת נישואין",
  other: "אחר",
};

interface ClientRow {
  id: string;
  contact_id: string;
  client_type: string;
  status: string;
  client_since: string;
  notes: string | null;
  contacts: { full_name: string; phone: string | null; email: string | null };
}

function ClientsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const statusFilter = searchParams.get("status") ?? "active";
  const typeFilter = searchParams.get("client_type") ?? "";
  const searchQuery = searchParams.get("search") ?? "";

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchQuery);

  const updateUrl = useCallback(
    (overrides: Record<string, string>) => {
      const current: Record<string, string> = {};
      if (statusFilter && statusFilter !== "active") current.status = statusFilter;
      if (typeFilter) current.client_type = typeFilter;
      if (searchQuery) current.search = searchQuery;

      const merged = { ...current, ...overrides };
      Object.keys(merged).forEach((k) => {
        if (!merged[k]) delete merged[k];
      });

      const params = new URLSearchParams(merged);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, statusFilter, typeFilter, searchQuery],
  );

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (typeFilter) params.set("client_type", typeFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = () => {
    updateUrl({ search: searchInput });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">לקוחות</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clients.length} לקוחות
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <div className="relative flex-1 min-w-0 sm:min-w-48 sm:max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="ps-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(val) => updateUrl({ status: val ?? "active" })}
        >
          <SelectTrigger className="flex-1 sm:w-36 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="inactive">לא פעיל</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter || "_all"}
          onValueChange={(val) =>
            updateUrl({ client_type: val === "_all" ? "" : (val ?? "") })
          }
        >
          <SelectTrigger className="flex-1 sm:w-40 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">כל הסוגים</SelectItem>
            {Object.entries(clientTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          חפש
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <UserCheck className="size-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? "לא נמצאו תוצאות" : "אין לקוחות עדיין"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ניתן להעביר לידים ללקוחות דרך כרטיס הליד
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-2xl border border-border bg-card/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                    שם
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                    סוג
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                    טלפון
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                    מייל
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                    לקוח מאז
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.contacts.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {clientTypeLabels[c.client_type] ?? c.client_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                      {c.contacts.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.contacts.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(c.client_since).toLocaleDateString("he-IL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {clients.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-border bg-card/50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {c.contacts.full_name}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-1">
                      {clientTypeLabels[c.client_type] ?? c.client_type}
                    </span>
                    {c.contacts.phone && (
                      <p
                        className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5"
                        dir="ltr"
                      >
                        <Phone className="size-3.5 shrink-0" />
                        {c.contacts.phone}
                      </p>
                    )}
                    {c.contacts.email && (
                      <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                        <Mail className="size-3.5 shrink-0" />
                        {c.contacts.email}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 ms-3">
                    {new Date(c.client_since).toLocaleDateString("he-IL")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ClientsContent />
    </Suspense>
  );
}
