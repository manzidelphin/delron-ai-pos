"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  Plus,
  Search,
  X,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

interface SupplierForm {
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: SupplierForm = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

function SupplierModal({
  supplier,
  onClose,
  onSave,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<SupplierForm>(
    supplier
      ? {
          name: supplier.name,
          contact_name: supplier.contact_name || "",
          phone: supplier.phone || "",
          email: supplier.email || "",
          address: supplier.address || "",
          notes: supplier.notes || "",
        }
      : EMPTY_FORM
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof SupplierForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const method = supplier ? "PUT" : "POST";
      const body = supplier ? { id: supplier.id, ...form } : form;
      const res = await fetch("/api/suppliers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save supplier");
        return;
      }
      onSave();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {supplier ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {[
            { field: "name" as const, label: "Supplier Name *", placeholder: "Bralirwa Ltd", icon: <Building2 className="w-4 h-4" /> },
            { field: "contact_name" as const, label: "Contact Person", placeholder: "Jean Uwimana", icon: null },
            { field: "phone" as const, label: "Phone Number", placeholder: "0788 000 000", icon: <Phone className="w-4 h-4" /> },
            { field: "email" as const, label: "Email Address", placeholder: "info@supplier.rw", icon: <Mail className="w-4 h-4" /> },
            { field: "address" as const, label: "Address", placeholder: "KG 123 St, Kigali", icon: <MapPin className="w-4 h-4" /> },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="text-sm font-medium text-slate-300 block mb-1.5">{label}</label>
              <input
                type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                autoFocus={field === "name"}
                className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors[field] && <p className="text-red-400 text-xs mt-1">{errors[field]}</p>}
            </div>
          ))}

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional information about this supplier..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:text-white font-medium transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                supplier ? "Save Changes" : "Add Supplier"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ name, onConfirm, onClose, isLoading }: { name: string; onConfirm: () => void; onClose: () => void; isLoading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-white">Delete Supplier?</p>
            <p className="text-sm text-slate-400">{name}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">This supplier will be removed. Products linked to them will remain.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const loadSuppliers = useCallback(async (q = "") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/suppliers${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const json = await res.json();
      if (res.ok) setSuppliers(json.suppliers ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => loadSuppliers(val), 300);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/suppliers?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTarget(null);
        await loadSuppliers(search);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Suppliers"
        badge={suppliers.length}
        description="Manage your product suppliers and vendors"
        actions={
          <button
            onClick={() => { setEditTarget(null); setModal("add"); }}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        }
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search suppliers..."
          className="w-full h-10 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {search && (
          <button onClick={() => { setSearch(""); loadSuppliers(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium">No suppliers yet</p>
          <p className="text-slate-500 text-sm mt-1">Add your first supplier to get started</p>
          <button
            onClick={() => { setEditTarget(null); setModal("add"); }}
            className="mt-4 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all"
          >
            Add Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditTarget(s); setModal("edit"); }}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-white leading-tight">{s.name}</h3>
              {s.contact_name && <p className="text-sm text-slate-400 mt-0.5">{s.contact_name}</p>}

              <div className="mt-3 space-y-1.5">
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="w-3 h-3 shrink-0 text-slate-500" />
                    {s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                    <Mail className="w-3 h-3 shrink-0 text-slate-500" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === "add" || modal === "edit") && (
        <SupplierModal
          supplier={modal === "edit" ? editTarget : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); loadSuppliers(search); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
