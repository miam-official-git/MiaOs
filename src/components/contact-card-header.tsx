"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, MessageCircle, Pencil, Check, X } from "lucide-react";
import type { Contact } from "@/types/database";

interface Props {
  contact: Contact;
  onUpdated: () => void;
}

export function ContactCardHeader({ contact, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contact.full_name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name === contact.full_name) {
      setEditing(false);
      setName(contact.full_name);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name.trim() }),
      });
      onUpdated();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const whatsappLink = contact.phone
    ? `https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Name + Contact Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold h-10 rounded-xl"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setName(contact.full_name);
                  }
                }}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full"
              >
                <Check className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setName(contact.full_name);
                }}
                className="rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {contact.full_name}
              </h1>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="rounded-full shrink-0 opacity-60 hover:opacity-100"
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                dir="ltr"
              >
                <Phone className="size-3.5" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Mail className="size-3.5" />
                {contact.email}
              </a>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 h-7 text-sm font-medium hover:bg-muted transition-colors"
            >
              <MessageCircle className="size-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 h-7 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Phone className="size-4" />
              <span className="hidden sm:inline">התקשר</span>
            </a>
          )}
        </div>
      </div>

      {/* Created date */}
      <p className="mt-3 text-xs text-muted-foreground/70">
        נוצר{" "}
        {new Date(contact.created_at).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}
