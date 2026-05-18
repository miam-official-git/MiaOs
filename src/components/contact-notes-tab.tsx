"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, StickyNote, Send } from "lucide-react";
import type { ContactNote } from "@/types/database";

const actorLabels: Record<string, string> = {
  omer: "עומר",
  mia: "מייה",
  system: "מערכת",
  bot: "בוט",
};

interface Props {
  contactId: string;
}

export function ContactNotesTab({ contactId }: Props) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`);
      if (res.ok) setNotes(await res.json());
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        fetchNotes();
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Add Note */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="כתוב הערה..."
          className="rounded-xl resize-none min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <div className="flex justify-end mt-2">
          <Button
            onClick={handleSubmit}
            disabled={!newNote.trim() || sending}
            size="sm"
            className="rounded-xl gap-1.5"
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            הוסף הערה
          </Button>
        </div>
      </div>

      {/* Notes Timeline */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">הערות</h3>
          <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
            {notes.length}
          </span>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-3 text-center">
            אין הערות עדיין
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {notes.map((note) => (
              <div key={note.id} className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {actorLabels[note.author] ?? note.author}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {new Date(note.created_at).toLocaleDateString("he-IL", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
