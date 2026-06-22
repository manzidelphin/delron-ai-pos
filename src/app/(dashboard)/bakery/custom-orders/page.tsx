"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { formatRWF } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Loader2, Calendar, Phone, User, Clock, CheckCircle2,
  AlertTriangle, X, ChevronRight, PackageCheck, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomOrder {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  description: string;
  order_date: string;
  due_date: string;
  total_price: number;
  deposit_paid: number;
  balance_due: number;
  status: "ordered" | "in_progress" | "ready" | "collected" | "cancelled";
  created_by_name: string | null;
  collected_by_name: string | null;
  collected_at: string | null;
  notes: string | null;
}

type Filter = "active" | "ready" | "overdue" | "collected" | "cancelled" | "all";

const STATUS_STYLE: Record<string, string> = {
  ordered:     "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  ready:       "bg-green-500/20 text-green-400 border border-green-500/30",
  collected:   "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  cancelled:   "bg-red-500/20 text-red-400 border border-red-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  ordered: "Ordered", in_progress: "In Progress", ready: "Ready ✓",
  collected: "Collected", cancelled: "Cancelled",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", mtn_momo: "MTN MoMo", airtel_money: "Airtel Money", bank_transfer: "Bank Transfer",
};

function daysUntil(dueDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function DueBadge({ dueDate, status }: { dueDate: string; status: string }) {
  if (status === "collected" || status === "cancelled") return null;
  const days = daysUntil(dueDate);
  if (days < 0) return <span className="text-xs font-bold text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{Math.abs(days)}d overdue</span>;
  if (days === 0) return <span className="text-xs font-bold text-amber-400">Due today</span>;
  if (days === 1) return <span className="text-xs text-amber-400">Due tomorrow</span>;
  return <span className="text-xs text-slate-400">Due in {days}d</span>;
}

// ─── New Order Modal ──────────────────────────────────────────────────────────
function NewOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", description: "",
    due_date: "", total_price: "", deposit_paid: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const totalNum = parseFloat(form.total_price) || 0;
  const depositNum = parseFloat(form.deposit_paid) || 0;
  const balanceNum = Math.max(0, totalNum - depositNum);

  const minDate = new Date().toISOString().split("T")[0];

  const submit = async () => {
    if (!form.customer_name.trim() || !form.description.trim() || !form.due_date || !form.total_price) {
      toast.error("Fill in all required fields"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/bakery/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:  form.customer_name,
          customer_phone: form.customer_phone || null,
          description:    form.description,
          due_date:       form.due_date,
          total_price:    Math.round(totalNum),
          deposit_paid:   Math.round(depositNum),
          notes:          form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create order");
      toast.success("Custom order created!");
      onCreated();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">New Custom Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {/* Customer */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Customer Name *</label>
            <input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)}
              placeholder="e.g. Alice Uwase" autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Phone (optional — SMS confirmation sent)</label>
            <input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)}
              placeholder="+250 7XX XXX XXX" type="tel"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Order Description *</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder={'e.g. 2-tier wedding cake, chocolate, "Happy Anniversary"'}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none" />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Pickup / Due Date *</label>
            <input type="date" value={form.due_date} min={minDate} onChange={(e) => set("due_date", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Total Price (RWF) *</label>
              <input type="number" min="1" step="500" value={form.total_price} onChange={(e) => set("total_price", e.target.value)}
                placeholder="20000"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Deposit Paid (RWF)</label>
              <input type="number" min="0" step="500" value={form.deposit_paid} onChange={(e) => set("deposit_paid", e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* Balance due preview */}
          {totalNum > 0 && (
            <div className="bg-slate-900/60 rounded-xl px-4 py-3 flex justify-between text-sm">
              <span className="text-slate-400">Balance due at pickup</span>
              <span className="text-white font-bold">{formatRWF(balanceNum)}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Internal notes (optional)</label>
            <input value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. allergies, special decoration..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Order
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Collect Modal ────────────────────────────────────────────────────────────
function CollectModal({ order, onClose, onCollected }: { order: CustomOrder; onClose: () => void; onCollected: () => void }) {
  const [method, setMethod] = useState<string>("cash");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bakery/custom-orders/${order.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: method, amount_paid: order.balance_due }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to collect");
      toast.success(`Order collected — ${formatRWF(order.balance_due)} received`);
      onCollected();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Collect Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Order summary */}
        <div className="bg-slate-900/60 rounded-xl p-4 space-y-2 text-sm">
          <p className="text-white font-semibold">{order.customer_name}</p>
          <p className="text-slate-400 text-xs">{order.description}</p>
          <div className="flex justify-between pt-1 border-t border-slate-700">
            <span className="text-slate-400">Total price</span>
            <span className="text-white">{formatRWF(order.total_price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Deposit paid</span>
            <span className="text-green-400">−{formatRWF(order.deposit_paid)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-slate-700 pt-1">
            <span className="text-slate-300">Balance due</span>
            <span className="text-white text-base">{formatRWF(order.balance_due)}</span>
          </div>
        </div>

        {order.balance_due === 0 ? (
          <p className="text-green-400 text-sm text-center">Fully paid at booking — no balance to collect.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs text-slate-400">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                <button key={val} onClick={() => setMethod(val)}
                  className={cn("h-10 rounded-xl border text-sm font-medium transition-colors",
                    method === val ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-slate-600 text-slate-400 hover:bg-slate-700")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">Back</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirm Pickup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  order, role, onStatusUpdate, onCollect,
}: {
  order: CustomOrder;
  role: string;
  onStatusUpdate: (id: string, status: string) => void;
  onCollect: (order: CustomOrder) => void;
}) {
  const isOverdue = daysUntil(order.due_date) < 0 && !["collected", "cancelled"].includes(order.status);
  const dueFmt = new Date(order.due_date + "T00:00:00").toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" });
  const canManage = ["owner", "manager"].includes(role);
  const isBaker   = role === "baker";
  const isCashier = role === "cashier";

  return (
    <div className={cn("bg-slate-800 border rounded-2xl p-4 space-y-3", isOverdue ? "border-red-500/40" : "border-slate-700")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold">{order.customer_name}</p>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400">
                <Phone className="w-3 h-3" />{order.customer_phone}
              </a>
            )}
          </div>
          <p className="text-slate-300 text-sm mt-0.5 line-clamp-2">{order.description}</p>
          {order.notes && <p className="text-slate-500 text-xs mt-0.5 italic">{order.notes}</p>}
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0", STATUS_STYLE[order.status])}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* Pricing row */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-slate-400 text-xs">Total</span>
          <p className="text-white font-bold">{formatRWF(order.total_price)}</p>
        </div>
        {order.deposit_paid > 0 && (
          <div>
            <span className="text-slate-400 text-xs">Deposit</span>
            <p className="text-green-400 font-bold">{formatRWF(order.deposit_paid)}</p>
          </div>
        )}
        {order.balance_due > 0 && order.status !== "collected" && (
          <div>
            <span className="text-slate-400 text-xs">Balance</span>
            <p className="text-amber-400 font-bold">{formatRWF(order.balance_due)}</p>
          </div>
        )}
        <div className="ml-auto text-right">
          <DueBadge dueDate={order.due_date} status={order.status} />
          <p className="text-slate-400 text-xs flex items-center gap-1 justify-end mt-0.5">
            <Calendar className="w-3 h-3" />{dueFmt}
          </p>
        </div>
      </div>

      {/* Collected info */}
      {order.status === "collected" && order.collected_at && (
        <p className="text-xs text-slate-500">
          Collected {new Date(order.collected_at).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}
          {order.collected_by_name ? ` by ${order.collected_by_name}` : ""}
        </p>
      )}

      {/* Actions */}
      {order.status !== "collected" && order.status !== "cancelled" && (
        <div className="flex gap-2 flex-wrap pt-1">
          {/* Baker: advance status */}
          {(isBaker || canManage) && order.status === "ordered" && (
            <button onClick={() => onStatusUpdate(order.id, "in_progress")}
              className="h-8 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold transition-colors flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Start Baking
            </button>
          )}
          {(isBaker || canManage) && order.status === "in_progress" && (
            <button onClick={() => onStatusUpdate(order.id, "ready")}
              className="h-8 px-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold transition-colors flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Ready
            </button>
          )}

          {/* Cashier / Owner: collect when ready */}
          {(isCashier || canManage) && order.status === "ready" && (
            <button onClick={() => onCollect(order)}
              className="h-8 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" /> Collect & Pay
            </button>
          )}

          {/* Emergency collect for owner */}
          {canManage && order.status !== "ready" && (
            <button onClick={() => onCollect(order)}
              className="h-8 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5" /> Collect
            </button>
          )}

          {/* Cancel */}
          {canManage && (
            <button onClick={() => onStatusUpdate(order.id, "cancelled")}
              className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto">
              <Ban className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FILTERS: { key: Filter; label: string }[] = [
  { key: "active",    label: "Upcoming" },
  { key: "ready",     label: "Ready" },
  { key: "overdue",   label: "Overdue" },
  { key: "collected", label: "Collected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all",       label: "All" },
];

export default function CustomOrdersPage() {
  const { isLoaded, activeOperator, staff } = useAuthStore();
  const role = activeOperator?.role ?? staff?.role ?? "owner";

  const [filter, setFilter]       = useState<Filter>("active");
  const [orders, setOrders]       = useState<CustomOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [collectOrder, setCollect] = useState<CustomOrder | null>(null);

  const load = useCallback(async (f: Filter) => {
    setIsLoading(true);
    try {
      const q = f === "all" ? "" : `?filter=${f}`;
      const res = await fetch(`/api/bakery/custom-orders${q}`);
      if (res.ok) { const json = await res.json(); setOrders(json.orders ?? []); }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (isLoaded) load(filter); }, [isLoaded, filter, load]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bakery/custom-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      toast.success(`Order marked ${status.replace("_", " ")}`);
      load(filter);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const activeCount  = orders.filter((o) => !["collected","cancelled"].includes(o.status)).length;
  const overdueCount = orders.filter((o) => !["collected","cancelled"].includes(o.status) && daysUntil(o.due_date) < 0).length;

  const canCreate = ["owner", "manager", "cashier"].includes(role);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Custom Orders"
        description="Made-to-order cakes, pastries, and special bakery items"
        actions={
          canCreate ? (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-all">
              <Plus className="w-4 h-4" /> New Order
            </button>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("h-9 px-4 rounded-xl text-sm font-medium transition-all border",
              filter === key ? "bg-amber-600 border-amber-600 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
            )}>
            {label}
            {key === "active" && activeCount > 0 && <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeCount}</span>}
            {key === "overdue" && overdueCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{overdueCount}</span>}
          </button>
        ))}
      </div>

      {/* Order list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No {filter === "all" ? "" : filter} orders</p>
          {canCreate && filter !== "collected" && filter !== "cancelled" && (
            <button onClick={() => setShowNew(true)} className="mt-3 text-amber-400 hover:text-amber-300 text-sm font-medium">
              + Create the first custom order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} role={role}
              onStatusUpdate={handleStatusUpdate}
              onCollect={setCollect} />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNew && <NewOrderModal onClose={() => setShowNew(false)} onCreated={() => load(filter)} />}
      {collectOrder && (
        <CollectModal
          order={collectOrder}
          onClose={() => setCollect(null)}
          onCollected={() => { load(filter); setCollect(null); }}
        />
      )}
    </div>
  );
}
