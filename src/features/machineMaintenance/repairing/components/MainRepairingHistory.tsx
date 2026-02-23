"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  FileText,
  IndianRupee,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRepairHistoryQuery } from "../server/tanstackQuery/useRepairingQueries";
import type { MachineRepair } from "../../types/types";
import { useRBAC } from "@/hooks/useRBAC";

export default function MainRepairingHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRepair, setSelectedRepair] = useState<MachineRepair | null>(
    null,
  );

  const limit = 20;

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  const { data, isLoading } = useRepairHistoryQuery(
    page,
    limit,
    searchTerm,
    role,
    username,
  );

  const { canRead, isLoading: isRbacLoading } = useRBAC("repair_history");

  const repairs = data?.data || [];
  const totalCount = data?.totalCount || 0;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToExcel = () => {
    // Simple CSV export
    const headers = [
      "Task ID",
      "Machine Name",
      "Issue Detail",
      "Part Replaced",
      "Warranty",
      "Work Done",
      "Requested By",
      "Assigned To",
      "Vendor",
      "Bill Amount",
      "Request Date",
      "Completion Date",
      "Status",
    ];

    const rows = repairs.map((r) => [
      r.task_id,
      r.machine_name || "",
      r.issue_detail || "",
      r.part_replaced || "",
      r.warranty || "",
      r.work_done || "",
      r.form_filled_by || "",
      r.assigned_to || "",
      r.vendor_name || "",
      r.bill_amount || "",
      formatDate(r.created_at),
      formatDate(r.actual_date),
      r.status || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repair_history_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalCount / limit);

  // Calculate total cost
  const totalCost = repairs.reduce((sum, r) => sum + (r.bill_amount || 0), 0);

  if (isLoading || isRbacLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Access Denied. You do not have permission to view Repair History.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repair History</h1>
          <p className="text-muted-foreground">
            Completed repairs and their details
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Total Completed Repairs
            </p>
            <p className="text-xl font-bold text-foreground">{totalCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <IndianRupee className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Cost (Shown)</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by machine, issue, or person..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No repair history found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Machine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Work Done
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Part Replaced
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Warranty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {repairs.map((repair) => (
                  <tr
                    key={repair.task_id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      #{repair.task_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.machine_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                      {repair.work_done || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.part_replaced || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.warranty || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.assigned_to || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.vendor_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {formatCurrency(repair.bill_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(repair.actual_date)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedRepair(repair)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-foreground">
                Repair Details #{selectedRepair.task_id}
              </h2>
              <button
                onClick={() => setSelectedRepair(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Machine</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.machine_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Completed
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Issue Detail</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.issue_detail || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Work Done</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.work_done || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Part Replaced</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.part_replaced || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warranty</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.warranty || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.vendor_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bill Amount</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(selectedRepair.bill_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed On</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedRepair.actual_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested By</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.form_filled_by || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium text-foreground">
                    {selectedRepair.assigned_to || "-"}
                  </p>
                </div>
                {selectedRepair.remarks && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Remarks</p>
                    <p className="font-medium text-foreground">
                      {selectedRepair.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Photos */}
              {selectedRepair.photo_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Work Photo
                  </p>
                  <div className="relative w-full h-48">
                    <Image
                      src={selectedRepair.photo_url}
                      alt="Work photo"
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {selectedRepair.bill_copy_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Bill Copy
                  </p>
                  <a
                    href={selectedRepair.bill_copy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Bill
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setSelectedRepair(null)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
