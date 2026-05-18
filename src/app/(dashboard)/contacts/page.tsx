"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  UserCircle,
  Phone,
  Mail,
  ChevronDown,
} from "lucide-react";

interface ContactRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  leads_count: number;
  active_leads: number;
  created_at: string;
}

interface ContactsResponse {
  contacts: ContactRow[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 30;

function ContactsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const searchQuery = searchParams.get("search") ?? "";

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchQuery);

  const totalPages = Math.ceil(total / LIMIT);

  const updateUrl = useCallback(
    (p: number, s: string) => {
      const params = new URLSearchParams();
      if (p > 1) params.set("page", String(p));
      if (s) params.set("search", s);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname],
  );

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const data: ContactsResponse = await res.json();
        setContacts(data.contacts);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSearch = () => {
    updateUrl(1, searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">אנשי קשר</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} אנשי קשר
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, טלפון או מייל..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="ps-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          חפש
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <UserCircle className="size-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? "לא נמצאו תוצאות" : "אין אנשי קשר עדיין"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-2xl border border-border bg-card/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">שם</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">טלפון</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">מייל</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">לידים</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">נוצר</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="font-medium text-foreground hover:text-blue-500 transition-colors"
                      >
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                      {c.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.active_leads > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                          {c.active_leads} פעילים
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{c.leads_count}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("he-IL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {contacts.map((c) => (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="rounded-2xl border border-border bg-card/50 p-4 active:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{c.full_name}</p>
                    {c.phone && (
                      <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5" dir="ltr">
                        <Phone className="size-3.5 shrink-0" />
                        {c.phone}
                      </p>
                    )}
                    {c.email && (
                      <p className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                        <Mail className="size-3.5 shrink-0" />
                        {c.email}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ms-3">
                    {c.active_leads > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
                        {c.active_leads} לידים
                      </span>
                    )}
                    <ChevronDown className="size-4 text-muted-foreground -rotate-90" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages}
                onClick={() => updateUrl(page + 1, searchQuery)}
              >
                <ChevronRight className="size-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => updateUrl(page - 1, searchQuery)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ContactsContent />
    </Suspense>
  );
}
