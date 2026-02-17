"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Search,
  Check,
  FileText,
  Loader2,
  Upload,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useMaintenanceDashboard } from "../hooks/useMaintenanceDashboard";
import { toast } from "sonner";
import { formatDate } from "../hooks/useMaintenanceDashboard";

const ITEMS_PER_PAGE = 50;

interface MaintenanceListProps {
  initialTab?: "pending" | "history";
  showTabs?: boolean;
}

export default function MaintenanceList({
  initialTab = "pending",
  showTabs = true,
}: MaintenanceListProps) {
  const {
    maintenanceLoading,
    maintenanceError,
    refetchMaintenance,
    filteredMaintenanceData,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedMachines,
    setSelectedMachines,
    showMachineDropdown,
    setShowMachineDropdown,
    machineDropdownRef,
    machinesList,
    handleMachineSelection,
    hasActiveFilters,
    resetFilters,
    updateTaskMutation,
    uploadImageMutation,
  } = useMaintenanceDashboard();

  // Set initial tab on mount if provided
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, setActiveTab]);

  // Local state for interactions
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [taskRemarks, setTaskRemarks] = useState<Record<number, string>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<number, string>>({});
  const [taskImages, setTaskImages] = useState<
    Record<
      number,
      {
        file: File;
        previewUrl: string;
        uploadedUrl?: string;
        uploading?: boolean;
      }
    >
  >({});

  // Pagination
  const totalPages = Math.ceil(filteredMaintenanceData.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredMaintenanceData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const showingStart =
    filteredMaintenanceData.length > 0
      ? (currentPage - 1) * ITEMS_PER_PAGE + 1
      : 0;
  const showingEnd = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredMaintenanceData.length,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedTasks(new Set());
  }, [activeTab, searchTerm, selectedMachines]);

  // Handlers
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
    const allIds = paginatedTasks.map((t) => t.id);
    setSelectedTasks(new Set(allIds));
  };

  const deselectAllTasks = () => {
    setSelectedTasks(new Set());
  };

  const markAllDone = () => {
    const allIds = paginatedTasks.map((t) => t.id);
    setSelectedTasks(new Set(allIds));
    const newStatuses: Record<number, string> = { ...taskStatuses };
    allIds.forEach((id) => {
      newStatuses[id] = "Done";
    });
    setTaskStatuses(newStatuses);
  };

  const doneCount = Array.from(selectedTasks).filter(
    (taskId) => taskStatuses[taskId] === "Done",
  ).length;

  const updateTaskStatus = (taskId: number, status: string) => {
    setTaskStatuses((prev) => ({ ...prev, [taskId]: status }));
    if (!selectedTasks.has(taskId)) {
      toggleTaskSelection(taskId);
    }
  };

  const updateTaskRemark = (taskId: number, remark: string) => {
    setTaskRemarks((prev) => ({ ...prev, [taskId]: remark }));
    if (!selectedTasks.has(taskId)) {
      toggleTaskSelection(taskId);
    }
  };

  const handleImageUpload = async (
    taskId: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setTaskImages((prev) => ({
      ...prev,
      [taskId]: { file, previewUrl, uploading: true },
    }));

    if (!selectedTasks.has(taskId)) {
      toggleTaskSelection(taskId);
    }

    try {
      const uploadedUrl = await uploadImageMutation.mutateAsync({
        file,
        taskId,
      });

      setTaskImages((prev) => ({
        ...prev,
        [taskId]: {
          file,
          previewUrl,
          uploadedUrl,
          uploading: false,
        },
      }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload image");
      setTaskImages((prev) => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  };

  const handleSubmit = async () => {
    if (selectedTasks.size === 0) return;

    const uploadingTasks = Array.from(selectedTasks).filter(
      (taskId) => taskImages[taskId] && taskImages[taskId].uploading,
    );
    if (uploadingTasks.length > 0) {
      toast.error("Please wait for images to finish uploading");
      return;
    }

    try {
      const promises = Array.from(selectedTasks).map((taskId) => {
        const updates: Partial<
          import("../server/api/repairDashboardApi").MachineMaintenanceTask
        > = {};
        if (taskStatuses[taskId] === "Done") {
          updates.status = "Done";
          updates.actual_date = new Date().toISOString();
        } else if (taskStatuses[taskId]) {
          updates.status = taskStatuses[taskId];
        }

        if (taskRemarks[taskId]) {
          updates.remarks = taskRemarks[taskId];
        }

        if (taskImages[taskId]?.uploadedUrl) {
          updates.image_url = taskImages[taskId].uploadedUrl;
        }

        if (!updates.status && !updates.remarks && !updates.image_url) {
          updates.status = "Done";
          updates.actual_date = new Date().toISOString();
        }

        return updateTaskMutation.mutateAsync({ id: taskId, updates });
      });

      await Promise.all(promises);

      setSelectedTasks(new Set());
      setTaskRemarks({});
      setTaskStatuses({});
      setTaskImages({});
      toast.success("Maintenance tasks updated successfully");
    } catch (error) {
      console.error("Submit failed", error);
      toast.error("Failed to update tasks");
    }
  };

  const getFrequencyBadge = (frequency: string | undefined) => {
    const freq = frequency?.toLowerCase() || "one-time";
    const colors: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      weekly:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      monthly:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      "one-time":
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[freq] || colors["one-time"];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initialTab === "pending"
              ? "Pending Maintenance"
              : initialTab === "history"
                ? "Maintenance History"
                : "Maintenance"}
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {initialTab === "pending"
              ? "Manage pending maintenance tasks"
              : "View maintenance history"}
          </p>
        </div>
        <button
          onClick={() => refetchMaintenance()}
          disabled={maintenanceLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${maintenanceLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {showTabs && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "pending"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
            >
              History
            </button>
          </div>
        )}

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search maintenance..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Machine Filter Dropdown */}
        <div className="relative" ref={machineDropdownRef}>
          <button
            onClick={() => setShowMachineDropdown(!showMachineDropdown)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              selectedMachines.length > 0
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                : "bg-white border-gray-200 text-gray-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            }`}
          >
            <Filter className="w-4 h-4" />
            Machines{" "}
            {selectedMachines.length > 0 && `(${selectedMachines.length})`}
          </button>

          {showMachineDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-gray-100 dark:border-neutral-700 z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900/50 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Filter by Machine
                </span>
                {selectedMachines.length > 0 && (
                  <button
                    onClick={() => setSelectedMachines([])}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {machinesList.map((machine) => (
                  <label
                    key={machine}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700/50 cursor-pointer group transition-colors"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                        checked={selectedMachines.includes(machine)}
                        onChange={() => handleMachineSelection(machine)}
                      />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {machine}
                    </span>
                  </label>
                ))}
                {machinesList.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No machines found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === "pending" && filteredMaintenanceData.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={selectAllTasks}
              className="text-xs text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={markAllDone}
              className="text-xs text-green-600 hover:underline font-medium"
            >
              All Done
            </button>
            <button
              onClick={deselectAllTasks}
              className="text-xs text-muted-foreground hover:underline"
            >
              Clear
            </button>
            {selectedTasks.size > 0 && (
              <button
                onClick={handleSubmit}
                disabled={false} // Add loading state if needed
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Submit ({selectedTasks.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700">
        {maintenanceLoading && filteredMaintenanceData.length === 0 ? (
          <div className="p-4 space-y-3">
            {/* Skeleton Loading */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-12" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded flex-1" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-20" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-16" />
              </div>
            ))}
          </div>
        ) : filteredMaintenanceData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>No {activeTab} maintenance tasks found</p>
          </div>
        ) : (
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 320px)" }}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-10">
                    Seq
                  </th>
                  {activeTab === "pending" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedTasks.size === paginatedTasks.length &&
                          paginatedTasks.length > 0
                        }
                        onChange={
                          selectedTasks.size === paginatedTasks.length
                            ? deselectAllTasks
                            : selectAllTasks
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Machine
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase min-w-50">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Freq
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Assigned To
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    Start Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    {activeTab === "pending"
                      ? "End/Due Date"
                      : "Completed Date"}
                  </th>
                  {activeTab === "pending" && (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-blue-50 dark:bg-blue-900/20">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Upload
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Remark
                      </th>
                    </>
                  )}
                  {activeTab === "history" && (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Remark
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Attachment
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {paginatedTasks.map((task, index) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-gray-50 dark:hover:bg-neutral-700/50 ${
                      selectedTasks.has(task.id)
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </td>
                    {activeTab === "pending" && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {task.machine_name}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-50">
                      <div
                        className="whitespace-normal wrap-break-word"
                        title={task.task_description}
                      >
                        {task.task_description || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(task.frequency)}`}
                      >
                        {task.frequency || "One-time"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {task.assigned_to || task.doer_name || "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {formatDate(task.task_start_date)}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {activeTab === "pending"
                        ? "—"
                        : formatDate(task.actual_date)}
                    </td>

                    {/* Pending Actions */}
                    {activeTab === "pending" && (
                      <>
                        <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/10">
                          <select
                            disabled={!selectedTasks.has(task.id)}
                            value={taskStatuses[task.id] || ""}
                            onChange={(e) =>
                              updateTaskStatus(task.id, e.target.value)
                            }
                            className="border border-gray-300 dark:border-neutral-600 rounded-md px-2 py-1 w-full disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-xs bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select</option>
                            <option value="Done">Done</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => handleImageUpload(task.id, e)}
                              disabled={taskImages[task.id]?.uploading}
                            />
                            {taskImages[task.id]?.uploading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : taskImages[task.id]?.uploadedUrl ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Upload className="w-4 h-4 text-blue-600 hover:text-blue-700" />
                            )}
                          </label>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={taskRemarks[task.id] || ""}
                            onChange={(e) =>
                              updateTaskRemark(task.id, e.target.value)
                            }
                            placeholder="Remark..."
                            className="w-24 px-2 py-1 text-xs rounded border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </>
                    )}

                    {/* History Actions */}
                    {activeTab === "history" && (
                      <>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.status === "Done"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {task.status || "Done"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground max-w-37.5 truncate">
                          {task.remarks || "—"}
                        </td>
                        <td className="px-3 py-3">
                          {task.image_url ? (
                            <a
                              href={task.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-neutral-700">
            <p className="text-xs text-muted-foreground">
              Showing {showingStart}-{showingEnd} of{" "}
              {filteredMaintenanceData.length} • Page {currentPage} of{" "}
              {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-neutral-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-neutral-700"
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
