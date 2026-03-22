"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

const leadTypeOptions = [
  { value: "vocal_lesson", label: "שיעור פיטנס קולי" },
  { value: "chuppah", label: "שירה בחופה" },
  { value: "private_event", label: "אירוע פרטי" },
  { value: "modeling", label: "דוגמנות" },
  { value: "other", label: "אחר" },
];

const sourceOptions = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "website", label: "אתר" },
  { value: "referral", label: "הפניה" },
  { value: "other", label: "אחר" },
];

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateLeadDialogProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [leadType, setLeadType] = useState("vocal_lesson");
  const [source, setSource] = useState("other");
  const [notes, setNotes] = useState("");
  // Vocal lesson specific
  const [gender, setGender] = useState("female");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isVocalLesson = leadType === "vocal_lesson";

  const reset = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setLeadType("vocal_lesson");
    setSource("other");
    setNotes("");
    setGender("female");
    setAge("");
    setError("");
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError("שם מלא הוא שדה חובה");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const metadata: Record<string, unknown> = {};
      if (isVocalLesson) {
        metadata.gender = gender;
        if (age) metadata.age = parseInt(age, 10);
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          lead_type: leadType,
          source_platform: source,
          metadata,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה ביצירת הליד");
        return;
      }

      reset();
      onOpenChange(false);
      onCreated?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ליד חדש</DialogTitle>
          <DialogDescription>הוספת ליד ידנית למערכת</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              שם מלא *
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="שם מלא"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                טלפון
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                אימייל
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
          </div>

          {/* Lead Type + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                סוג ליד
              </label>
              <Select
                value={leadType}
                onValueChange={(val) => setLeadType(val ?? "vocal_lesson")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{leadTypeOptions.find(o => o.value === leadType)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {leadTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                מקור
              </label>
              <Select
                value={source}
                onValueChange={(val) => setSource(val ?? "other")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{sourceOptions.find(o => o.value === source)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vocal lesson fields */}
          {isVocalLesson && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground">
                שדות שיעור קול (משפיעים על דחייה אוטומטית)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    מין
                  </label>
                  <Select
                    value={gender}
                    onValueChange={(val) => setGender(val ?? "female")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{gender === "female" ? "נקבה" : "זכר"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">נקבה</SelectItem>
                      <SelectItem value="male">זכר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    גיל
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="גיל"
                    dir="ltr"
                  />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              הערות
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות..."
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            צור ליד
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
