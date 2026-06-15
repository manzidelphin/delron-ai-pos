"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { cn, formatRWF, generateBarcode } from "@/lib/utils";
import {
  Plus, Search, Upload, Edit2, Trash2, Package,
  RefreshCw, X, Loader2, Barcode,
} from "lucide-react";
import type { Product } from "@/types";

const CATEGORIES = [
  "Beverages", "Snacks", "Dairy", "Bread & Bakery", "Household",
  "Personal Care", "Frozen Foods", "Fruits & Vegetables",
  "Meat & Fish", "Grains & Cereals", "Confectionery", "Other",
];

const UNITS = ["piece", "kg", "litre", "pack", "box", "dozen", "g", "ml"];

interface ProductWithSupplier extends Product {
  suppliers?: { name: string } | null;
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProductModal({
  product,
  suppliers,
  onClose,
  onSave,
}: {
  product: Partial<Product> | null;
  suppliers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    barcode: product?.barcode ?? "",
    category: product?.category ?? "Beverages",
    subcategory: product?.subcategory ?? "",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    cost_price: product?.cost_price?.toString() ?? "",
    quantity: product?.quantity?.toString() ?? "",
    min_quantity: product?.min_quantity?.toString() ?? "5",
    unit: product?.unit ?? "piece",
    expiry_date: product?.expiry_date ?? "",
    supplier_id: product?.supplier_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.price || isNaN(parseFloat(form.price))) e.price = "Valid price required";
    if (form.quantity === "" || isNaN(parseFloat(form.quantity))) e.quantity = "Quantity required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(isEdit ? "Product updated" : "Product added");
      onSave();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl my-4 animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{isEdit ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Product Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fanta Orange 500ml"
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Barcode */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Barcode</label>
            <div className="flex gap-2">
              <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or type barcode"
                className="flex-1 h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              <button onClick={() => setForm({ ...form, barcode: generateBarcode() })}
                className="h-11 px-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-slate-300 hover:text-white transition-all" title="Auto-generate">
                <Barcode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Selling Price */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Selling Price (RWF) *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0"
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
          </div>

          {/* Cost Price */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Cost Price (RWF)</label>
            <input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0"
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Quantity in Stock *</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0"
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {errors.quantity && <p className="text-red-400 text-xs mt-1">{errors.quantity}</p>}
          </div>

          {/* Min Quantity */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Min Stock Alert Qty</label>
            <input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} placeholder="5"
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Unit */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Unit</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Expiry Date</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Supplier */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Supplier</label>
            <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1.5">Subcategory (optional)</label>
            <input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} placeholder="e.g. Soft Drinks"
              className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 h-11 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-xl transition-all font-medium">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>{isEdit ? "Update Product" : "Add Product"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ product, onClose, onDelete }: { product: Product; onClose: () => void; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Product deleted");
      onDelete();
      onClose();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm animate-fade-in">
        <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white text-center mb-2">Delete Product?</h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          <span className="text-white font-medium">{product.name}</span> will be removed from your inventory.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 border border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithSupplier[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editProduct, setEditProduct] = useState<Partial<Product> | null | false>(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: "20", search, sort_by: sortBy, sort_dir: sortDir,
        ...(category !== "all" ? { category } : {}),
        ...(stockStatus !== "all" ? { stock_status: stockStatus } : {}),
      });
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (res.ok) { setProducts(data.products); setTotal(data.total); }
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  }, [page, search, category, stockStatus, sortBy, sortDir]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) { const d = await res.json(); setSuppliers(d.suppliers ?? []); }
    } catch {}
  };

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchSuppliers(); }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setPage(1), 300);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) { setSortDir(sortDir === "asc" ? "desc" : "asc"); }
    else { setSortBy(key); setSortDir("asc"); }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) { setSelectedIds(new Set()); }
    else { setSelectedIds(new Set(products.map((p) => p.id))); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} products?`)) return;
    await Promise.all([...selectedIds].map((id) => fetch(`/api/products/${id}`, { method: "DELETE" })));
    toast.success(`${selectedIds.size} products deleted`);
    setSelectedIds(new Set());
    fetchProducts();
  };

  const statusBadge = (p: Product) => {
    const isOut = p.quantity === 0;
    const isLow = p.quantity > 0 && p.quantity <= p.min_quantity;
    if (isOut) return <span className="status-badge bg-red-500/20 text-red-400 border border-red-500/20">Out of Stock</span>;
    if (isLow) return <span className="status-badge bg-amber-500/20 text-amber-400 border border-amber-500/20">Low Stock</span>;
    return <span className="status-badge bg-green-500/20 text-green-400 border border-green-500/20">In Stock</span>;
  };

  const columns: Column<ProductWithSupplier>[] = [
    {
      key: "name",
      label: "Product",
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
            {row.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.image_url as string} alt={row.name as string} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Package className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div>
            <p className="font-medium text-white">{row.name}</p>
            {row.barcode && <p className="text-xs text-slate-500 font-mono">{row.barcode}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (v) => (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {String(v ?? "—")}
        </span>
      ),
    },
    {
      key: "price",
      label: "Selling Price",
      sortable: true,
      render: (v) => <span className="font-semibold text-white">{formatRWF(Number(v))}</span>,
    },
    {
      key: "cost_price",
      label: "Cost Price",
      sortable: true,
      render: (v) => <span className="text-slate-400">{formatRWF(Number(v))}</span>,
    },
    {
      key: "quantity",
      label: "Qty",
      sortable: true,
      render: (v, row) => (
        <span className={cn("font-semibold", Number(v) === 0 ? "text-red-400" : Number(v) <= row.min_quantity ? "text-amber-400" : "text-white")}>
          {Number(v)} {row.unit}
        </span>
      ),
    },
    {
      key: "quantity",
      label: "Status",
      render: (_, row) => statusBadge(row),
    },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setEditProduct(row)} className="w-8 h-8 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 flex items-center justify-center transition-all">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteProduct(row)} className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        badge={total}
        description="Manage your supermarket inventory"
        actions={
          <>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete} className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
              </button>
            )}
            <button onClick={() => window.location.href = "/supermarket/import"} className="h-9 px-4 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg text-sm font-medium transition-all flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={() => setEditProduct({})} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search products or barcodes..."
            className="w-full h-10 pl-10 pr-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="h-10 pl-3 pr-8 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
            className="h-10 pl-3 pr-8 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <button onClick={fetchProducts} className="h-10 w-10 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={products as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyIcon={<Package className="w-6 h-6" />}
        emptyTitle="No products found"
        emptyDescription={search ? `No results for "${search}"` : "Add your first product to get started"}
        emptyAction={
          <button onClick={() => setEditProduct({})} className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        }
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        selectedIds={selectedIds}
        onSelect={(id) => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; })}
        onSelectAll={handleSelectAll}
        getRowId={(row) => String(row.id)}
        onRowClick={(row) => setEditProduct(row as unknown as Product)}
        getRowClassName={(row) => {
          const p = row as unknown as Product;
          if (p.quantity === 0) return "bg-red-500/5";
          if (p.quantity <= p.min_quantity) return "bg-amber-500/5";
          return "";
        }}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} products
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              className="h-8 px-3 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-40 transition-all">← Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={cn("h-8 w-8 rounded-lg text-sm font-medium transition-all", p === page ? "bg-blue-600 text-white" : "border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600")}>
                  {p}
                </button>
              );
            })}
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
              className="h-8 px-3 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-40 transition-all">Next →</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {editProduct !== false && (
        <ProductModal product={editProduct} suppliers={suppliers} onClose={() => setEditProduct(false)} onSave={fetchProducts} />
      )}
      {deleteProduct && (
        <DeleteConfirm product={deleteProduct} onClose={() => setDeleteProduct(null)} onDelete={fetchProducts} />
      )}
    </div>
  );
}
