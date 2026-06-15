"use client";


interface ProductionCardProps {
  item: {
    id: string;
    name: string;
    barcode_type: "pre-packaged" | "generic";
    quantity: number;
    category: string;
  };
  value: string;
  onChange: (id: string, val: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  bread: "🍞",
  pastry: "🥐",
  cake: "🎂",
  snack: "🥟",
  other: "🍪",
};

export function ProductionCard({ item, value, onChange }: ProductionCardProps) {
  const isGeneric = item.barcode_type === "generic";
  const icon = CATEGORY_ICONS[item.category] ?? "🍪";

  return (
    <div className={`bg-slate-800 border rounded-2xl p-5 transition-all ${
      value && parseInt(value) > 0
        ? "border-blue-500/60 bg-blue-500/5"
        : "border-slate-700 hover:border-slate-600"
    }`}>
      {/* Icon + name */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-700/80 flex items-center justify-center text-3xl">
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
          isGeneric
            ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
            : "text-green-400 bg-green-500/10 border-green-500/20"
        }`}>
          {isGeneric ? "GENERIC" : "PRE-PKG"}
        </span>
      </div>

      <p className="font-bold text-white text-lg leading-tight mb-1">{item.name}</p>
      <p className="text-xs text-slate-500 mb-4">
        {isGeneric
          ? "Cashier enters qty at POS"
          : "Full label per item"}{" "}
        · Stock: {item.quantity}
      </p>

      {/* Large qty input */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Qty Baked Today
        </label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(item.id, e.target.value)}
          placeholder="0"
          min="0"
          className="w-full h-16 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-3xl font-black text-center placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {value && parseInt(value) > 0 && isGeneric && (
        <p className="mt-2 text-xs text-blue-400 text-center">
          → Print {Math.ceil(parseInt(value) / 10)} sticker labels
        </p>
      )}
      {value && parseInt(value) > 0 && !isGeneric && (
        <p className="mt-2 text-xs text-green-400 text-center">
          → Print {parseInt(value)} full labels
        </p>
      )}
    </div>
  );
}
