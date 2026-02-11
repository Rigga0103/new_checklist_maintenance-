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
  X,
} from "lucide-react";
import Image from "next/image";
import { useMaintenanceHistoryQuery } from "../server/tanstackQuery/useMaintenanceQueries";
import type { MachineMaintenance } from "../../types/types";
import { useRBAC } from "@/hooks/useRBAC";

export default function MainMaintenanceHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<MachineMaintenance | null>(
    null,
  );

  const limit = 30;

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  const { data, isLoading } = useMaintenanceHistoryQuery(
    page,
    limit,
    searchTerm,
    role,
    username,
  );

  const { canRead, isLoading: isRbacLoading } = useRBAC("maintenance_history");

  const tasks = data?.data || [];
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

  const getFrequencyBadge = (frequency: string | null) => {
    const colors: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      weekly:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      monthly:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      quarterly:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };

    const colorClass = frequency
      ? colors[frequency.toLowerCase()] ||
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}
      >
        {frequency || "-"}
      </span>
    );
  };

  const exportToExcel = () => {
    const headers = [
      "Task ID",
      "Machine Name",
      "Task Description",
      "Frequency",
      "Doer",
      "Planned Date",
      "Actual Date",
      "Status",
      "Remarks",
    ];

    const rows = tasks.map((t) => [
      t.task_id,
      t.machine_name || "",
      t.task_description || "",
      t.frequency || "",
      t.doer_name || "",
      formatDate(t.task_start_date),
      formatDate(t.actual_date),
      t.status || "",
      t.remarks || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maintenance_history_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(totalCount / limit);

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
        Access Denied. You do not have permission to view Maintenance History.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Maintenance History
          </h1>
          <p className="text-muted-foreground">Completed maintenance tasks</p>
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

      {/* Summary */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Completed Tasks</p>
          <p className="text-xl font-bold text-foreground">{totalCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by machine, task, or person..."
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
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No maintenance history found
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
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Doer
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
                {tasks.map((task) => (
                  <tr
                    key={task.task_id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      #{task.task_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {task.machine_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                      {task.task_description || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {getFrequencyBadge(task.frequency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {task.doer_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(task.actual_date)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedTask(task)}
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
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-foreground">
                Task #{selectedTask.task_id}
              </h2>
              <button
                onClick={() => setSelectedTask(null)}
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
                    {selectedTask.machine_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Frequency</p>
                  {getFrequencyBadge(selectedTask.frequency)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Task Description
                  </p>
                  <p className="font-medium text-foreground">
                    {selectedTask.task_description || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doer</p>
                  <p className="font-medium text-foreground">
                    {selectedTask.doer_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium text-foreground">
                    {selectedTask.department || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Planned Date</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedTask.task_start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed On</p>
                  <p className="font-medium text-foreground">
                    {formatDate(selectedTask.actual_date)}
                  </p>
                </div>
                {selectedTask.remarks && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Remarks</p>
                    <p className="font-medium text-foreground">
                      {selectedTask.remarks}
                    </p>
                  </div>
                )}
              </div>

              {selectedTask.image_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Completion Photo
                  </p>
                  <div className="relative w-full h-48">
                    <Image
                      src={selectedTask.image_url}
                      alt="Completion photo"
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setSelectedTask(null)}
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
