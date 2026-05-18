"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContactCardHeader } from "@/components/contact-card-header";
import { ContactDetailsTab } from "@/components/contact-details-tab";
import { ContactCommsTab } from "@/components/contact-comms-tab";
import { ContactDealsTab } from "@/components/contact-deals-tab";
import { ContactPaymentsTab } from "@/components/contact-payments-tab";
import { ContactNotesTab } from "@/components/contact-notes-tab";
import { ContactActivityTab } from "@/components/contact-activity-tab";
import { ChevronRight, Loader2 } from "lucide-react";
import type { Contact } from "@/types/database";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) {
        router.push("/leads");
        return;
      }
      setContact(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={() => router.push("/leads")}
          className="hover:text-foreground transition-colors"
        >
          לידים
        </button>
        <ChevronRight className="size-3.5 rotate-180" />
        <span className="text-foreground font-medium">{contact.full_name}</span>
      </nav>

      {/* Header */}
      <ContactCardHeader contact={contact} onUpdated={fetchContact} />

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList className="w-full justify-start overflow-x-auto rounded-xl bg-muted/60 backdrop-blur-sm p-1">
          <TabsTrigger value="details" className="rounded-lg text-xs sm:text-sm">
            פרטים
          </TabsTrigger>
          <TabsTrigger value="comms" className="rounded-lg text-xs sm:text-sm">
            תקשורת
          </TabsTrigger>
          <TabsTrigger value="deals" className="rounded-lg text-xs sm:text-sm">
            עסקאות
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg text-xs sm:text-sm">
            תשלומים
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-lg text-xs sm:text-sm">
            הערות
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg text-xs sm:text-sm">
            פעילות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ContactDetailsTab contact={contact} onUpdated={fetchContact} />
        </TabsContent>

        <TabsContent value="comms">
          <ContactCommsTab contactId={contact.id} />
        </TabsContent>

        <TabsContent value="deals">
          <ContactDealsTab contactId={contact.id} />
        </TabsContent>

        <TabsContent value="payments">
          <ContactPaymentsTab contactId={contact.id} />
        </TabsContent>

        <TabsContent value="notes">
          <ContactNotesTab contactId={contact.id} />
        </TabsContent>

        <TabsContent value="activity">
          <ContactActivityTab contactId={contact.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
