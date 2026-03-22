"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

const statusOptions = [
  { value: "", label: "הכל" },
  { value: "new", label: "חדש" },
  { value: "contacted", label: "נוצר קשר" },
  { value: "qualified", label: "מתאים" },
  { value: "quoted", label: "הוצעה הצעה" },
  { value: "negotiating", label: 'במו"מ' },
  { value: "converted", label: "הומר" },
  { value: "rejected", label: "נדחה" },
  { value: "lost", label: "אבוד" },
];

const typeOptions = [
  { value: "", label: "הכל" },
  { value: "vocal_lesson", label: "שיעור פיטנס קולי" },
  { value: "chuppah", label: "שירה בחופה" },
  { value: "private_event", label: "אירוע פרטי" },
  { value: "modeling", label: "דוגמנות" },
  { value: "other", label: "אחר" },
];

export function LeadFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentStatus = searchParams.get("status") ?? "";
  const currentType = searchParams.get("lead_type") ?? "";
  const currentSearch = searchParams.get("search") ?? "";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentStatus}
        onValueChange={(val) => updateParams("status", val ?? "")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="סטטוס">{statusOptions.find(o => o.value === currentStatus)?.label ?? "סטטוס"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentType}
        onValueChange={(val) => updateParams("lead_type", val ?? "")}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="סוג ליד">{typeOptions.find(o => o.value === currentType)?.label ?? "סוג ליד"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1 min-w-48">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם או טלפון..."
          defaultValue={currentSearch}
          className="ps-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams("search", e.currentTarget.value);
            }
          }}
          onBlur={(e) => {
            if (e.currentTarget.value !== currentSearch) {
              updateParams("search", e.currentTarget.value);
            }
          }}
        />
      </div>
    </div>
  );
}
