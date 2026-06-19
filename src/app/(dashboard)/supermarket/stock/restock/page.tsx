"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
}

export default function SupermarketRestockPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/supermarket/stock/restock");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setQty = (id: string, val: string) => {
    if (val === "" || (/^\d*\.?\d*$/.test(val) && parseFloat(val) >= 0)) {
      setQtys((prev) => ({ ...prev, [id]: val }));
    }
  };

  const entriesWithQty = items.filter((i) => parseFloat(qtys[i.id] ?? "0") > 0);

  const handleSubmit = async () => {
    if (entriesWithQty.length === 0) {
      toast.error("Enter at least one restock quantity");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/supermarket/stock/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: supplier.trim() || undefined,
          notes: notes.trim() || undefined,
          entries: entriesWithQty.map((i) => ({
            item_id: i.id,
            quantity_received: parseFloat(qtys[i.id]),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(`Restocked ${data.restocked} product${data.restocked !== 1 ? "s" : ""} successfully`);
      router.push("/supermarket/stock");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save restock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/supermarket/stock")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plus className="w-6 h-6 text-blue-400" />
            Restock Products
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Enter units received per product</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Delivery Details (optional)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Supplier Name</label>
            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. KG Supplies..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Invoice #1234"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Products</h2>
          <span className="text-xs text-muted-foreground">
            {entriesWithQty.length > 0 ? `${entriesWithQty.length} product${entriesWithQty.length !== 1 ? "s" : ""} to restock` : "Enter quantities above 0"}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No active products found.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => {
              const qty = qtys[item.id] ?? "";
              const isLow = item.quantity <= item.min_quantity;
              const hasQty = parseFloat(qty) > 0;
              return (
                <div key={item.id} className={cn("flex items-center gap-4 px-4 py-3 transition-colors", hasQty ? "bg-blue-500/5 border-l-2 border-l-blue-500" : "hover:bg-accent/20")}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium text-sm truncate">{item.name}</span>
                      {isLow && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">Low</span>}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-muted-foreground">Current: <span className="text-foreground">{item.quantity} pcs</span></div>
                    {hasQty && <div className="text-xs text-green-400">→ {item.quantity + parseFloat(qty)} pcs after</div>}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <input type="number" min="0" step="1" value={qty} onChange={(e) => setQty(item.id, e.target.value)} placeholder="0"
                      className={cn("w-20 px-2 py-1.5 rounded-lg text-sm text-center font-medium border transition-colors bg-background text-foreground placeholder-muted-foreground focus:outline-none",
                        hasQty ? "border-blue-500 ring-1 ring-blue-500/30" : "border-border focus:border-blue-500")} />
                    <span className="text-xs text-muted-foreground">pcs</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {entriesWithQty.length > 0
            ? <span>Restocking <span className="text-foreground font-medium">{entriesWithQty.length}</span> product{entriesWithQty.length !== 1 ? "s" : ""}: {entriesWithQty.map((i) => `${i.name} (+${qtys[i.id]})`).join(", ")}</span>
            : "No products selected"}
        </div>
        <button onClick={handleSubmit} disabled={saving || entriesWithQty.length === 0}
          className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all",
            entriesWithQty.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-muted text-muted-foreground cursor-not-allowed",
            saving && "opacity-60")}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Restock
        </button>
      </div>
    </div>
  );
}
