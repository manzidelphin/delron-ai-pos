"use client";

import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  getRowId?: (row: T) => string;
  getRowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyIcon,
  emptyTitle = "No results",
  emptyDescription,
  emptyAction,
  sortBy,
  sortDir,
  onSort,
  selectedIds,
  onSelect,
  onSelectAll,
  getRowId,
  getRowClassName,
  onRowClick,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const hasCheckbox = !!onSelect;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              {hasCheckbox && (
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds ? data.length > 0 && selectedIds.size === data.length : false}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:text-white select-none",
                    col.className
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-slate-600">
                        {sortBy === col.key ? (
                          sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {hasCheckbox && (
                      <td className="px-4 py-3.5">
                        <div className="w-4 h-4 bg-slate-700 rounded" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <div className="h-4 bg-slate-700/70 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.length === 0
              ? (
                  <tr>
                    <td colSpan={columns.length + (hasCheckbox ? 1 : 0)}>
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        {emptyIcon && (
                          <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mb-4 text-slate-500">
                            {emptyIcon}
                          </div>
                        )}
                        <p className="text-sm font-medium text-slate-300">{emptyTitle}</p>
                        {emptyDescription && (
                          <p className="text-xs text-slate-500 mt-1 max-w-xs">{emptyDescription}</p>
                        )}
                        {emptyAction && <div className="mt-4">{emptyAction}</div>}
                      </div>
                    </td>
                  </tr>
                )
              : data.map((row, idx) => {
                  const id = getRowId?.(row) ?? String(idx);
                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "transition-colors",
                        onRowClick && "cursor-pointer hover:bg-slate-700/40",
                        selectedIds?.has(id) && "bg-blue-500/5",
                        getRowClassName?.(row)
                      )}
                    >
                      {hasCheckbox && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds?.has(id) ?? false}
                            onChange={() => onSelect?.(id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3.5 text-sm", col.className)}>
                          {col.render
                            ? col.render(row[col.key], row)
                            : String(row[col.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
