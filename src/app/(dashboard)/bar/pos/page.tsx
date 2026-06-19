"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, CreditCard, SplitSquareHorizontal, Printer, X, Loader2 } from "lucide-react";
import { ShotModal } from "@/components/bar/shot-modal";
import { TabItem } from "@/components/bar/tab-item";
import { SplitBillModal } from "@/components/bar/split-bill-modal";
import { TableCard } from "@/components/bar/table-card";
import { BarReceipt } from "@/components/bar/bar-receipt";
import { EndShiftButton } from "@/components/bar/end-shift-button";
import { formatRWF } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { BarItem } from "@/types";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  prep_time_minutes: number;
  is_active: boolean;
}

interface FloorTable {
  id: string;
  table_number: number;
  capacity: number;
  section: string | null;
  status: "empty" | "occupied" | "bill_requested" | "reserved";
}

interface Tab {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  total: number;
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
type PayMethod = typeof PAYMENT_METHODS[number] | "credit";
const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank Transfer",
  credit: "Credit Sale",
};

const BAR_CATEGORIES = ["All", "spirits", "wine", "beer", "cocktail", "soft_drink", "juice", "other"];

export default function BarPOSPage() {
  const { staff, hasModule } = useAuthStore();
  const hasBar        = hasModule("bar");
  const hasRestaurant = hasModule("restaurant");

  const [tables,     setTables]    = useState<FloorTable[]>([]);
  const [barItems,   setBarItems]  = useState<BarItem[]>([]);
  const [menuItems,  setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab,  setActiveTab] = useState<Tab | null>(null);
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
  const [creditName,    setCreditName]  = useState("");
  const [creditPhone,   setCreditPhone] = useState("");
  const [creditDueDate, setCreditDue]   = useState("");
  const [foodModal,     setFoodModal]   = useState<MenuItem | null>(null);
  const [foodQty,       setFoodQty]     = useState(1);

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

      if (hasRestaurant) {
        try {
          const menuRes  = await fetch("/api/restaurant/menu");
          const menuJson = await menuRes.json();
          setMenuItems((menuJson.items ?? []).filter((i: MenuItem) => i.is_active));
        } catch {
          // Non-fatal — bar POS must work even if restaurant menu fails
        }
      }
    } catch {
      toast.error("Failed to load POS data");
    } finally {
      setLoading(false);
    }
  }, [hasBar, hasRestaurant]);

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
      const res = await fetch(`/api/bar/tabs?status=pending`);
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
      setActiveTab((prev) => prev ? { ...prev, total: json.tab_total } : prev);
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
    setActiveTab((prev) => prev ? { ...prev, total: prev.total - item.total_price } : prev);
    // Note: full delete API could be added; for now removal is UI-only before payment
    toast.success("Item removed from display");
  };

  const processCreditSale = async () => {
    if (!activeTab) return;
    if (!creditName.trim() || !creditPhone.trim() || !creditDueDate) {
      toast.error("Customer name, phone number, and due date are required");
      return;
    }
    setProcessing(true);
    try {
      const itemsDesc = tabItems.map((i) => `${i.item_name} x${i.quantity}`).join(", ");
      // Record the credit
      const creditRes = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:     creditName.trim(),
          customer_phone:    creditPhone.trim(),
          due_date:          creditDueDate,
          total_amount:      activeTab.total,
          items_description: itemsDesc,
          order_id:          activeTab.id,
          notes:             "Bar credit sale",
        }),
      });
      if (!creditRes.ok) {
        const e = await creditRes.json();
        throw new Error(e.error ?? "Failed to record credit");
      }
      // Close the tab with payment_method "credit"
      const payRes = await fetch(`/api/bar/tabs/${activeTab.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: "credit", amount_paid: activeTab.total }),
      });
      const payJson = await payRes.json();
      if (!payRes.ok) throw new Error(payJson.error ?? "Failed to close tab");

      toast.success(`Credit recorded for ${creditName.trim()}`);
      setReceipt({
        receiptNumber: payJson.receipt_number,
        change:        0,
        amountPaid:    activeTab.total,
        splitCount:    1,
        items:         tabItems,
      });
      setActiveTab(null);
      setTabItems([]);
      setPayModal(false);
      setCreditName("");
      setCreditPhone("");
      setCreditDue("");
      loadData();
    } catch (err) {
      toast.error((err as Error).message ?? "Credit sale failed");
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async (splitCount = 1) => {
    if (!activeTab) return;
    if (payMethod === "credit") return processCreditSale();
    setProcessing(true);
    setSplitModal(false);
    try {
      const paid = amountPaid ? parseFloat(amountPaid) : activeTab.total;
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

  // restaurant-only businesses always see food; bar businesses switch via catFilter
  const isFoodView = !hasBar || catFilter === "food";

  const filteredItems = barItems.filter((i) => {
    const matchCat = catFilter === "All" || i.category === catFilter;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredFood = menuItems.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  const addFoodItem = async (item: MenuItem, qty: number) => {
    if (!activeTab) return toast.error("Select a table first");
    setFoodModal(null);
    try {
      const res = await fetch(`/api/bar/tabs/${activeTab.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_item_id: item.id, quantity: qty }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error);
      setActiveTab((prev) => prev ? { ...prev, total: json.tab_total } : prev);
      setTabItems((prev) => [...prev, json.order_item]);
    } catch {
      toast.error("Failed to add food item");
    }
  };

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
        <EndShiftButton />
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
              placeholder={isFoodView ? "Search food..." : "Search drinks..."}
              className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          {/* Category filter — only shown for bar businesses */}
          {hasBar && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BAR_CATEGORIES.map((cat) => (
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
            {hasRestaurant && (
              <button
                onClick={() => setCatFilter("food")}
                className={cn(
                  "shrink-0 h-8 px-3 rounded-full text-xs font-semibold transition-colors",
                  catFilter === "food"
                    ? "bg-orange-600 text-white"
                    : "bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                🍽️ Food
              </button>
            )}
          </div>
          )}
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {loading ? (
              [...Array(8)].map((_, i) => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)
            ) : isFoodView ? (
              // Food / restaurant items (restaurant-only businesses or when "food" tab selected)
              filteredFood.length === 0 ? (
                <p className="col-span-4 text-center py-12 text-muted-foreground">No food items found</p>
              ) : (
                filteredFood.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setFoodQty(1); setFoodModal(item); }}
                    disabled={!activeTab}
                    className="p-4 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] bg-card border-border hover:border-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category}</p>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-sm font-bold text-orange-400">{formatRWF(item.selling_price)}</p>
                      <p className="text-xs text-muted-foreground">⏱ {item.prep_time_minutes}m</p>
                    </div>
                  </button>
                ))
              )
            ) : filteredItems.length === 0 ? (
              <p className="col-span-4 text-center py-12 text-muted-foreground">No items found</p>
            ) : (
              // Bar items (existing)
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
                <p className="text-center text-muted-foreground text-sm py-8">
                  No items yet.<br />
                  {hasBar && !hasRestaurant ? "Select drinks from the menu." : !hasBar ? "Select food from the menu." : "Select drinks or food from the menu."}
                </p>
              ) : (
                tabItems.map((item) => (
                  <TabItem key={item.id} item={item} onRemove={removeItem} />
                ))
              )}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Tab Total</span>
                <span className="text-xl font-black text-foreground">{formatRWF(activeTab.total)}</span>
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

      {/* Food modal */}
      {foodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide mb-1">Food Item</p>
                <h2 className="text-xl font-bold text-white">{foodModal.name}</h2>
                <p className="text-orange-400 font-bold text-lg mt-0.5">{formatRWF(foodModal.selling_price)}</p>
                <p className="text-xs text-slate-400 mt-0.5">⏱ {foodModal.prep_time_minutes} min prep time</p>
              </div>
              <button
                onClick={() => setFoodModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Quantity</label>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setFoodQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xl font-bold transition-colors"
                >
                  -
                </button>
                <span className="text-3xl font-black text-white w-12 text-center">{foodQty}</span>
                <button
                  onClick={() => setFoodQty((q) => Math.min(20, q + 1))}
                  className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xl font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setFoodModal(null)}
                className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => addFoodItem(foodModal, foodQty)}
                className="flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors text-sm"
              >
                Add to Tab — {formatRWF(foodModal.selling_price * foodQty)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split bill modal */}
      {splitModal && activeTab && (
        <SplitBillModal
          total={activeTab.total}
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
                <p className="text-4xl font-black text-white">{formatRWF(activeTab.total)}</p>
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
                {/* Credit Sale — spans full width */}
                <button
                  onClick={() => {
                    setPayMethod("credit");
                    if (!creditDueDate) {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setCreditDue(d.toISOString().split("T")[0]);
                    }
                  }}
                  className={cn(
                    "col-span-2 h-11 rounded-xl text-sm font-semibold border transition-all",
                    payMethod === "credit"
                      ? "bg-amber-600 border-amber-500 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-300"
                  )}
                >
                  💳 Credit Sale (Pay Later)
                </button>
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
                  {parseFloat(amountPaid) >= activeTab.total && (
                    <div className="mt-2 flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2">
                      <span className="text-sm text-green-400">Change</span>
                      <span className="font-bold text-green-400">{formatRWF(parseFloat(amountPaid) - activeTab.total)}</span>
                    </div>
                  )}
                </div>
              )}

              {payMethod === "credit" && (
                <div className="space-y-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">Customer Details</p>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={creditName}
                      onChange={(e) => setCreditName(e.target.value)}
                      placeholder="Full name..."
                      autoFocus
                      className="w-full h-10 px-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={creditPhone}
                      onChange={(e) => setCreditPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full h-10 px-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={creditDueDate}
                      onChange={(e) => setCreditDue(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => processPayment(1)}
                disabled={
                  processing ||
                  (payMethod === "cash" && parseFloat(amountPaid || "0") < activeTab.total) ||
                  (payMethod === "credit" && (!creditName.trim() || !creditPhone.trim() || !creditDueDate))
                }
                className={cn(
                  "w-full h-14 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                  payMethod === "credit"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-green-600 hover:bg-green-700"
                )}
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : payMethod === "credit" ? "💳" : "✓"}
                {payMethod === "credit" ? "Record Credit Sale" : "Confirm Payment"}
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
