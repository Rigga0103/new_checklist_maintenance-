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
  Users,
  User,
  Download,
} from "lucide-react";
import { useMaintenanceDashboard } from "../hooks/useMaintenanceDashboard";
import { toast } from "sonner";
import { formatDate } from "../hooks/useMaintenanceDashboard";

const ITEMS_PER_PAGE = 50;

interface MaintenanceListProps {
  initialTab?: "pending" | "history" | "last7days" | "overdue";
  showTabs?: boolean;
}

export default function MaintenanceList({
  initialTab = "pending",
  showTabs = true,
}: MaintenanceListProps) {
  // Read role and username from localStorage (same as MainChecklist)
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [viewMyTasksOnly, setViewMyTasksOnly] = useState(false);

  useEffect(() => {
    setRole(localStorage.getItem("role") || "user");
    setUsername(localStorage.getItem("user-name") || null);
  }, []);

  // When admin toggles "My Tasks", override role to "user" so API filters by their username
  const effectiveRole = role === "admin" && viewMyTasksOnly ? "user" : role;
  const isAdmin = role === "admin";

  const {
    maintenanceLoading,
    maintenanceError,
    refetchMaintenance,
    filteredMaintenanceData,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
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
  } = useMaintenanceDashboard({ role: effectiveRole, username });

  // Set initial tab on mount if provided
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, setActiveTab]);

  const exportToExcel = () => {
    if (filteredMaintenanceData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csvRows = [];

    if (activeTab === "pending") {
      const headers = [
        "Task ID",
        "Machine Name",
        "Task Description",
        "Assigned To",
        "Frequency",
        "Planned Date",
        "Department",
      ];
      csvRows.push(headers.join(","));

      filteredMaintenanceData.forEach((task) => {
        const row = [
          task.task_id,
          `"${task.machine_name || ""}"`,
          `"${task.task_description || ""}"`,
          `"${task.doer_name || ""}"`,
          `"${task.frequency || ""}"`,
          task.task_start_date ? formatDate(task.task_start_date) : "",
          `"${task.department || ""}"`,
        ];
        csvRows.push(row.join(","));
      });
    } else if (activeTab === "history") {
      const headers = [
        "Task ID",
        "Machine Name",
        "Task Description",
        "Assigned To",
        "Frequency",
        "Planned Date",
        "Completed Date",
        "Delay",
        "Status",
        "Remarks",
        "Maintenance Cost",
      ];
      csvRows.push(headers.join(","));

      filteredMaintenanceData.forEach((task) => {
        const row = [
          task.task_id,
          `"${task.machine_name || ""}"`,
          `"${task.task_description || ""}"`,
          `"${task.doer_name || ""}"`,
          `"${task.frequency || ""}"`,
          task.task_start_date ? formatDate(task.task_start_date) : "",
          task.actual_date ? formatDate(task.actual_date) : "",
          `"${task.delay || ""}"`,
          `"${task.status || ""}"`,
          `"${(task.remarks || "").replace(/"/g, '""')}"`,
          task.maintenance_cost || "",
        ];
        csvRows.push(row.join(","));
      });
    } else if (activeTab === "last7days") {
      const headers = [
        "Task ID",
        "Machine Name",
        "Task Description",
        "Assigned To",
        "Frequency",
        "Planned Date",
        "Completed Date",
        "Status",
        "Remarks",
      ];
      csvRows.push(headers.join(","));

      filteredMaintenanceData.forEach((task) => {
        const today = new Date();
        const statusVal = task.actual_date
          ? "Completed"
          : task.task_start_date && new Date(task.task_start_date) < today
            ? "Overdue"
            : "Pending";
        const row = [
          task.task_id,
          `"${task.machine_name || ""}"`,
          `"${task.task_description || ""}"`,
          `"${task.doer_name || ""}"`,
          `"${task.frequency || ""}"`,
          task.task_start_date ? formatDate(task.task_start_date) : "",
          task.actual_date ? formatDate(task.actual_date) : "",
          statusVal,
          `"${(task.remarks || "").replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(","));
      });
    } else if (activeTab === "overdue") {
      const headers = [
        "Task ID",
        "Machine Name",
        "Task Description",
        "Assigned To",
        "Frequency",
        "Planned Date",
        "Department",
      ];
      csvRows.push(headers.join(","));

      filteredMaintenanceData.forEach((task) => {
        const row = [
          task.task_id,
          `"${task.machine_name || ""}"`,
          `"${task.task_description || ""}"`,
          `"${task.doer_name || ""}"`,
          `"${task.frequency || ""}"`,
          task.task_start_date ? formatDate(task.task_start_date) : "",
          `"${task.department || ""}"`,
        ];
        csvRows.push(row.join(","));
      });
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `maintenance_${activeTab}_export_${dateStr}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported successfully");
  };

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
    const allIds = paginatedTasks.map((t) => t.task_id);
    setSelectedTasks(new Set(allIds));
  };

  const deselectAllTasks = () => {
    setSelectedTasks(new Set());
  };

  const markAllDone = () => {
    const allIds = paginatedTasks.map((t) => t.task_id);
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

    const missingImages = Array.from(selectedTasks).some((taskId) => {
      const task = filteredMaintenanceData.find((t) => t.task_id === taskId);
      return (
        task?.require_attachment?.toLowerCase() === "yes" &&
        !taskImages[taskId]?.uploadedUrl
      );
    });

    if (missingImages) {
      toast.error("Please upload photo first for tasks requiring an image");
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
            {viewMyTasksOnly && username
              ? `Showing your tasks only (${username})`
              : activeTab === "pending"
                ? "Manage pending maintenance tasks"
                : activeTab === "last7days"
                  ? "All tasks from Monday to Saturday"
                  : "View maintenance history"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* My Tasks / All Tasks Toggle - only for admin */}
          {isAdmin && (
            <div className="flex p-1 bg-gray-100 dark:bg-neutral-700 rounded-lg">
              <button
                onClick={() => setViewMyTasksOnly(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  !viewMyTasksOnly
                    ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                All Tasks
              </button>
              <button
                onClick={() => setViewMyTasksOnly(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMyTasksOnly
                    ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                My Tasks
              </button>
            </div>
          )}
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
            <button
              onClick={() => setActiveTab("last7days")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "last7days"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setActiveTab("overdue")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "overdue"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
            >
              All Overdue
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

        {/* Date Filter & Export */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            title="From Date"
          />
          <span className="text-gray-500 dark:text-gray-400 text-sm">-</span>
          <input
            type="date"
            value={endDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            title="To Date"
          />
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
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

        {(activeTab === "pending" || activeTab === "overdue") &&
          filteredMaintenanceData.length > 0 && (
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
                  {(activeTab === "pending" || activeTab === "overdue") && (
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
                    {activeTab === "pending" || activeTab === "overdue"
                      ? "End/Due Date"
                      : "Completed Date"}
                  </th>
                  {(activeTab === "pending" || activeTab === "overdue") && (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-blue-50 dark:bg-blue-900/20">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Reminders
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Attachment
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
                  {activeTab === "last7days" && (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Remark
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {paginatedTasks.map((task, index) => (
                  <tr
                    key={task.task_id}
                    className={`hover:bg-gray-50 dark:hover:bg-neutral-700/50 ${
                      selectedTasks.has(task.task_id)
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </td>
                    {(activeTab === "pending" || activeTab === "overdue") && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.task_id)}
                          onChange={() => toggleTaskSelection(task.task_id)}
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
                      {activeTab === "pending" || activeTab === "overdue"
                        ? "—"
                        : formatDate(task.actual_date)}
                    </td>

                    {/* Pending Actions */}
                    {(activeTab === "pending" || activeTab === "overdue") && (
                      <>
                        <td className="px-3 py-3 whitespace-nowrap bg-blue-50 dark:bg-blue-900/10">
                          <select
                            disabled={!selectedTasks.has(task.task_id)}
                            value={taskStatuses[task.task_id] || "Select"}
                            onChange={(e) =>
                              updateTaskStatus(task.task_id, e.target.value)
                            }
                            className="min-w-32 border border-gray-300 dark:border-neutral-600 rounded-md px-2 py-1 w-full disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-xs bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                          >
                            <option value="Select">Select</option>
                            <option value="Done">Done</option>
                            <option value="Hold">Hold</option>
                            <option value="Machine Breakdown">
                              Machine Breakdown
                            </option>
                            <option value="Not Plan">Not Plan</option>
                            <option value="Cancel">Cancel</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {task.enable_reminder?.toLowerCase() === "yes" ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {task.require_attachment?.toLowerCase() === "yes" ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {task.require_attachment?.toLowerCase() === "yes" ? (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageUpload(task.task_id, e)
                                }
                                disabled={taskImages[task.task_id]?.uploading}
                              />
                              {taskImages[task.task_id]?.uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : taskImages[task.task_id]?.uploadedUrl ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Upload className="w-4 h-4 text-blue-600 hover:text-blue-700" />
                              )}
                            </label>
                          ) : (
                            <span className="text-gray-400 dark:text-neutral-500 text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={taskRemarks[task.task_id] || ""}
                            onChange={(e) =>
                              updateTaskRemark(task.task_id, e.target.value)
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

                    {/* Last 7 Days columns */}
                    {activeTab === "last7days" && (
                      <>
                        <td className="px-3 py-3">
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
                        <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground max-w-37.5 truncate">
                          {task.remarks || "—"}
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
