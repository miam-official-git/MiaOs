"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, X } from "lucide-react";
import type { ComponentType } from "@/types/database";

export interface QuoteComponent {
  id?: string;
  component_type: ComponentType;
  description: string;
  cost: number;
  is_revenue: boolean;
}

interface QuoteBuilderProps {
  components: QuoteComponent[];
  onChange: (components: QuoteComponent[]) => void;
  onAdd?: (component: Omit<QuoteComponent, "id">) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
  /** When true, shows a warning and disables adding components (chuppah warm-intro) */
  locked?: boolean;
  lockedMessage?: string;
}

const componentTypeLabels: Record<ComponentType, string> = {
  talent_fee: "שכר אמנית",
  pianist: "פסנתרן",
  soundman: "סאונדמן",
  travel: "נסיעות",
  flights: "טיסות",
  accommodation: "לינה",
  other: "אחר",
};

const componentTypeOptions: ComponentType[] = [
  "talent_fee",
  "pianist",
  "soundman",
  "travel",
  "flights",
  "accommodation",
  "other",
];

const emptyRow: Omit<QuoteComponent, "id"> = {
  component_type: "talent_fee",
  description: "",
  cost: 0,
  is_revenue: true,
};

export function QuoteBuilder({
  components,
  onChange,
  onAdd,
  onRemove,
  readOnly = false,
  locked = false,
  lockedMessage,
}: QuoteBuilderProps) {
  const [newRow, setNewRow] = useState<Omit<QuoteComponent, "id">>({ ...emptyRow });
  const [showAddRow, setShowAddRow] = useState(false);

  const totalRevenue = components
    .filter((c) => c.is_revenue)
    .reduce((sum, c) => sum + c.cost, 0);
  const totalCosts = components
    .filter((c) => !c.is_revenue)
    .reduce((sum, c) => sum + c.cost, 0);
  const netProfit = totalRevenue - totalCosts;

  function handleAddComponent() {
    if (newRow.cost <= 0) return;
    if (onAdd) {
      onAdd(newRow);
    } else {
      onChange([...components, { ...newRow }]);
    }
    setNewRow({ ...emptyRow });
    setShowAddRow(false);
  }

  function handleRemoveComponent(index: number) {
    const comp = components[index];
    if (onRemove && comp.id) {
      onRemove(comp.id);
    } else {
      onChange(components.filter((_, i) => i !== index));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">רכיבי הצעת מחיר</h4>
        {!readOnly && !locked && !showAddRow && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddRow(true)}
            className="text-xs"
          >
            <Plus className="size-3.5" />
            הוסף רכיב
          </Button>
        )}
      </div>

      {locked && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          {lockedMessage || "הצעת מחיר נעולה"}
        </div>
      )}

      {/* Components list */}
      {components.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 bg-accent/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span>סוג</span>
            <span>סכום</span>
            <span>סוג תנועה</span>
            <span></span>
          </div>
          {components.map((comp, index) => (
            <div
              key={comp.id ?? index}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-t border-border/50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className={comp.is_revenue ? "text-green-400" : "text-red-400"}>
                  {componentTypeLabels[comp.component_type]}
                </span>
                {comp.description && (
                  <span className="mr-1.5 text-xs text-muted-foreground">
                    ({comp.description})
                  </span>
                )}
              </div>
              <span
                dir="ltr"
                className={`text-sm font-medium tabular-nums ${
                  comp.is_revenue ? "text-green-400" : "text-red-400"
                }`}
              >
                {comp.is_revenue ? "+" : "-"}₪{comp.cost.toLocaleString("he-IL")}
              </span>
              <span className="text-xs text-muted-foreground">
                {comp.is_revenue ? "הכנסה" : "הוצאה"}
              </span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveComponent(index)}
                  className="text-muted-foreground hover:text-red-400"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {components.length === 0 && !showAddRow && (
        <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
          אין רכיבים עדיין. לחץ &quot;הוסף רכיב&quot; להתחיל.
        </div>
      )}

      {/* Add component row */}
      {showAddRow && (
        <div className="rounded-lg border border-border bg-accent/30 p-3 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">סוג רכיב</label>
              <Select
                value={newRow.component_type}
                onValueChange={(val) =>
                  setNewRow((prev) => ({ ...prev, component_type: val as ComponentType }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{componentTypeLabels[newRow.component_type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {componentTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {componentTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">סכום (₪)</label>
              <Input
                type="number"
                min={0}
                value={newRow.cost || ""}
                onChange={(e) =>
                  setNewRow((prev) => ({
                    ...prev,
                    cost: Math.max(0, Number(e.target.value)),
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">תיאור (אופציונלי)</label>
            <Input
              value={newRow.description}
              onChange={(e) =>
                setNewRow((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="תיאור קצר..."
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={newRow.is_revenue}
                onChange={(e) =>
                  setNewRow((prev) => ({ ...prev, is_revenue: e.target.checked }))
                }
                className="rounded border-border bg-muted accent-green-500"
              />
              <span className={newRow.is_revenue ? "text-green-400" : "text-red-400"}>
                {newRow.is_revenue ? "הכנסה" : "הוצאה"}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddRow(false);
                setNewRow({ ...emptyRow });
              }}
            >
              ביטול
            </Button>
            <Button size="sm" onClick={handleAddComponent} disabled={newRow.cost <= 0}>
              <Plus className="size-3.5" />
              הוסף
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      {components.length > 0 && (
        <>
          <Separator />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">סה&quot;כ הכנסות</div>
              <div dir="ltr" className="text-sm font-semibold text-green-400 tabular-nums">
                ₪{totalRevenue.toLocaleString("he-IL")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">סה&quot;כ הוצאות</div>
              <div dir="ltr" className="text-sm font-semibold text-red-400 tabular-nums">
                ₪{totalCosts.toLocaleString("he-IL")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">רווח נקי</div>
              <div
                dir="ltr"
                className={`text-sm font-semibold tabular-nums ${
                  netProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ₪{netProfit.toLocaleString("he-IL")}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
