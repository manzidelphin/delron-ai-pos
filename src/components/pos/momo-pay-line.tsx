import { momoPayDial, cleanMomoPayCode } from "@/lib/momo-pay";

/** "Pay with MTN MoMo" box printed under the TOTAL on receipts. Renders nothing without a code. */
export function MomoPayLine({ code }: { code?: string | null }) {
  const dial = momoPayDial(code);
  if (!dial) return null;
  return (
    <div className="mb-3 border-b border-dashed border-gray-400 pb-3 text-center">
      <p className="text-xs font-bold uppercase tracking-wide">Pay with MTN MoMo</p>
      <p className="font-black text-base tracking-wide mt-0.5">{dial}</p>
      <p className="text-[11px] text-gray-600">MoMo Pay code: {cleanMomoPayCode(code)}</p>
    </div>
  );
}
