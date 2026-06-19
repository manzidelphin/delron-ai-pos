"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface CustomerDisplayItem {
  name: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface CustomerDisplayPayload {
  items: CustomerDisplayItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: "RWF";
}

const CLEAR: CustomerDisplayPayload = {
  items: [],
  subtotal: 0,
  discount: 0,
  total: 0,
  currency: "RWF",
};

export function useCustomerDisplay(businessId: string | null | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const supabase = createClient();
    const ch = supabase.channel(`customer-display:${businessId}`, {
      config: { broadcast: { ack: false } },
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [businessId]);

  function broadcast(payload: CustomerDisplayPayload) {
    channelRef.current?.send({ type: "broadcast", event: "cart", payload });
  }

  function clearDisplay() {
    channelRef.current?.send({ type: "broadcast", event: "cart", payload: CLEAR });
  }

  function openDisplay(businessId: string) {
    window.open(
      `/customer-display?biz=${businessId}`,
      "delron-customer-display",
      "width=1280,height=720,resizable=yes,menubar=no,toolbar=no,location=no,status=no"
    );
  }

  return { broadcast, clearDisplay, openDisplay };
}
