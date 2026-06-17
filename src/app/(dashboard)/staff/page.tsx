"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Pencil,
  UserX,
  UserCheck,
  Phone,
  Mail,
  Shield,
  ChefHat,
  Beer,
  UtensilsCrossed,
  ShoppingCart,
  KeyRound,
  Loader2,
  X,
  EyeOff,
  Eye,
  Building2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface StaffForm {
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  pin: string;
  branch_id: string;
}

const EMPTY_FORM: StaffForm = {
  name: "",
  phone: "",
  email: "",
  role: "cashier",
  pin: "",
  branch_id: "",
};

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  owner:     { label: "Owner",      icon: <Shield className="w-3 h-3" />,           color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  manager:   { label: "Manager",    icon: <Shield className="w-3 h-3" />,            color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  cashier:   { label: "Cashier",    icon: <ShoppingCart className="w-3 h-3" />,     color: "text-green-400 bg-green-500/10 border-green-500/20" },
  baker:     { label: "Baker",      icon: <ChefHat className="w-3 h-3" />,          color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  waiter:    { label: "Waiter",     icon: <UtensilsCrossed className="w-3 h-3" />,  color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  bartender: { label: "Bartender",  icon: <Beer className="w-3 h-3" />,             color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
};

const ROLES: UserRole[] = ["cashier", "manager", "baker", "waiter", "bartender"];

export default function StaffPage() {
  const { staff: currentStaff, branches } = useAuthStore();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [errors, setErrors] = useState<Partial<StaffForm>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/staff");
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPin(false);
    setShowModal(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditingId(m.id);
    setForm({ name: m.name, phone: m.phone, email: m.email ?? "", role: m.role, pin: "", branch_id: m.branch_id ?? "" });
    setErrors({});
    setShowPin(false);
    setShowModal(true);
  };

  const validate = (): boolean => {
    const e: Partial<StaffForm> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    if (!editingId && !form.pin) e.pin = "Required";
    if (form.pin && !/^\d{4}$/.test(form.pin)) e.pin = "Must be exactly 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        role: form.role,
        branch_id: form.branch_id || null,
      };
      if (form.pin) payload.pin = form.pin;

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/settings/staff/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/settings/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Failed to save staff member");
        return;
      }

      toast.success(editingId ? "Staff member updated" : "Staff member added");
      setShowModal(false);
      load();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m: StaffMember) => {
    if (m.id === currentStaff?.id) { toast.error("You cannot deactivate yourself"); return; }
    try {
      if (m.is_active) {
        const res = await fetch(`/api/settings/staff/${m.id}`, { method: "DELETE" });
        if (!res.ok) { const { error } = await res.json(); toast.error(error); return; }
        toast.success(`${m.name} deactivated`);
      } else {
        const res = await fetch(`/api/settings/staff/${m.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        });
        if (!res.ok) { const { error } = await res.json(); toast.error(error); return; }
        toast.success(`${m.name} reactivated`);
      }
      load();
    } catch {
      toast.error("Action failed");
    }
  };

  const active = members.filter((m) => m.is_active);
  const inactive = members.filter((m) => !m.is_active);

  const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
    if (m.is_active) acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(ROLE_META).map(([role, meta]) => (
          <div key={role} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
            <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium mb-1", meta.color)}>
              {meta.icon} {meta.label}
            </div>
            <div className="text-xl font-bold text-white">{roleCounts[role] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-700 rounded-2xl">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No staff members yet</p>
          <p className="text-slate-500 text-sm mt-1">Add your first cashier or manager to get started</p>
          <button onClick={openAdd} className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-all">
            Add Staff Member
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active */}
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold px-1">Active ({active.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {active.map((m) => (
                  <StaffCard
                    key={m.id}
                    member={m}
                    isSelf={m.id === currentStaff?.id}
                    branches={branches}
                    onEdit={() => openEdit(m)}
                    onToggle={() => toggleActive(m)}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Inactive */}
          {inactive.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold px-1">Inactive ({inactive.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
                {inactive.map((m) => (
                  <StaffCard
                    key={m.id}
                    member={m}
                    isSelf={false}
                    branches={branches}
                    onEdit={() => openEdit(m)}
                    onToggle={() => toggleActive(m)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PIN Login info banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-300">How staff access the POS</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Each staff member logs into the POS using their 4-digit PIN — no email or password needed.
            The owner sets the PIN when creating the account. Staff should keep their PIN private.
          </p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit Staff Member" : "Add New Staff Member"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Full Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Uwimana Jean"
                  className={cn(
                    "w-full h-11 px-4 bg-[#0F172A] border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                    errors.name ? "border-red-500 focus:ring-red-500" : "border-slate-700 focus:ring-blue-500"
                  )}
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className="w-full h-11 px-4 bg-[#0F172A] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Phone Number *</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="0781234567"
                  className={cn(
                    "w-full h-11 px-4 bg-[#0F172A] border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                    errors.phone ? "border-red-500 focus:ring-red-500" : "border-slate-700 focus:ring-blue-500"
                  )}
                />
                {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
              </div>

              {/* Email (optional) */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Email <span className="text-slate-500 font-normal">(optional)</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="staff@business.com"
                  className="w-full h-11 px-4 bg-[#0F172A] border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Branch */}
              {branches.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Branch</label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
                    className="w-full h-11 px-4 bg-[#0F172A] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">All branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* PIN */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">
                  4-Digit PIN {editingId ? <span className="text-slate-500 font-normal">(leave blank to keep current)</span> : "*"}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    value={form.pin}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setForm((p) => ({ ...p, pin: v }));
                    }}
                    placeholder="••••"
                    maxLength={4}
                    className={cn(
                      "w-full h-11 px-4 pr-11 bg-[#0F172A] border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all tracking-[0.5em] font-mono",
                      errors.pin ? "border-red-500 focus:ring-red-500" : "border-slate-700 focus:ring-blue-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.pin && <p className="text-xs text-red-400">{errors.pin}</p>}
                <p className="text-xs text-slate-500">Staff use this PIN to log in at the POS terminal</p>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-11 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingId ? "Save Changes" : "Add Staff Member")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffCard({
  member,
  isSelf,
  branches,
  onEdit,
  onToggle,
}: {
  member: StaffMember;
  isSelf: boolean;
  branches: { id: string; name: string }[];
  onEdit: () => void;
  onToggle: () => void;
}) {
  const meta = ROLE_META[member.role] ?? ROLE_META.cashier;
  const branchName = branches.find((b) => b.id === member.branch_id)?.name;

  return (
    <div className={cn(
      "bg-slate-800/60 border rounded-xl p-4 flex items-start gap-4 transition-all",
      member.is_active ? "border-slate-700/50" : "border-slate-700/30 opacity-70"
    )}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 text-base font-bold text-white">
        {member.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white truncate">{member.name}</span>
          {isSelf && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">You</span>
          )}
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium", meta.color)}>
            {meta.icon} {meta.label}
          </span>
        </div>

        <div className="mt-1.5 space-y-0.5">
          {member.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Phone className="w-3 h-3" /> {member.phone}
            </div>
          )}
          {member.email && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Mail className="w-3 h-3" /> {member.email}
            </div>
          )}
          {branchName && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Building2 className="w-3 h-3" /> {branchName}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <KeyRound className="w-3 h-3" /> PIN set
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isSelf && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            title="Edit"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all flex items-center justify-center"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggle}
            title={member.is_active ? "Deactivate" : "Reactivate"}
            className={cn(
              "w-8 h-8 rounded-lg transition-all flex items-center justify-center",
              member.is_active
                ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                : "text-slate-400 hover:text-green-400 hover:bg-green-500/10"
            )}
          >
            {member.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
