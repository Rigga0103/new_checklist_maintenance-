"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit,
  X,
  Upload,
  Save,
  Download,
} from "lucide-react";
import Image from "next/image";
import {
  usePendingMaintenanceQuery,
  useCompleteMaintenanceMutation,
  useMaintenanceLast7DaysQuery,
} from "../server/tanstackQuery/useMaintenanceQueries";
import type { MachineMaintenance } from "../../types/types";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";

export default function MainMaintenancePending() {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"pending" | "last7days">(
    "pending",
  );
  const [selectedTask, setSelectedTask] = useState<MachineMaintenance | null>(
    null,
  );

  const limit = 20;

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  const { data, isLoading } = usePendingMaintenanceQuery(
    page,
    limit,
    searchTerm,
    role,
    username,
    startDate || undefined,
    endDate || undefined,
  );

  const { data: last7DaysData, isLoading: isLast7DaysLoading } =
    useMaintenanceLast7DaysQuery(searchTerm, role, username);

  const { canRead, canEdit, isLoading: isRbacLoading } = useRBAC("maintenance");

  const pendingTasks = data?.data || [];
  const pendingTotalCount = data?.totalCount || 0;
  const last7DaysTasks = last7DaysData?.data || [];

  const tasks = activeTab === "pending" ? pendingTasks : last7DaysTasks;
  const totalCount =
    activeTab === "pending" ? pendingTotalCount : last7DaysTasks.length;

  const completeMutation = useCompleteMaintenanceMutation();
  const isProcessing = completeMutation.isPending;

  // Process form state
  const [remarks, setRemarks] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState<number | undefined>(
    undefined,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const handleTabChange = (tab: "pending" | "last7days") => {
    setActiveTab(tab);
    setPage(1);
  };

  const openProcessModal = (task: MachineMaintenance) => {
    setSelectedTask(task);
    setRemarks(task.remarks || "");
    setMaintenanceCost(task.maintenance_cost || undefined);
    setImageFile(null);
    setImagePreview(task.image_url || null);
  };

  const closeProcessModal = () => {
    setSelectedTask(null);
    setRemarks("");
    setMaintenanceCost(undefined);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProcessSubmit = async () => {
    if (!selectedTask) return;

    try {
      await completeMutation.mutateAsync({
        taskId: selectedTask.task_id,
        remarks: remarks || undefined,
        imageFile: imageFile || undefined,
        maintenanceCost: maintenanceCost,
      });

      toast.success("Maintenance task completed successfully");
      closeProcessModal();
    } catch (error) {
      console.error("Error completing task:", error);
      toast.error("Failed to complete task");
    }
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

  const totalPages = Math.ceil(totalCount / limit);

  const exportToExcel = () => {
    const headers = [
      "Task ID",
      "Machine Name",
      "Task Description",
      "Frequency",
      "Doer",
      "Planned Date",
      ...(activeTab === "last7days" ? ["Completed Date", "Status"] : []),
    ];

    const rows = tasks.map((t) => [
      t.task_id,
      t.machine_name || "",
      t.task_description || "",
      t.frequency || "",
      t.doer_name || "",
      formatDate(t.task_start_date),
      ...(activeTab === "last7days"
        ? [
            formatDate(t.actual_date),
            t.actual_date
              ? "Completed"
              : new Date(t.task_start_date || "") < new Date()
                ? "Overdue"
                : "Pending",
          ]
        : []),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maintenance_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (
    (activeTab === "pending" && isLoading) ||
    (activeTab === "last7days" && isLast7DaysLoading) ||
    isRbacLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Access Denied. You do not have permission to view Pending Maintenance.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Pending Maintenance
          </h1>
          <p className="text-muted-foreground">
            {activeTab === "pending"
              ? "Complete maintenance tasks for today"
              : "All maintenance tasks from Monday to Saturday"}
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

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTabChange("pending")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => handleTabChange("last7days")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "last7days"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
          }`}
        >
          Last 7 Days
        </button>
      </div>

      {/* Filters */}
      {activeTab === "pending" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by machine, task, or doer..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Date Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground xl:min-w-37.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              title="Start Date"
            />
            <span className="text-muted-foreground hidden sm:inline">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground xl:min-w-37.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              title="End Date"
            />
          </div>
        </div>
      )}
      {activeTab === "last7days" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by machine, task, or doer..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No pending maintenance tasks found
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
                    Planned
                  </th>
                  {activeTab === "last7days" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Completed
                    </th>
                  )}
                  {activeTab === "last7days" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </th>
                  )}
                  {activeTab === "pending" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Action
                    </th>
                  )}
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
                      {formatDate(task.task_start_date)}
                    </td>
                    {activeTab === "last7days" && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(task.actual_date)}
                      </td>
                    )}
                    {activeTab === "last7days" && (
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            task.actual_date
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : task.task_start_date &&
                                  new Date(task.task_start_date) < new Date()
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {task.actual_date
                            ? "Completed"
                            : task.task_start_date &&
                                new Date(task.task_start_date) < new Date()
                              ? "Overdue"
                              : "Pending"}
                        </span>
                      </td>
                    )}
                    {activeTab === "pending" && (
                      <td className="px-4 py-3">
                        {canEdit && (
                          <button
                            onClick={() => openProcessModal(task)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Process
                          </button>
                        )}
                      </td>
                    )}
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

      {/* Process Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-foreground">
                Process Task #{selectedTask.task_id}
              </h2>
              <button
                onClick={closeProcessModal}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Read-only info */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg space-y-2">
                <p>
                  <span className="text-muted-foreground">Machine:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedTask.machine_name}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Task:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedTask.task_description}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Doer:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedTask.doer_name}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Frequency:</span>{" "}
                  {getFrequencyBadge(selectedTask.frequency)}
                </p>
              </div>

              {/* Maintenance Cost */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Maintenance Cost (₹)
                </label>
                <input
                  type="number"
                  value={maintenanceCost || ""}
                  onChange={(e) =>
                    setMaintenanceCost(
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add remarks..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Task Photo
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <div className="relative w-16 h-16">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={closeProcessModal}
                className="px-4 py-2 text-sm font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSubmit}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Complete Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
