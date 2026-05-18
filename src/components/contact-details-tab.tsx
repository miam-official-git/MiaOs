"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, User, Save, Loader2 } from "lucide-react";
import type { Contact } from "@/types/database";

interface Props {
  contact: Contact;
  onUpdated: () => void;
}

export function ContactDetailsTab({ contact, onUpdated }: Props) {
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    phone !== (contact.phone ?? "") || email !== (contact.email ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || null,
          email: email || null,
        }),
      });
      onUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm mt-2">
      <h2 className="text-base font-semibold text-foreground mb-4">פרטי קשר</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Full Name — read-only here, editable in header */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="size-3.5" />
            שם מלא
          </label>
          <Input
            value={contact.full_name}
            disabled
            className="rounded-xl bg-muted/30"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Phone className="size-3.5" />
            טלפון
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-000-0000"
            dir="ltr"
            className="rounded-xl"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Mail className="size-3.5" />
            אימייל
          </label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            type="email"
            dir="ltr"
            className="rounded-xl"
          />
        </div>
      </div>

      {hasChanges && (
        <>
          <Separator className="my-4" />
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl gap-1.5"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : saved ? (
                "נשמר ✓"
              ) : (
                <>
                  <Save className="size-4" />
                  שמור שינויים
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
