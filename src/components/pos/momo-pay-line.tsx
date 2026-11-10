import { momoPayDial } from "@/lib/momo-pay";

/** "Pay with MTN MoMo" line printed under the TOTAL on receipts. Renders nothing without a code. */
export function MomoPayLine({ code }: { code?: string | null }) {
  const dial = momoPayDial(code);
  if (!dial) return null;
  return (
    <div className="my-1.5 py-1 text-center border-y border-dashed border-gray-500">
      <p className="text-[10px] font-bold uppercase">Pay with MTN MoMo</p>
      <p className="text-[15px] font-black tracking-wide">{dial}</p>
    </div>
  );
}
