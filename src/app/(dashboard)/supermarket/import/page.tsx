"use client";

import { useState, useRef, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { formatRWF } from "@/lib/utils";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ImportRow {
  name: string;
  barcode?: string;
  category?: string;
  unit_price: number;
  cost_price?: number;
  quantity: number;
  min_quantity?: number;
  unit?: string;
  supplier_name?: string;
  expiry_date?: string;
  _status?: "valid" | "error" | "warning";
  _errors?: string[];
}

const TEMPLATE_COLUMNS = [
  "name",
  "barcode",
  "category",
  "unit_price",
  "cost_price",
  "quantity",
  "min_quantity",
  "unit",
  "supplier_name",
  "expiry_date",
];

const CATEGORIES = [
  "Beverages",
  "Snacks",
  "Dairy",
  "Bread & Bakery",
  "Household",
  "Personal Care",
  "Frozen Foods",
  "Fruits & Vegetables",
  "Meat & Fish",
  "Grains & Cereals",
  "Confectionery",
  "Other",
];

const SAMPLE_DATA = [
  {
    name: "Primus Beer 500ml",
    barcode: "2001001001",
    category: "Beverages",
    unit_price: 800,
    cost_price: 650,
    quantity: 120,
    min_quantity: 24,
    unit: "piece",
    supplier_name: "Bralirwa",
    expiry_date: "2025-12-31",
  },
  {
    name: "Inyange Milk 1L",
    barcode: "2001001002",
    category: "Dairy",
    unit_price: 900,
    cost_price: 750,
    quantity: 80,
    min_quantity: 20,
    unit: "piece",
    supplier_name: "Inyange Industries",
    expiry_date: "2025-07-15",
  },
  {
    name: "Sugar 1kg",
    barcode: "",
    category: "Grains & Cereals",
    unit_price: 1200,
    cost_price: 1000,
    quantity: 50,
    min_quantity: 10,
    unit: "kg",
    supplier_name: "",
    expiry_date: "",
  },
];

function validateRow(row: Record<string, unknown>, _index: number): ImportRow {
  const errors: string[] = [];
  const name = String(row.name || "").trim();
  const unit_price = parseFloat(String(row.unit_price || "0").replace(/,/g, ""));
  const quantity = parseInt(String(row.quantity || "0").replace(/,/g, ""));
  const category = String(row.category || "Other").trim();

  if (!name) errors.push("Name is required");
  if (isNaN(unit_price) || unit_price < 0) errors.push("Unit price must be a positive number");
  if (isNaN(quantity) || quantity < 0) errors.push("Quantity must be a non-negative number");

  const validCategory = CATEGORIES.includes(category) ? category : "Other";

  return {
    name,
    barcode: String(row.barcode || "").trim() || undefined,
    category: validCategory,
    unit_price: isNaN(unit_price) ? 0 : unit_price,
    cost_price: parseFloat(String(row.cost_price || "0").replace(/,/g, "")) || undefined,
    quantity: isNaN(quantity) ? 0 : quantity,
    min_quantity: parseInt(String(row.min_quantity || "5")) || 5,
    unit: String(row.unit || "piece").trim() || "piece",
    supplier_name: String(row.supplier_name || "").trim() || undefined,
    expiry_date: String(row.expiry_date || "").trim() || undefined,
    _status: errors.length > 0 ? "error" : "valid",
    _errors: errors,
  };
}

export default function ImportPage() {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r._status === "valid");
  const errorRows = rows.filter((r) => r._status === "error");

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [TEMPLATE_COLUMNS, ...SAMPLE_DATA.map((r) => TEMPLATE_COLUMNS.map((c) => (r as Record<string, unknown>)[c] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "delron_products_template.xlsx");
  };

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { raw: false, defval: "" }) as Record<string, unknown>[];

        if (json.length === 0) {
          alert("The file appears to be empty.");
          return;
        }

        const parsed = json.map((row, i) => validateRow(row, i));
        setRows(parsed);
        setStep("preview");
      } catch {
        alert("Failed to parse the file. Please use the template provided.");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setStep("importing");
    setImportProgress(0);

    const CHUNK = 50;
    let imported = 0;
    let errors = 0;

    const chunks: ImportRow[][] = [];
    for (let i = 0; i < validRows.length; i += CHUNK) {
      chunks.push(validRows.slice(i, i + CHUNK));
    }

    for (let c = 0; c < chunks.length; c++) {
      try {
        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunks[c] }),
        });
        const json = await res.json();
        if (res.ok) {
          imported += json.imported ?? chunks[c].length;
          errors += json.errors ?? 0;
        } else {
          errors += chunks[c].length;
        }
      } catch {
        errors += chunks[c].length;
      }
      setImportProgress(Math.round(((c + 1) / chunks.length) * 100));
    }

    setImportResult({ imported, errors });
    setStep("done");
  };

  const reset = () => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setImportProgress(0);
    setImportResult(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Import Products"
        description="Bulk import products from an Excel or CSV file"
        actions={
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        }
      />

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {(["upload", "preview", "importing", "done"] as const).map((s, i) => {
          const labels = ["Upload File", "Preview & Validate", "Importing", "Complete"];
          const isActive = step === s;
          const isDone =
            (step === "preview" && i === 0) ||
            (step === "importing" && i <= 1) ||
            (step === "done" && i <= 2);
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isDone
                    ? "bg-green-500/20 text-green-400"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 flex items-center justify-center text-xs">{i + 1}</span>}
                {labels[i]}
              </div>
              {i < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
            </div>
          );
        })}
      </div>

      {/* STEP: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-600 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-800"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
            <div className="flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDragging ? "bg-blue-500/20" : "bg-slate-700"}`}>
                <Upload className={`w-8 h-8 ${isDragging ? "text-blue-400" : "text-slate-400"}`} />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {isDragging ? "Drop your file here" : "Drag & drop your file here"}
                </p>
                <p className="text-sm text-slate-400 mt-1">or click to browse — supports .xlsx, .xls, .csv</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Max 5,000 products per import</span>
                <span>•</span>
                <span>Duplicate barcodes will be updated</span>
              </div>
            </div>
          </div>

          {/* Template guide */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">Template Guide</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { col: "name *", desc: "Product name (required)", example: "Primus Beer 500ml" },
                { col: "unit_price *", desc: "Selling price in RWF (required)", example: "800" },
                { col: "quantity *", desc: "Current stock quantity (required)", example: "120" },
                { col: "barcode", desc: "Barcode (auto-generated if empty)", example: "2001001001" },
                { col: "category", desc: "Product category", example: "Beverages" },
                { col: "cost_price", desc: "Purchase cost in RWF", example: "650" },
                { col: "min_quantity", desc: "Low stock alert threshold", example: "24" },
                { col: "unit", desc: "Unit of measurement", example: "piece, kg, litre" },
                { col: "supplier_name", desc: "Supplier company name", example: "Bralirwa" },
                { col: "expiry_date", desc: "Expiry date (YYYY-MM-DD)", example: "2025-12-31" },
              ].map(({ col, desc, example }) => (
                <div key={col} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl">
                  <code className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded shrink-0">{col}</code>
                  <div>
                    <p className="text-xs text-slate-300">{desc}</p>
                    <p className="text-xs text-slate-500 mt-0.5">e.g. {example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{fileName}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {validRows.length} valid
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-red-400">
                    <XCircle className="w-4 h-4" />
                    {errorRows.length} errors (will be skipped)
                  </span>
                )}
                <span className="text-slate-400">{rows.length} total rows</span>
              </div>
            </div>
            <button onClick={reset} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
              Change file
            </button>
          </div>

          {/* Preview table */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Supplier</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-700/50 last:border-0 ${
                        row._status === "error" ? "bg-red-500/5" : "hover:bg-slate-700/20"
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white truncate max-w-[200px]">{row.name || <span className="text-red-400 italic">missing</span>}</p>
                        {row.barcode && <p className="text-xs text-slate-500">{row.barcode}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.category}</td>
                      <td className="px-4 py-3 text-right font-medium text-white">{formatRWF(row.unit_price)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{row.quantity}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{row.supplier_name || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {row._status === "valid" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs text-red-400">
                              <XCircle className="w-3.5 h-3.5" />
                              Error
                            </span>
                            {row._errors?.map((e, j) => (
                              <span key={j} className="text-[10px] text-red-300/70">{e}</span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <div className="px-4 py-3 text-center text-sm text-slate-500 border-t border-slate-700">
                  Showing first 100 of {rows.length} rows
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={reset} className="h-12 px-6 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 font-medium transition-all">
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={validRows.length === 0}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {validRows.length === 0 ? (
                "No valid rows to import"
              ) : (
                <>Import {validRows.length} Products{errorRows.length > 0 && ` (skip ${errorRows.length} errors)`}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP: Importing */}
      {step === "importing" && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">Importing products...</p>
            <p className="text-sm text-slate-400 mt-1">Please do not close this page</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-slate-400 mt-2">{importProgress}%</p>
          </div>
        </div>
      )}

      {/* STEP: Done */}
      {step === "done" && importResult && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">Import Complete!</p>
            <p className="text-slate-400 mt-1">Your products have been added to inventory</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-black text-green-400">{importResult.imported}</p>
              <p className="text-sm text-slate-400">Imported</p>
            </div>
            {importResult.errors > 0 && (
              <div className="text-center">
                <p className="text-3xl font-black text-red-400">{importResult.errors}</p>
                <p className="text-sm text-slate-400">Failed</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="h-12 px-6 rounded-xl border border-slate-600 text-slate-300 hover:text-white font-medium transition-all">
              Import Another File
            </button>
            <a
              href="/supermarket/products"
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all flex items-center"
            >
              View Products →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
