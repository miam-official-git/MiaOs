"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useLeadsRealtime(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          onUpdate();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
