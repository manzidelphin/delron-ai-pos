"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, CreditCard, SplitSquareHorizontal, Printer, X, Loader2 } from "lucide-react";
import { ShotModal } from "@/components/bar/shot-modal";
import { TabItem } from "@/components/bar/tab-item";
import { SplitBillModal } from "@/components/bar/split-bill-modal";
import { TableCard } from "@/components/bar/table-card";
import { BarReceipt } from "@/components/bar/bar-receipt";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { BarItem } from "@/types";

interface FloorTable {
  id: string;
  table_number: number;
  capacity: number;
  location: string | null;
  status: "empty" | "occupied" | "bill_requested" | "reserved";
}

interface Tab {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  floor_tables?: { table_number: number } | null;
}

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  serve_as: "bottle" | "shot";
  status: string;
}

const PAYMENT_METHODS = ["cash", "mtn_momo", "airtel_money", "bank_transfer"] as const;
type PayMethod = typeof PAYMENT_METHODS[number];
const PAYMENT_LABELS: Record<PayMethod, string> = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank Transfer",
};

const CATEGORIES = ["All", "spirits", "wine", "beer", "cocktail", "soft_drink", "juice", "other"];

export default function BarPOSPage() {
  const { staff } = useAuthStore();

  const [tables, setTables] = useState<FloorTable[]>([]);
  const [barItems, setBarItems] = useState<BarItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [tabItems, setTabItems] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [shotModal, setShotModal] = useState<BarItem | null>(null);
  const [splitModal, setSplitModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<{ receiptNumber: string; change: number; amountPaid: number; splitCount: number; items: OrderItem[] } | null>(null);
  const [openingTab, setOpeningTab] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tablesRes, itemsRes] = await Promise.all([
        fetch("/api/bar/tables"),
        fetch("/api/bar/items"),
      ]);
      const [tablesJson, itemsJson] = await Promise.all([tablesRes.json(), itemsRes.json()]);
      setTables(tablesJson.tables ?? []);
      setBarItems(itemsJson.items ?? []);
    } catch {
      toast.error("Failed to load POS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadTab = async (tabId: string) => {
    const res = await fetch(`/api/bar/tabs/${tabId}`);
    const json = await res.json();
    setActiveTab(json.tab);
    setTabItems(json.items ?? []);
  };

  const openTab = async (table: FloorTable) => {
    if (table.status === "occupied") {
      // Find existing open tab for this table
      const res = await fetch(`/api/bar/tabs?status=open`);
      const json = await res.json();
      const existing = (json.tabs ?? []).find((t: Tab) => t.table_id === table.id);
      if (existing) {
        await loadTab(existing.id);
        return;
      }
    }
    setOpeningTab(true);
    try {
      const res = await fetch("/api/bar/tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: table.id }),
      });
      const json = await res.json();
      await loadTab(json.tab.id);
      loadData();
    } catch {
      toast.error("Failed to open tab");
    } finally {
      setOpeningTab(false);
    }
  };

  const addItem = async (item: BarItem, qty: number, serveAs: "bottle" | "shot") => {
    if (!activeTab) return toast.error("Select a table first");
    setShotModal(null);
    try {
      const res = await fetch(`/api/bar/tabs/${activeTab.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bar_item_id: item.id, quantity: qty, serve_as: serveAs }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error);
      setActiveTab((prev) => prev ? { ...prev, total_amount: json.tab_total } : prev);
      setTabItems((prev) => [...prev, json.order_item]);
      loadData(); // refresh stock
    } catch {
      toast.error("Failed to add item");
    }
  };

  const removeItem = async (id: string) => {
    // Optimistic removal
    const item = tabItems.find((i) => i.id === id);
    if (!item) return;
    setTabItems((prev) => prev.filter((i) => i.id !== id));
    setActiveTab((prev) => prev ? { ...prev, total_amount: prev.total_amount - item.total_price } : prev);
    // Note: full delete API could be added; for now removal is UI-only before payment
    toast.success("Item removed from display");
  };

  const processPayment = async (splitCount = 1) => {
    if (!activeTab) return;
    setProcessing(true);
    setSplitModal(false);
    try {
      const paid = amountPaid ? parseFloat(amountPaid) : activeTab.total_amount;
      const res = await fetch(`/api/bar/tabs/${activeTab.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: payMethod,
          amount_paid: paid,
          split_count: splitCount,
        }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error);
      toast.success("Payment processed!");
      setReceipt({
        receiptNumber: json.receipt_number,
        change: json.change,
        amountPaid: json.amount_paid,
        splitCount,
        items: tabItems,
      });
      setActiveTab(null);
      setTabItems([]);
      setPayModal(false);
      loadData();
    } catch {
      toast.error("Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = barItems.filter((i) => {
    const matchCat = catFilter === "All" || i.category === catFilter;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-0 overflow-hidden">
      {/* Left: Tables */}
      <div className="w-56 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tables</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            [...Array(6)].map((_, i) => <div key={i} className="h-20 bg-accent/30 rounded-xl animate-pulse" />)
          ) : (
            tables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => openTab(table)}
              />
            ))
          )}
          {openingTab && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Center: Product grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & category */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drinks..."
              className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={cn(
                  "shrink-0 h-8 px-3 rounded-full text-xs font-semibold transition-colors",
                  catFilter === cat
                    ? "bg-blue-600 text-white"
                    : "bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {loading ? (
              [...Array(8)].map((_, i) => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)
            ) : filteredItems.length === 0 ? (
              <p className="col-span-4 text-center py-12 text-muted-foreground">No items found</p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setShotModal(item)}
                  disabled={!activeTab}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                    item.quantity_bottles === 0
                      ? "bg-card/50 border-border opacity-50 cursor-not-allowed"
                      : "bg-card border-border hover:border-blue-500/50"
                  )}
                >
                  <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category.replace("_", " ")}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-sm font-bold text-blue-400">{formatRWF(item.price_per_bottle)}</p>
                    {item.is_shot_item && item.price_per_shot && (
                      <p className="text-xs text-amber-400">Shot: {formatRWF(item.price_per_shot)}</p>
                    )}
                    <p className={cn("text-xs", item.quantity_bottles === 0 ? "text-red-400" : "text-muted-foreground")}>
                      {item.quantity_bottles === 0 ? "Out of stock" : `${item.quantity_bottles} btl`}
                      {item.is_shot_item && ` · ${item.shots_remaining} shots`}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Active tab */}
      <div className="w-80 shrink-0 border-l border-border bg-card/50 flex flex-col">
        {activeTab ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {activeTab.floor_tables ? `Table ${activeTab.floor_tables.table_number}` : "Open Tab"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(activeTab.created_at).toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <button onClick={() => { setActiveTab(null); setTabItems([]); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {tabItems.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No items yet.<br />Select drinks from the menu.</p>
              ) : (
                tabItems.map((item) => (
                  <TabItem key={item.id} item={item} onRemove={removeItem} />
                ))
              )}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Tab Total</span>
                <span className="text-xl font-black text-foreground">{formatRWF(activeTab.total_amount)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSplitModal(true)}
                  disabled={tabItems.length === 0}
                  className="h-11 rounded-xl border border-border text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-40"
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  Split
                </button>
                <button
                  onClick={() => setPayModal(true)}
                  disabled={tabItems.length === 0}
                  className="h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No active tab</p>
            <p className="text-muted-foreground text-sm mt-1">Select a table from the left to open a tab.</p>
          </div>
        )}
      </div>

      {/* Shot modal */}
      {shotModal && (
        <ShotModal
          item={shotModal}
          onConfirm={addItem}
          onClose={() => setShotModal(null)}
        />
      )}

      {/* Split bill modal */}
      {splitModal && activeTab && (
        <SplitBillModal
          total={activeTab.total_amount}
          onConfirm={(count) => processPayment(count)}
          onClose={() => setSplitModal(false)}
        />
      )}

      {/* Payment modal */}
      {payModal && activeTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Process Payment</h2>
              <button onClick={() => setPayModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm">Total Due</p>
                <p className="text-4xl font-black text-white">{formatRWF(activeTab.total_amount)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={cn(
                      "h-11 rounded-xl text-sm font-semibold border transition-all",
                      payMethod === m
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-300"
                    )}
                  >
                    {PAYMENT_LABELS[m]}
                  </button>
                ))}
              </div>

              {payMethod === "cash" && (
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Amount Received (RWF)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full h-14 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-xl font-bold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {parseFloat(amountPaid) >= activeTab.total_amount && (
                    <div className="mt-2 flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
                      <span className="text-sm text-green-400">Change</span>
                      <span className="font-bold text-green-400">{formatRWF(parseFloat(amountPaid) - activeTab.total_amount)}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => processPayment(1)}
                disabled={processing || (payMethod === "cash" && parseFloat(amountPaid || "0") < activeTab.total_amount)}
                className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "✓"} Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 max-h-[90vh] overflow-y-auto">
            <BarReceipt
              receiptNumber={receipt.receiptNumber}
              businessName="DELRON Business"
              branchName="Main Branch"
              cashierName={staff?.name ?? "Cashier"}
              items={receipt.items}
              total={receipt.items.reduce((s, i) => s + i.total_price, 0)}
              paymentMethod={payMethod}
              amountPaid={receipt.amountPaid}
              change={receipt.change}
              splitCount={receipt.splitCount}
            />
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="px-5 py-2.5 bg-slate-700 text-white rounded-xl font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
