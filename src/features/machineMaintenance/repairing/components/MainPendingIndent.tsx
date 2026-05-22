// MainPendingIndent.tsx
"use client";
import { useState } from "react";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  X,
} from "lucide-react";
import { usePendingIndentQuery } from "../server/tanstackQuery/useRepairingQueries";

const ITEMS_PER_PAGE = 20;

export default function MainPendingIndent() {  // ← Added export default
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");

  // Use the existing hook - it already returns { data, totalCount }
  const { data, isLoading } = usePendingIndentQuery(page, ITEMS_PER_PAGE, searchTerm);

  // The data structure from your API is { data: PendingIndentRow[], totalCount: number }
  const pendingIndents = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = () => {
    setSearchTerm(inputValue.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setInputValue("");
    setSearchTerm("");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            Pending Indent
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Parts awaiting indent / order placement
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="w-4 h-4" />
          <span>{totalCount} pending {totalCount === 1 ? "record" : "records"}</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search part, vendor, task ID..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
          {inputValue && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="max-h-[63vh] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-700">
              <tr>

                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Task ID</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Part Replaced</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Name</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate (₹)</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pendingIndents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ClipboardList className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No pending indent records found.</p>
                      {searchTerm && (
                        <button
                          onClick={handleClearSearch}
                          className="text-xs text-amber-500 hover:underline mt-1"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pendingIndents.map((record, idx) => (
                  <tr
                    key={record.id}
                    className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/20 transition-colors"
                  >

                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {record.task_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {record.part_replaced || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {record.vendor_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {record.rate ? `₹${record.rate.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {record.date ? new Date(record.date).toLocaleDateString("en-IN") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-30 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${page === pageNum
                      ? "bg-amber-500 text-white"
                      : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-neutral-300 dark:border-neutral-600 disabled:opacity-30 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}