"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, CreditCard, SplitSquareHorizontal, Printer, X, Loader2, Monitor, ChevronLeft } from "lucide-react";
import { useCustomerDisplay } from "@/hooks/use-customer-display";
import { ShotModal } from "@/components/bar/shot-modal";
import { TabItem } from "@/components/bar/tab-item";
import { groupTabLines, serveSuffix } from "@/lib/tab-lines";
import { SplitBillModal } from "@/components/bar/split-bill-modal";
import { TableCard } from "@/components/bar/table-card";
import { TableFormModal } from "@/components/bar/table-form-modal";
import { BarReceipt } from "@/components/bar/bar-receipt";
import { PaymentStep, type SimplePaymentMethod } from "@/components/pos/payment-step";
import { formatRWF, generateReceiptNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import type { BarItem } from "@/types";
import { barSale, serveOptions, servePrice, SERVE_LABELS, type ServeSize } from "@/lib/bar";

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
  table_number: string | number;
  capacity: number;
  section: string | null; // the table's name
  is_fixed?: boolean;
  status: "empty" | "occupied" | "bill_requested" | "reserved";
}

interface Tab {
  id: string;
  table_id: string | null;
  customer_name: string | null;
  total: number;
  status: string;
  created_at: string;
  floor_tables?: { table_number: string | number; section?: string | null } | null;
  waiter?: { id: string; name: string } | null;
}

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  serve_as?: string;
  item_type: string;
  notes?: string | null;
  status: string;
}

const BAR_CATEGORIES = ["All", "spirits", "wine", "beer", "cocktail", "soft_drink", "juice", "other"];

interface CheckoutData {
  receiptNumber: string;
  items: OrderItem[];
  total: number;
  waiterName?: string;
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  splitCount?: number;
}

export default function BarPOSPage() {
  const { staff, business, currentBranch, hasModule, activeOperator } = useAuthStore();
  // The store is persisted in localStorage, which the server doesn't have. Read
  // modules only after mount so server HTML and first client render match (a
  // mismatch made React throw away the server HTML and redraw the whole POS).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const hasBar        = mounted && hasModule("bar");
  const hasRestaurant = mounted && hasModule("restaurant");
  const { broadcast, openDisplay } = useCustomerDisplay(business?.id);

  const [tables,     setTables]    = useState<FloorTable[]>([]);
  // New table window: the next free number is filled in; tables disappear once paid.
  const [newTableOpen, setNewTableOpen] = useState(false);
  const [nextTableNumber, setNextTableNumber] = useState(1);
  const [barItems,   setBarItems]  = useState<BarItem[]>([]);
  const [menuItems,  setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab,  setActiveTab] = useState<Tab | null>(null);
  const [tabItems, setTabItems] = useState<OrderItem[]>([]);
  // Which open tab belongs to which table (so a tap needs one request, not two),
  // and the last-seen contents of each tab (so a re-opened cart shows instantly).
  const [tabByTable, setTabByTable] = useState<Record<string, string>>({});
  const tabCache = useRef(new Map<string, { tab: Tab; items: OrderItem[] }>());
  const requestedTab = useRef<string | null>(null); // last tab the user tapped
  const localEdits = useRef(0);                     // bumps on every local add/remove

  const applyPendingTabs = (json: { tabs?: Array<{ id: string; table_id: string | null }> }) => {
    const map: Record<string, string> = {};
    for (const t of json.tabs ?? []) if (t.table_id) map[t.table_id] = t.id;
    setTabByTable(map);
  };
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [shotModal, setShotModal] = useState<BarItem | null>(null);
  const [splitModal, setSplitModal] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [creditStep, setCreditStep] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [openingTab, setOpeningTab] = useState(false);
  const [creditName,    setCreditName]  = useState("");
  const [creditPhone,   setCreditPhone] = useState("");
  const [creditDueDate, setCreditDue]   = useState("");
  const [foodModal,     setFoodModal]   = useState<MenuItem | null>(null);
  const [foodQty,       setFoodQty]     = useState(1);
  const [waiters,       setWaiters]     = useState<{ id: string; name: string }[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | null>(null);

  // Keep customer display in sync whenever tab items or the active tab total change.
  useEffect(() => {
    if (!business?.id) return;
    const tabTotal = activeTab?.total ?? tabItems.reduce((s, i) => s + i.total_price, 0);
    broadcast({
      items: groupTabLines(tabItems).map((i) => ({
        name: `${i.item_name}${serveSuffix(i)}`,
        qty: i.quantity,
        unit_price: i.unit_price,
        total: i.total_price,
      })),
      subtotal: tabTotal,
      discount: 0,
      total: tabTotal,
      currency: "RWF",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabItems, activeTab?.total, business?.id]);

  // Initial load: everything in parallel (it used to wait for tables+items, then
  // waiters, then the menu, one after another).
  const loadData = useCallback(async () => {
    setLoading(true);
    const bizId = useAuthStore.getState().business?.id;
    const json = (p: Promise<Response>) => p.then((r) => r.json());
    const [core, waitersJson, menuJson, pendingJson] = await Promise.allSettled([
      Promise.all([json(fetch("/api/bar/tables")), json(fetch("/api/bar/items"))]),
      // Waiters for assignment — pos-staff filtered client-side (non-fatal)
      bizId ? json(fetch(`/api/auth/pos-staff?businessId=${bizId}`)) : Promise.resolve(null),
      // Restaurant menu (non-fatal — bar POS must work even if it fails)
      hasRestaurant ? json(fetch("/api/restaurant/menu")) : Promise.resolve(null),
      // Open tabs, to map table -> tab (non-fatal: tapping falls back to a lookup)
      json(fetch("/api/bar/tabs?status=pending")),
    ]);
    if (pendingJson.status === "fulfilled") applyPendingTabs(pendingJson.value);
    if (core.status === "fulfilled") {
      const [tablesJson, itemsJson] = core.value;
      setTables(tablesJson.tables ?? []);
      setNextTableNumber(tablesJson.next_number ?? 1);
      setBarItems(itemsJson.items ?? []);
    } else {
      toast.error("Failed to load POS data");
    }
    if (waitersJson.status === "fulfilled" && waitersJson.value) {
      setWaiters((waitersJson.value.staff ?? []).filter((s: { id: string; name: string; role: string }) => s.role === "waiter"));
    }
    if (menuJson.status === "fulfilled" && menuJson.value) {
      setMenuItems((menuJson.value.items ?? []).filter((i: MenuItem) => i.is_active));
    }
    setLoading(false);
  }, [hasRestaurant]);

  // Wait for mount so the first load already knows the business modules (one load, not two).
  useEffect(() => { if (mounted) loadData(); }, [mounted, loadData]);

  // After a sale/tab change: quietly refresh tables + stock in the background.
  // No loading screen, and waiters/menu (which don't change) aren't refetched.
  const refreshStock = useCallback(async () => {
    try {
      const [tablesRes, itemsRes, pendingRes] = await Promise.all([
        fetch("/api/bar/tables"), fetch("/api/bar/items"), fetch("/api/bar/tabs?status=pending"),
      ]);
      if (tablesRes.ok) {
        const tablesJson = await tablesRes.json();
        setTables(tablesJson.tables ?? []);
        setNextTableNumber(tablesJson.next_number ?? 1);
      }
      if (itemsRes.ok) setBarItems((await itemsRes.json()).items ?? []);
      if (pendingRes.ok) applyPendingTabs(await pendingRes.json());
    } catch { /* keep showing current data */ }
  }, []);

  // Keep the cached copy of the open tab current as items are added/removed.
  useEffect(() => {
    if (activeTab) tabCache.current.set(activeTab.id, { tab: activeTab, items: tabItems });
  }, [activeTab, tabItems]);

  const fetchTab = async (tabId: string) => {
    const res = await fetch(`/api/bar/tabs/${tabId}`);
    if (!res.ok) throw new Error("Tab not found");
    const json = await res.json() as { tab: Tab; items?: OrderItem[] };
    const entry = { tab: json.tab, items: json.items ?? [] };
    tabCache.current.set(tabId, entry);
    return entry;
  };

  const showTab = (entry: { tab: Tab; items: OrderItem[] }) => {
    setActiveTab(entry.tab);
    setTabItems(entry.items);
    setSelectedWaiterId((entry.tab as Tab & { waiter?: { id: string } | null }).waiter?.id ?? null);
  };

  // Show the cart instantly from cache (if seen before), then replace it with fresh data.
  // The fresh copy is only applied if this is still the tab the user asked for and
  // nothing was added/removed locally in the meantime (so it can't undo a new item).
  const loadTab = async (tabId: string) => {
    requestedTab.current = tabId;
    const editsBefore = localEdits.current;
    const cached = tabCache.current.get(tabId);
    if (cached) showTab(cached);
    const fresh = await fetchTab(tabId);
    if (requestedTab.current === tabId && localEdits.current === editsBefore) showTab(fresh);
  };

  // Start loading an occupied table's cart as soon as it's hovered/touched.
  const prefetchTable = (table: FloorTable) => {
    const tabId = tabByTable[table.id];
    if (tabId && !tabCache.current.has(tabId)) fetchTab(tabId).catch(() => {});
  };

  const openTab = async (table: FloorTable) => {
    // A table can show "empty" while it still has an open bill (status got out of
    // step), so always look for that bill first instead of starting a second one.
    // The server also returns the existing bill rather than creating a duplicate.
    if (table.status === "occupied" || tabByTable[table.id]) {
      // Known open tab for this table: load it directly (one request).
      const knownTabId = tabByTable[table.id];
      if (knownTabId) {
        try { await loadTab(knownTabId); return; } catch { /* tab may have closed — fall through */ }
      }
      // Fallback: look it up
      const res = await fetch(`/api/bar/tabs?status=pending`);
      const json = await res.json();
      applyPendingTabs(json);
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
      refreshStock();
    } catch {
      toast.error("Failed to open tab");
    } finally {
      setOpeningTab(false);
    }
  };

  const addItem = async (item: BarItem, qty: number, serveAs: ServeSize) => {
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
      localEdits.current++;
      setTabItems((prev) => [...prev, json.order_item]);
      // Show the new stock immediately (same arithmetic as the server), then confirm
      // with a quiet background refresh instead of reloading the whole POS.
      setBarItems((prev) => prev.map((b) => (b.id === item.id ? { ...b, ...barSale(b, qty, serveAs).update } : b)));
      refreshStock();
    } catch {
      toast.error("Failed to add item");
    }
  };

  const removeItem = async (ids: string[]) => {
    // Optimistic removal of one cart line (it may combine several rows)
    const removed = tabItems.filter((i) => ids.includes(i.id));
    if (removed.length === 0) return;
    const amount = removed.reduce((s, i) => s + Number(i.total_price), 0);
    localEdits.current++;
    setTabItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setActiveTab((prev) => prev ? { ...prev, total: prev.total - amount } : prev);
    // Note: full delete API could be added; for now removal is UI-only before payment
    toast.success("Item removed from display");
  };

  const handleCheckout = () => {
    if (!activeTab || tabItems.length === 0) return;
    setCheckoutData({
      receiptNumber: generateReceiptNumber(),
      items: tabItems,
      total: activeTab.total,
      waiterName: waiters.find((w) => w.id === selectedWaiterId)?.name,
    });
    setSaleComplete(false);
    setCreditStep(false);
    setCheckoutOpen(true);
  };

  const processCreditSale = async () => {
    if (!activeTab) return;
    if (!creditName.trim() || !creditPhone.trim() || !creditDueDate) {
      toast.error("Customer name, phone number, and due date are required");
      return;
    }
    setProcessing(true);
    try {
      const itemsDesc = groupTabLines(tabItems).map((i) => `${i.item_name} x${i.quantity}`).join(", ");
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
      setCheckoutData((prev) => ({
        receiptNumber: payJson.receipt_number || prev?.receiptNumber || generateReceiptNumber(),
        items:         prev?.items ?? tabItems,
        total:         prev?.total ?? activeTab.total,
        waiterName:    prev?.waiterName ?? waiters.find((w) => w.id === selectedWaiterId)?.name,
        paymentMethod: "credit",
        amountPaid:    activeTab.total,
        change:        0,
        splitCount:    1,
      }));
      setActiveTab(null);
      setSelectedWaiterId(null);
      setTabItems([]);
      setCreditStep(false);
      setSaleComplete(true);
      setCreditName("");
      setCreditPhone("");
      setCreditDue("");
      refreshStock();
    } catch (err) {
      toast.error((err as Error).message ?? "Credit sale failed");
    } finally {
      setProcessing(false);
    }
  };

  const processPayment = async (method: SimplePaymentMethod, details: { amount_paid: number; change: number }, splitCount = 1) => {
    if (!activeTab) return;
    setProcessing(true);
    setSplitModal(false);
    try {
      const res = await fetch(`/api/bar/tabs/${activeTab.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: method,
          amount_paid: details.amount_paid,
          split_count: splitCount,
        }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error);
      toast.success("Payment processed!");
      setCheckoutData((prev) => ({
        receiptNumber: json.receipt_number || prev?.receiptNumber || generateReceiptNumber(),
        items:         prev?.items ?? tabItems,
        total:         prev?.total ?? activeTab.total,
        waiterName:    prev?.waiterName ?? waiters.find((w) => w.id === selectedWaiterId)?.name,
        paymentMethod: method,
        amountPaid:    json.amount_paid,
        change:        json.change,
        splitCount,
      }));
      setActiveTab(null);
      setSelectedWaiterId(null);
      setTabItems([]);
      setCheckoutOpen(true);
      setSaleComplete(true);
      refreshStock();
    } catch {
      toast.error("Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitConfirm = (count: number) => {
    if (!activeTab) return;
    setSplitModal(false);
    processPayment("cash", { amount_paid: activeTab.total, change: 0 }, count);
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
      localEdits.current++;
      setTabItems((prev) => [...prev, json.order_item]);
    } catch {
      toast.error("Failed to add food item");
    }
  };

  return (
    <>
    <div className="h-full flex gap-0 overflow-hidden">
      {/* Left: Tables */}
      <div className="w-56 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tables</p>
          <button
            onClick={() => setNewTableOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            [...Array(6)].map((_, i) => <div key={i} className="h-20 bg-accent/30 rounded-xl animate-pulse" />)
          ) : (
            tables.map((table) => (
              // Wrapper starts loading the table's cart on hover/touch, before the tap.
              <div key={table.id} onMouseEnter={() => prefetchTable(table)} onTouchStart={() => prefetchTable(table)}>
                <TableCard table={table} onClick={() => openTab(table)} />
              </div>
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
              [...Array(8)].map((_, i) => <div key={i} className="h-28 glass-card rounded-xl animate-pulse" />)
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
                    className="p-4 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] glass-card hover:border-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      : "glass-card hover:border-blue-500/50"
                  )}
                >
                  <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category.replace("_", " ")}</p>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-sm font-bold text-blue-400">{formatRWF(item.price_per_bottle)}</p>
                    {serveOptions(item).filter((s) => s !== "bottle").map((s) => (
                      <p key={s} className="text-xs text-amber-400">{SERVE_LABELS[s]}: {formatRWF(servePrice(item, s))}</p>
                    ))}
                    <p className={cn("text-xs", item.quantity_bottles === 0 ? "text-red-400" : "text-muted-foreground")}>
                      {item.quantity_bottles === 0 ? "Out of stock" : `${item.quantity_bottles} btl`}
                      {item.is_shot_item && ` · ${Math.round(Number(item.shots_remaining) * 100) / 100} shots`}
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
                  {activeTab.floor_tables
                    ? `Table ${activeTab.floor_tables.table_number}${activeTab.floor_tables.section ? ` · ${activeTab.floor_tables.section}` : ""}`
                    : "Open Tab"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(activeTab.created_at).toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {business?.id && (
                  <button
                    onClick={() => openDisplay(business.id)}
                    title="Open Customer Display"
                    className="text-muted-foreground hover:text-blue-400 transition-colors"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => { setActiveTab(null); setTabItems([]); setSelectedWaiterId(null); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Waiter assignment */}
            {waiters.length > 0 && (
              <div className="px-4 py-2 border-b border-border">
                <select
                  value={selectedWaiterId ?? ""}
                  onChange={async (e) => {
                    const wid = e.target.value || null;
                    setSelectedWaiterId(wid);
                    await fetch(`/api/bar/tabs/${activeTab.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ waiter_id: wid }),
                    });
                  }}
                  className="w-full h-8 px-2 bg-background border border-border rounded-lg text-sm text-foreground"
                >
                  <option value="">No waiter assigned</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {tabItems.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No items yet.<br />
                  {hasBar && !hasRestaurant ? "Select drinks from the menu." : !hasBar ? "Select food from the menu." : "Select drinks or food from the menu."}
                </p>
              ) : (
                groupTabLines(tabItems).map((line) => (
                  <TabItem key={line.ids.join(",")} item={line} onRemove={() => removeItem(line.ids)} />
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
                  onClick={handleCheckout}
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

      {newTableOpen && (
        <TableFormModal
          nextNumber={nextTableNumber}
          onClose={() => setNewTableOpen(false)}
          onSaved={(table) => {
            setNewTableOpen(false);
            const created = table as FloorTable;
            setTables((prev) =>
              [...prev, created].sort((a, b) => (parseInt(String(a.table_number)) || 0) - (parseInt(String(b.table_number)) || 0))
            );
            // Open the new table's tab straight away so drinks can be added.
            openTab(created);
          }}
        />
      )}

      {/* Food modal */}
      {foodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
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
          onConfirm={handleSplitConfirm}
          onClose={() => setSplitModal(false)}
        />
      )}

      {/* Checkout modal — receipt shown first, payment method chosen after */}
      {checkoutOpen && checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          {/* Header and payment buttons always visible; only the receipt scrolls if
              it is taller than the screen (it used to push the buttons off-screen). */}
          <div className="flex flex-col items-center w-full max-w-sm max-h-full">
            <div className="glass-card rounded-2xl shadow-2xl w-full flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
              <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="font-bold text-white">{saleComplete ? "Payment Complete" : "Receipt"}</h2>
                <button
                  onClick={() => {
                    setCheckoutOpen(false);
                    setCreditStep(false);
                    if (saleComplete) { setSaleComplete(false); setCheckoutData(null); }
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <BarReceipt
                  receiptNumber={checkoutData.receiptNumber}
                  businessName={business?.name ?? "My Business"}
                  branchName={currentBranch?.name ?? ""}
                  cashierName={activeOperator?.name ?? staff?.name ?? "Cashier"}
                  waiterName={checkoutData.waiterName}
                  items={checkoutData.items}
                  total={checkoutData.total}
                  paymentMethod={checkoutData.paymentMethod}
                  amountPaid={checkoutData.amountPaid}
                  change={checkoutData.change}
                  splitCount={checkoutData.splitCount}
                  momoPayCode={business?.momo_pay_code}
                />
              </div>

              <div className="shrink-0 p-4 border-t border-slate-700">
                {saleComplete ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold">✅ Payment Complete</div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => window.print()}
                        className="flex-1 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                      <button
                        onClick={() => { setCheckoutOpen(false); setSaleComplete(false); setCheckoutData(null); }}
                        className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
                      >
                        New Sale
                      </button>
                    </div>
                  </div>
                ) : creditStep ? (
                  <div className="space-y-3">
                    <button onClick={() => setCreditStep(false)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </button>
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
                    <button
                      onClick={processCreditSale}
                      disabled={processing || !creditName.trim() || !creditPhone.trim() || !creditDueDate}
                      className="w-full h-14 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-amber-600 hover:bg-amber-700"
                    >
                      {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "💳"}
                      Record Credit Sale
                    </button>
                  </div>
                ) : (
                  <PaymentStep
                    total={checkoutData.total}
                    momoNumber={business?.momo_number}
                    momoPayCode={business?.momo_pay_code}
                    processing={processing}
                    onConfirm={(method: SimplePaymentMethod, details) => processPayment(method, details, 1)}
                    onCredit={() => {
                      if (!creditDueDate) {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setCreditDue(d.toISOString().split("T")[0]);
                      }
                      setCreditStep(true);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
