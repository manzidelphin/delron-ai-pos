"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Star, Loader2, Trash2 } from "lucide-react";
import type { Branch } from "@/types";

interface StaffCount { branch_id: string; count: number }

export default function BranchesPage() {
  const { setBranches } = useAuthStore();
  const [branches, setBranchState] = useState<Branch[]>([]);
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", phone: "" });

  const load = useCallback(async () => {
    const [bRes, sRes] = await Promise.all([fetch("/api/branches"), fetch("/api/settings/staff")]);
    if (bRes.ok) {
      const data: Branch[] = await bRes.json();
      setBranchState(data);
      setBranches(data);
    }
    if (sRes.ok) {
      const staff: StaffCount[] = await sRes.json();
      const counts: Record<string, number> = {};
      for (const s of staff as {branch_id: string | null}[]) {
        if (s.branch_id) counts[s.branch_id] = (counts[s.branch_id] ?? 0) + 1;
      }
      setStaffCounts(counts);
    }
    setLoading(false);
  }, [setBranches]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ name: "", location: "", phone: "" }); setEditBranch(null); setShowModal(true); };
  const openEdit = (b: Branch) => { setForm({ name: b.name, location: b.location ?? "", phone: b.phone ?? "" }); setEditBranch(b); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Branch name is required"); return; }
    setSaving(true);
    try {
      const url = editBranch ? `/api/branches/${editBranch.id}` : "/api/branches";
      const res = await fetch(url, { method: editBranch ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editBranch ? "Branch updated" : "Branch created");
      setShowModal(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    setSaving(false);
  };

  const setMain = async (id: string) => {
    const res = await fetch(`/api/branches/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_main: true }) });
    if (res.ok) { toast.success("Main branch updated"); load(); }
    else toast.error("Failed to update");
  };

  const deleteBranch = async (id: string) => {
    if (!confirm("Delete this branch? This cannot be undone.")) return;
    const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Branch removed"); load(); }
    else toast.error((await res.json()).error ?? "Failed to delete");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Branch Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">{branches.length} branch{branches.length !== 1 ? "es" : ""}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />Add Branch
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className={cn("bg-slate-800 border rounded-xl p-5 transition-all", branch.is_main ? "border-blue-500/40" : "border-slate-700")}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{branch.name}</p>
                    {branch.is_main && <span className="text-[10px] text-blue-400 font-medium flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-current" />Main Branch</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(branch)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  {!branch.is_main && <button onClick={() => deleteBranch(branch.id)} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                {branch.location && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{branch.location}</p>}
                {branch.phone && <p>{branch.phone}</p>}
                <p>{staffCounts[branch.id] ?? 0} staff members</p>
              </div>
              {!branch.is_main && (
                <button onClick={() => setMain(branch.id)} className="mt-3 w-full py-1.5 rounded-lg border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/10 transition-colors">
                  Set as Main Branch
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white text-lg">{editBranch ? "Edit Branch" : "Add New Branch"}</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Branch Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Main Branch" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Location</label><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Kigali, Nyarugenge" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Phone</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+250 7XX XXX XXX" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{editBranch ? "Save" : "Create Branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
