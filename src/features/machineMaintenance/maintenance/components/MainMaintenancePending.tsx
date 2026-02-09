"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Upload,
  Eye,
} from "lucide-react";
import Image from "next/image";
import {
  usePendingMaintenanceQuery,
  useBulkCompleteMaintenanceMutation,
  useCompleteMaintenanceMutation,
} from "../server/tanstackQuery/useMaintenanceQueries";
import type { MachineMaintenance } from "../../types/types";

export default function MainMaintenancePending() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [taskRemarks, setTaskRemarks] = useState<Record<number, string>>({});
  const [taskImages, setTaskImages] = useState<
    Record<number, { file: File; previewUrl: string }>
  >({});

  const limit = 30;

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
  );

  const tasks = data?.data || [];
  const totalCount = data?.totalCount || 0;

  const completeMutation = useCompleteMaintenanceMutation();
  const bulkMutation = useBulkCompleteMaintenanceMutation();
  const isSubmitting = completeMutation.isPending || bulkMutation.isPending;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1);
    setSelectedTasks(new Set());
  };

  const toggleTaskSelection = (taskId: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const selectAllTasks = () => {
    const allIds = tasks.map((t) => t.task_id);
    setSelectedTasks(new Set(allIds));
  };

  const deselectAllTasks = () => {
    setSelectedTasks(new Set());
  };

  const updateTaskRemark = (taskId: number, remark: string) => {
    setTaskRemarks((prev) => ({ ...prev, [taskId]: remark }));
    if (!selectedTasks.has(taskId)) {
      toggleTaskSelection(taskId);
    }
  };

  const handleImageUpload = (
    taskId: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTaskImages((prev) => ({ ...prev, [taskId]: { file, previewUrl } }));
      if (!selectedTasks.has(taskId)) {
        toggleTaskSelection(taskId);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedTasks.size === 0) {
      alert("Please select at least one task");
      return;
    }

    // We can use bulk mutation even for single items if we adapt the API,
    // but the API has completeMaintenance (single) and bulkCompleteMaintenance.
    // However, the UI logic here iterates and calls completeMaintenance for each.
    // We should probably adapt to use Promise.all with the single mutation OR use a bulk mutation if the API supports partial updates per item (images/remarks per item).
    // The current API bulkCompleteMaintenance only takes one 'remarks' for all.
    // But here we have per-task remarks and images.
    // So we must keep the loop but use mutation.mutateAsync.

    try {
      const promises = Array.from(selectedTasks).map(async (taskId) => {
        const image = taskImages[taskId];
        const remarks = taskRemarks[taskId];
        return completeMutation.mutateAsync({
          taskId,
          remarks,
          imageFile: image?.file,
        });
      });

      await Promise.all(promises);

      // Reset
      setSelectedTasks(new Set());
      setTaskRemarks({});
      setTaskImages({});
      // Query invalidation happens in useCompleteMaintenanceMutation
    } catch (error) {
      console.error("Error submitting tasks:", error);
      alert("Error submitting tasks");
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Pending Maintenance
          </h1>
          <p className="text-muted-foreground">
            Complete maintenance tasks for today
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedTasks.size > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Submit ({selectedTasks.size})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Search & Selection Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by machine, task, or person..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAllTasks}
            className="px-3 py-2 text-sm text-foreground bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAllTasks}
            className="px-3 py-2 text-sm text-foreground bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No pending maintenance tasks
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedTasks.size === tasks.length && tasks.length > 0
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAllTasks() : deselectAllTasks()
                      }
                      className="w-4 h-4 rounded border-neutral-300 text-green-600 focus:ring-green-500"
                    />
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Remarks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Image
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {tasks.map((task) => (
                  <tr
                    key={task.task_id}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                      selectedTasks.has(task.task_id)
                        ? "bg-green-50 dark:bg-green-900/10"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.task_id)}
                        onChange={() => toggleTaskSelection(task.task_id)}
                        className="w-4 h-4 rounded border-neutral-300 text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {task.machine_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-xs">
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
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={taskRemarks[task.task_id] || ""}
                        onChange={(e) =>
                          updateTaskRemark(task.task_id, e.target.value)
                        }
                        placeholder="Add remark..."
                        className="w-full px-2 py-1 text-sm bg-transparent border border-neutral-300 dark:border-neutral-600 rounded focus:ring-1 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors">
                          <Upload className="w-3 h-3" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(task.task_id, e)}
                            className="hidden"
                          />
                        </label>
                        {taskImages[task.task_id] && (
                          <div className="relative w-8 h-8">
                            <Image
                              src={taskImages[task.task_id].previewUrl}
                              alt="Preview"
                              fill
                              className="object-cover rounded"
                            />
                          </div>
                        )}
                      </div>
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
    </div>
  );
}
