"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { cn, getInitials, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { User, Building2, Calendar, KeyRound, Loader2, AlertTriangle, Eye, EyeOff, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROLE_COLOR: Record<string, string> = { owner: "bg-purple-500/10 text-purple-400 border-purple-500/20", manager: "bg-blue-500/10 text-blue-400 border-blue-500/20", cashier: "bg-green-500/10 text-green-400 border-green-500/20", baker: "bg-amber-500/10 text-amber-400 border-amber-500/20", waiter: "bg-orange-500/10 text-orange-400 border-orange-500/20", bartender: "bg-teal-500/10 text-teal-400 border-teal-500/20" };

export default function ProfilePage() {
  const router = useRouter();
  const { staff, business, reset } = useAuthStore();
  const [nameForm, setNameForm] = useState({ name: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (staff?.role === "baker") { router.replace("/pos"); return; }
    if (staff) setNameForm({ name: staff.name });
  }, [staff, router]);

  const saveName = async () => {
    if (!staff) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/settings/staff/${staff.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nameForm.name }) });
      if (!res.ok) throw new Error();
      toast.success("Name updated");
    } catch { toast.error("Failed to update name"); }
    setSavingName(false);
  };

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    if (pwForm.next.length < 8) { toast.error("Minimum 8 characters"); return; }
    setSavingPw(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      toast.success("Password updated");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setSavingPw(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  };

  if (!staff) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your personal information</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-blue-400">{getInitials(staff.name)}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{staff.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize", ROLE_COLOR[staff.role] ?? "bg-slate-700 text-slate-300 border-slate-600")}>{staff.role}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{business?.name}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Since {formatDate(staff.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Edit name */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><User className="w-4 h-4 text-blue-400" /><h3 className="font-semibold text-white">Personal Information</h3></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Full Name</label><input value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Phone</label><div className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-500">{staff.phone ?? "—"}</div></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Email</label><div className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-500">{staff.email ?? "—"}</div></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Role</label><div className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-500 capitalize">{staff.role}</div></div>
        </div>
        <button onClick={saveName} disabled={savingName} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
          {savingName && <Loader2 className="w-4 h-4 animate-spin" />}Save Changes
        </button>
      </div>

      {/* Change password */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-green-400" /><h3 className="font-semibold text-white">Change Password</h3></div>
        <div className="space-y-3">
          {[{ key: "next" as const, label: "New Password" }, { key: "confirm" as const, label: "Confirm Password" }].map(f => (
            <div key={f.key}><label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={pwForm[f.key]} onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder="••••••••" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white pr-10 focus:outline-none focus:border-blue-500" />
                {f.key === "next" && <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={changePassword} disabled={savingPw} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
          {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}Update Password
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>

      {/* Danger zone */}
      {staff.role === "owner" && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /><h3 className="font-semibold text-red-400">Danger Zone</h3></div>
          <p className="text-sm text-slate-400">Deleting your account is permanent and will remove all business data.</p>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors">Delete Account</button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Type <span className="font-mono text-red-400">DELETE</span> to confirm:</p>
              <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="w-full bg-slate-900 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
              <div className="flex gap-2">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 transition-colors">Cancel</button>
                <button disabled={deleteConfirmText !== "DELETE"} onClick={() => toast.error("Contact support to delete your account")} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm disabled:opacity-40 hover:bg-red-700 transition-colors">Confirm Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
