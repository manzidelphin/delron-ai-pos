"use client";

import { Printer } from "lucide-react";
import { BarcodeRender } from "@/components/bakery/barcode-render";

interface LabelItem {
  item_name: string;
  barcode: string;
  barcode_type: "pre-packaged" | "generic";
  selling_price: number;
  quantity_produced: number;
}

interface LabelPreviewProps {
  items: LabelItem[];
  businessName: string;
  batchDate: string;
}

function FullLabel({ item, businessName, date }: { item: LabelItem; businessName: string; date: string }) {
  const bestBefore = new Date(date);
  bestBefore.setDate(bestBefore.getDate() + 2);

  return (
    <div className="label-full border border-gray-800 bg-white text-black font-mono p-1" style={{ width: "6cm", height: "4cm", display: "inline-block", margin: "2px", fontSize: "8px", verticalAlign: "top" }}>
      <div className="text-center border-b border-gray-400 pb-0.5 mb-0.5">
        <p className="font-black text-xs tracking-widest">{businessName}</p>
        <p className="font-bold text-sm leading-tight">{item.item_name}</p>
      </div>
      <div className="flex justify-between text-xs mt-0.5">
        <div>
          <p className="font-black text-base">{item.selling_price.toLocaleString()} RWF</p>
          <p className="text-gray-500">Baked: {new Date(date).toLocaleDateString("en-RW")}</p>
          <p className="text-gray-500">Best before: {bestBefore.toLocaleDateString("en-RW")}</p>
        </div>
      </div>
      <div className="mt-1 text-center">
        <BarcodeRender value={item.barcode} width={1.5} height={28} />
        <p className="text-[7px] font-mono">{item.barcode}</p>
      </div>
    </div>
  );
}

export function StickerLabel({ item }: { item: Pick<LabelItem, "item_name" | "barcode"> }) {
  return (
    <div className="label-sticker border border-gray-800 bg-white text-black font-mono p-0.5" style={{ width: "3cm", height: "2cm", display: "inline-block", margin: "1px", fontSize: "7px", verticalAlign: "top" }}>
      <p className="font-black text-xs text-center leading-tight">{item.item_name.toUpperCase()}</p>
      <BarcodeRender value={item.barcode} width={1} height={16} />
      <p className="text-[6px] font-mono text-center">{item.barcode}</p>
    </div>
  );
}

export function LabelPreview({ items, businessName, batchDate }: LabelPreviewProps) {
  const fullLabels = items.filter((i) => i.barcode_type === "pre-packaged");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">Label Preview</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {fullLabels.reduce((s, i) => s + i.quantity_produced, 0)} full labels ready to print
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
        >
          <Printer className="w-4 h-4" />
          Print All Labels
        </button>
      </div>

      {/* Full labels section */}
      {fullLabels.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">PRE-PACKAGED</span>
            <span className="text-sm text-slate-400">Full price labels — one per item</span>
          </div>
          <div className="print-labels bg-white rounded-xl p-4 border border-slate-600">
            {fullLabels.flatMap((item) =>
              Array.from({ length: item.quantity_produced }, (_, i) => (
                <FullLabel key={`${item.barcode}-${i}`} item={item} businessName={businessName} date={batchDate} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
