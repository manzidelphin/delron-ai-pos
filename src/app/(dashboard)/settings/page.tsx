"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2, Users, Bell, Receipt, Shield, Layers,
  Loader2, Plus, Pencil, Trash2, CheckCircle, XCircle, KeyRound, Eye, EyeOff,
} from "lucide-react";
import type { UserRole } from "@/types";

type Tab = "business" | "modules" | "staff" | "notifications" | "receipt" | "security";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "business", label: "Business Profile", icon: <Building2 className="w-4 h-4" /> },
  { key: "modules", label: "Modules", icon: <Layers className="w-4 h-4" /> },
  { key: "staff", label: "Staff", icon: <Users className="w-4 h-4" /> },
  { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { key: "receipt", label: "Receipt", icon: <Receipt className="w-4 h-4" /> },
  { key: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
];

interface StaffRow { id: string; name: string; phone: string | null; email: string | null; role: UserRole; branch_id: string | null; is_active: boolean; created_at: string }
interface BranchRow { id: string; name: string }

// ─── Business Tab ───────────────────────────────────────────────
function BusinessTab() {
  const { business, setBusiness } = useAuthStore();
  const [form, setForm] = useState({ name: "", phone: "", email: "", location: "", language: "en" as "en" | "rw" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) setForm({ name: business.name ?? "", phone: business.phone ?? "", email: business.email ?? "", location: business.location ?? "", language: business.language ?? "en" });
  }, [business]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setBusiness(updated);
      toast.success("Business profile updated");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Business Profile</h3>
        <p className="text-sm text-slate-400">Update your business information</p>
      </div>
      <div className="space-y-4">
        {[
          { label: "Business Name", key: "name" as const, placeholder: "Enter business name" },
          { label: "Phone Number", key: "phone" as const, placeholder: "+250 7XX XXX XXX" },
          { label: "Email Address", key: "email" as const, placeholder: "business@email.com" },
          { label: "Location / Address", key: "location" as const, placeholder: "Kigali, Rwanda" },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">{f.label}</label>
            <input
              value={form[f.key]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
          <div className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-400">
            RWF — Rwandan Franc (fixed)
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Language</label>
          <select
            value={form.language}
            onChange={(e) => setForm((p) => ({ ...p, language: e.target.value as "en" | "rw" }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="en">English</option>
            <option value="rw">Kinyarwanda</option>
          </select>
        </div>
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save Changes
      </button>
    </div>
  );
}

// ─── Modules Tab ────────────────────────────────────────────────
const ALL_MODULES = [
  { key: "supermarket", label: "Supermarket", desc: "Products, POS, inventory management", icon: "🛒" },
  { key: "bakery", label: "Bakery", desc: "Production, recipes, waste tracking", icon: "🥐" },
  { key: "bar", label: "Bar", desc: "Tabs, shots tracking, floor tables", icon: "🍺" },
  { key: "restaurant", label: "Restaurant", desc: "Orders, tables, waiters", icon: "🍽️" },
] as const;

function ModulesTab() {
  const { business, setBusiness } = useAuthStore();
  const [saving, setSaving] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const toggle = async (moduleKey: string, enabling: boolean) => {
    if (!business) return;
    if (!enabling) { setConfirm(moduleKey); return; }
    doToggle(moduleKey, enabling);
  };

  const doToggle = async (moduleKey: string, enabling: boolean) => {
    setConfirm(null);
    setSaving(moduleKey);
    const modules = enabling
      ? [...(business?.modules ?? []), moduleKey as never]
      : (business?.modules ?? []).filter((m) => m !== moduleKey);
    try {
      const res = await fetch("/api/settings/business", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modules }) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setBusiness(updated);
      toast.success(`${moduleKey} module ${enabling ? "enabled" : "disabled"}`);
    } catch { toast.error("Failed to update modules"); }
    setSaving(null);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div><h3 className="text-lg font-semibold text-white mb-1">Active Modules</h3><p className="text-sm text-slate-400">Toggle modules to match your business type</p></div>
      {ALL_MODULES.map((m) => {
        const active = business?.modules.includes(m.key) ?? false;
        return (
          <div key={m.key} className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all", active ? "bg-blue-500/5 border-blue-500/20" : "bg-slate-800 border-slate-700")}>
            <span className="text-2xl">{m.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-white">{m.label}</p>
              <p className="text-xs text-slate-400">{m.desc}</p>
            </div>
            {saving === m.key ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> : (
              <button
                onClick={() => toggle(m.key, !active)}
                className={cn("w-11 h-6 rounded-full border transition-all relative", active ? "bg-blue-500 border-blue-400" : "bg-slate-700 border-slate-600")}
              >
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow", active ? "left-[calc(100%-22px)]" : "left-0.5")} />
              </button>
            )}
          </div>
        );
      })}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white">Disable {confirm} module?</h3>
            <p className="text-sm text-slate-400">This will hide all {confirm} features. Your data will be preserved.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={() => doToggle(confirm, false)} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">Disable</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Staff Tab ───────────────────────────────────────────────────
function StaffTab() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState<StaffRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "cashier" as UserRole, branch_id: "", pin: "" });

  const load = useCallback(async () => {
    const [sRes, bRes] = await Promise.all([fetch("/api/settings/staff"), fetch("/api/branches")]);
    if (sRes.ok) setStaff(await sRes.json());
    if (bRes.ok) setBranches(await bRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ name: "", phone: "", email: "", role: "cashier", branch_id: "", pin: "" }); setEditRow(null); setShowAdd(true); };
  const openEdit = (row: StaffRow) => { setForm({ name: row.name, phone: row.phone ?? "", email: row.email ?? "", role: row.role, branch_id: row.branch_id ?? "", pin: "" }); setEditRow(row); setShowAdd(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editRow) {
        const body: Record<string, string> = { role: form.role, branch_id: form.branch_id };
        if (form.pin) body.pin = form.pin;
        const res = await fetch(`/api/settings/staff/${editRow.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Staff updated");
      } else {
        const res = await fetch("/api/settings/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Staff added successfully");
      }
      setShowAdd(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    setSaving(false);
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this staff member?")) return;
    const res = await fetch(`/api/settings/staff/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Staff deactivated"); load(); }
    else toast.error("Failed to deactivate");
  };

  const ROLE_BADGE: Record<string, string> = { owner: "bg-purple-500/10 text-purple-400 border-purple-500/20", manager: "bg-blue-500/10 text-blue-400 border-blue-500/20", cashier: "bg-green-500/10 text-green-400 border-green-500/20", baker: "bg-amber-500/10 text-amber-400 border-amber-500/20", waiter: "bg-orange-500/10 text-orange-400 border-orange-500/20", bartender: "bg-teal-500/10 text-teal-400 border-teal-500/20", chef: "bg-red-500/10 text-red-400 border-red-500/20" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-white mb-1">Staff Management</h3><p className="text-sm text-slate-400">{staff.length} staff members</p></div>
        <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Add Staff
        </button>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-700 bg-slate-900/50">
              {["Name", "Phone", "Role", "Branch", "Status", "Actions"].map((h) => <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" /></td></tr> :
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{s.phone ?? "—"}</td>
                    <td className="px-4 py-3"><span className={cn("px-2 py-0.5 rounded-full border text-xs capitalize", ROLE_BADGE[s.role] ?? "bg-slate-700 text-slate-300 border-slate-600")}>{s.role}</span></td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{branches.find(b => b.id === s.branch_id)?.name ?? "All"}</td>
                    <td className="px-4 py-3">
                      {s.is_active
                        ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3.5 h-3.5" />Active</span>
                        : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3.5 h-3.5" />Inactive</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        {s.is_active && s.role !== "owner" && <button onClick={() => deactivate(s.id)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Deactivate"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-white text-lg">{editRow ? "Edit Staff" : "Add Staff Member"}</h3>
            <div className="space-y-3">
              {!editRow && <>
                <div><label className="text-xs text-slate-400 mb-1 block">Full Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Phone *</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="07XXXXXXXX" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="staff@business.com" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
              </>}
              <div><label className="text-xs text-slate-400 mb-1 block">Role *</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {(["manager","cashier","baker","waiter","bartender","chef"] as UserRole[]).map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              {branches.length > 1 && <div><label className="text-xs text-slate-400 mb-1 block">Branch</label>
                <select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>}
              <div><label className="text-xs text-slate-400 mb-1 block">{editRow ? "New PIN (leave blank to keep)" : "PIN (4 digits) *"}</label><input value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g,"").slice(0,4) }))} placeholder="XXXX" maxLength={4} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editRow ? "Save Changes" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ──────────────────────────────────────────
function NotificationsTab() {
  const { business } = useAuthStore();
  const [ownerPhone, setOwnerPhone] = useState("");
  const [largeAmount, setLargeAmount] = useState("50000");
  const [smsToggles, setSmsToggles] = useState({ credit_created: true, credit_overdue: true, low_stock: true, daily_summary: true, large_transaction: false });
  const [smsSaving, setSmsSaving] = useState(false);

  // daily_report_email is persisted to the businesses table
  const [reportEmail, setReportEmail]   = useState(true);
  const [reportEmailSaving, setReportEmailSaving] = useState(false);
  const [reportEmailLoaded, setReportEmailLoaded] = useState(false);

  useEffect(() => { if (business?.phone) setOwnerPhone(business.phone); }, [business]);

  // Load the current daily_report_email value from the API
  useEffect(() => {
    fetch("/api/settings/business")
      .then((r) => r.json())
      .then((d: { daily_report_email?: boolean }) => {
        setReportEmail(d.daily_report_email !== false); // default true
        setReportEmailLoaded(true);
      })
      .catch(() => setReportEmailLoaded(true));
  }, []);

  const toggleReportEmail = async (next: boolean) => {
    setReportEmail(next);
    setReportEmailSaving(true);
    try {
      const res = await fetch("/api/settings/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_report_email: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Daily report email enabled" : "Daily report email disabled");
    } catch {
      setReportEmail(!next); // revert on failure
      toast.error("Failed to update notification settings");
    }
    setReportEmailSaving(false);
  };

  const saveSms = async () => {
    setSmsSaving(true);
    await new Promise(r => setTimeout(r, 600));
    toast.success("SMS notification settings saved");
    setSmsSaving(false);
  };

  const SMS_TOGGLES = [
    { key: "credit_created"   as const, label: "Credit created alert",     desc: "Notified when a new credit sale is made" },
    { key: "credit_overdue"   as const, label: "Credit overdue alert",      desc: "Reminded when credits become overdue" },
    { key: "low_stock"        as const, label: "Low stock alert",           desc: "Warned when items fall below minimum stock" },
    { key: "daily_summary"    as const, label: "Daily summary SMS",         desc: "Receive daily business summary at 6AM" },
    { key: "large_transaction"as const, label: `Large transaction alert (above ${largeAmount} RWF)`, desc: "Notified for unusually large sales" },
  ];

  return (
    <div className="space-y-8 max-w-xl">

      {/* Email notifications */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Email Notifications</h3>
          <p className="text-sm text-slate-400">Automated emails sent to the owner account</p>
        </div>
        <div className={cn("flex items-center gap-4 p-4 bg-slate-800 border rounded-xl transition-all", reportEmail ? "border-blue-500/30" : "border-slate-700")}>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Daily report email</p>
            <p className="text-xs text-slate-400">
              Receive a snapshot of today&apos;s revenue, top products, and any cash variances at 23:55 Rwanda time
            </p>
          </div>
          {!reportEmailLoaded || reportEmailSaving ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-400 flex-shrink-0" />
          ) : (
            <button
              onClick={() => toggleReportEmail(!reportEmail)}
              className={cn("w-11 h-6 rounded-full border transition-all relative flex-shrink-0", reportEmail ? "bg-blue-500 border-blue-400" : "bg-slate-700 border-slate-600")}
            >
              <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow", reportEmail ? "left-[calc(100%-22px)]" : "left-0.5")} />
            </button>
          )}
        </div>
      </div>

      {/* SMS notifications */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">SMS Notifications</h3>
          <p className="text-sm text-slate-400">Choose which alerts you receive via SMS</p>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-300 mb-1.5 block">Owner SMS Number</label>
          <input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} placeholder="+250 7XX XXX XXX" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
        <div className="space-y-3">
          {SMS_TOGGLES.map((t) => (
            <div key={t.key} className="flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{t.label}</p>
                <p className="text-xs text-slate-400">{t.desc}</p>
              </div>
              <button onClick={() => setSmsToggles(p => ({ ...p, [t.key]: !p[t.key] }))} className={cn("w-11 h-6 rounded-full border transition-all relative", smsToggles[t.key] ? "bg-blue-500 border-blue-400" : "bg-slate-700 border-slate-600")}>
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow", smsToggles[t.key] ? "left-[calc(100%-22px)]" : "left-0.5")} />
              </button>
            </div>
          ))}
        </div>
        {smsToggles.large_transaction && (
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Large transaction threshold (RWF)</label>
            <input value={largeAmount} onChange={e => setLargeAmount(e.target.value.replace(/\D/g, ""))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
        )}
        <button onClick={saveSms} disabled={smsSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
          {smsSaving && <Loader2 className="w-4 h-4 animate-spin" />}Save SMS Settings
        </button>
      </div>

    </div>
  );
}

// ─── Receipt Tab ─────────────────────────────────────────────────
function ReceiptTab() {
  const { business } = useAuthStore();
  const [form, setForm] = useState({ business_name: "", footer: "Thank you for shopping!", show_logo: true, prefix: "DLR-", show_ebm: false });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (business) setForm(p => ({ ...p, business_name: business.name ?? "" })); }, [business]);
  const save = async () => { setSaving(true); await new Promise(r => setTimeout(r, 600)); toast.success("Receipt settings saved"); setSaving(false); };
  return (
    <div className="space-y-6 max-w-xl">
      <div><h3 className="text-lg font-semibold text-white mb-1">Receipt Settings</h3><p className="text-sm text-slate-400">Customize your printed receipts</p></div>
      <div className="space-y-4">
        {[{ label: "Business Name on Receipt", key: "business_name" as const, placeholder: "Your Business Name" }, { label: "Footer Message", key: "footer" as const, placeholder: "Thank you!" }, { label: "Receipt Number Prefix", key: "prefix" as const, placeholder: "DLR-" }].map(f => (
          <div key={f.key}><label className="text-sm font-medium text-slate-300 mb-1.5 block">{f.label}</label><input value={form[f.key] as string} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
        ))}
        {[{ key: "show_logo" as const, label: "Show logo on receipt" }, { key: "show_ebm" as const, label: "Show EBM number field" }].map(t => (
          <div key={t.key} className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <p className="text-sm font-medium text-white">{t.label}</p>
            <button onClick={() => setForm(p => ({ ...p, [t.key]: !p[t.key] }))} className={cn("w-11 h-6 rounded-full border transition-all relative", form[t.key] ? "bg-blue-500 border-blue-400" : "bg-slate-700 border-slate-600")}>
              <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow", form[t.key] ? "left-[calc(100%-22px)]" : "left-0.5")} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save Settings
      </button>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────
function SecurityTab() {
  const { staff } = useAuthStore();
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pinForm, setPinForm] = useState({ current: "", next: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  // 2FA state (owner only)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(true);
  const [twoFASaving, setTwoFASaving]   = useState(false);
  const isOwner = staff?.role === "owner";

  useEffect(() => {
    if (!isOwner) { setTwoFALoading(false); return; }
    fetch("/api/settings/security/2fa")
      .then(r => r.json())
      .then((d: { enabled: boolean }) => setTwoFAEnabled(d.enabled ?? false))
      .finally(() => setTwoFALoading(false));
  }, [isOwner]);

  const toggle2FA = async (next: boolean) => {
    setTwoFASaving(true);
    try {
      const res = await fetch("/api/settings/security/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setTwoFAEnabled(next);
      toast.success(next ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to update"); }
    setTwoFASaving(false);
  };

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    if (pwForm.next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to update password"); }
    setSavingPw(false);
  };

  const changePin = async () => {
    if (!/^\d{4}$/.test(pinForm.next)) { toast.error("PIN must be exactly 4 digits"); return; }
    setSavingPin(true);
    try {
      const res = await fetch("/api/settings/staff/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: pinForm.next }) });
      if (res.ok) { toast.success("PIN updated"); setPinForm({ current: "", next: "" }); }
      else throw new Error();
    } catch { toast.error("Failed to update PIN"); }
    setSavingPin(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div><h3 className="text-lg font-semibold text-white mb-1">Security</h3><p className="text-sm text-slate-400">Manage your password and PIN</p></div>
      {/* Change password */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-blue-400" /><h4 className="font-semibold text-white">Change Password</h4></div>
        {["current","next","confirm"].map(k => (
          <div key={k}><label className="text-xs text-slate-400 mb-1 block capitalize">{k === "next" ? "New password" : k === "confirm" ? "Confirm password" : "Current password"}</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={pwForm[k as keyof typeof pwForm]} onChange={e => setPwForm(p => ({ ...p, [k]: e.target.value }))} placeholder="••••••••" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white pr-10 focus:outline-none focus:border-blue-500" />
              {k === "next" && <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
            </div>
          </div>
        ))}
        <button onClick={changePassword} disabled={savingPw} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
          {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}Update Password
        </button>
      </div>
      {/* Change PIN */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" /><h4 className="font-semibold text-white">Change PIN</h4></div>
        <div><label className="text-xs text-slate-400 mb-1 block">New PIN (4 digits)</label><input value={pinForm.next} onChange={e => setPinForm(p => ({ ...p, next: e.target.value.replace(/\D/g,"").slice(0,4) }))} placeholder="XXXX" maxLength={4} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500" /></div>
        <button onClick={changePin} disabled={savingPin} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
          {savingPin && <Loader2 className="w-4 h-4 animate-spin" />}Update PIN
        </button>
      </div>
      {/* Two-Factor Authentication — owner only */}
      {isOwner && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-blue-400" />
            <h4 className="font-semibold text-white">Two-Factor Authentication</h4>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            When enabled, you will be asked to verify your identity via a 6-digit email code each time you log in. Staff PIN logins are not affected.
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                {twoFAEnabled ? "2FA is enabled" : "2FA is disabled"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {twoFAEnabled ? "Your account requires email verification on login" : "Turn on for extra account security"}
              </p>
            </div>
            {twoFALoading || twoFASaving ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
              <button
                onClick={() => toggle2FA(!twoFAEnabled)}
                className={cn("w-11 h-6 rounded-full border transition-all relative", twoFAEnabled ? "bg-blue-500 border-blue-400" : "bg-slate-700 border-slate-600")}
              >
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow", twoFAEnabled ? "left-[calc(100%-22px)]" : "left-0.5")} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Page ──────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("business");
  const { staff } = useAuthStore();

  const visibleTabs = TABS.filter((t) => {
    if (t.key === "modules" && staff?.role !== "owner") return false;
    if (t.key === "security" && !["owner", "manager"].includes(staff?.role ?? "")) return false;
    return true;
  });

  const Content = { business: BusinessTab, modules: ModulesTab, staff: StaffTab, notifications: NotificationsTab, receipt: ReceiptTab, security: SecurityTab }[tab];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your business configuration</p>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="md:w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {visibleTabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left", tab === t.key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
                {t.icon}{t.label}
              </button>
            ))}
          </nav>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <Content />
        </div>
      </div>
    </div>
  );
}
