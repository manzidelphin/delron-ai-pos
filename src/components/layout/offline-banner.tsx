"use client";
import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);
  const [justCameBack, setJustCameBack] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setJustCameBack(false);
      setShow(true);
    } else if (show) {
      // Was showing offline banner — flash green then hide
      setJustCameBack(true);
      const t = setTimeout(() => {
        setShow(false);
        setJustCameBack(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (!show) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-white text-sm z-50 flex-shrink-0 transition-all duration-300 ${justCameBack ? "bg-green-600" : "bg-red-600"}`}>
      {justCameBack ? (
        <Wifi className="w-4 h-4 flex-shrink-0" />
      ) : (
        <WifiOff className="w-4 h-4 flex-shrink-0" />
      )}
      <span>
        {justCameBack
          ? "Connection restored — all payment methods available."
          : "You're offline — cash sales only. Card and MoMo payments unavailable until connection is restored."}
      </span>
    </div>
  );
}
