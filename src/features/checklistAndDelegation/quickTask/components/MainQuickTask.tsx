"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  ChevronDown,
  Filter,
  Trash2,
  Edit,
  Save,
  X,
  RefreshCw,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  useChecklistTasks,
  useDelegationTasks,
  useUsers,
  useDeleteChecklistTasks,
  useUpdateChecklistTask,
  flattenChecklistPages,
  flattenDelegationPages,
} from "../server/tanstackQuery/useQuickTask";
import { QuickTaskSkeleton } from "./QuickTaskSkeleton";
import type { ChecklistTask } from "../types/types";

export default function MainQuickTask() {
  const [activeTab, setActiveTab] = useState<"checklist" | "delegation">(
    "checklist",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [freqFilter, setFreqFilter] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState({
    name: false,
    frequency: false,
  });
  const [selectedTasks, setSelectedTasks] = useState<ChecklistTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ChecklistTask>>({});
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "";
  });
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // TanStack Query hooks
  const {
    data: checklistData,
    isLoading: checklistLoading,
    fetchNextPage: fetchNextChecklist,
    hasNextPage: hasMoreChecklist,
    isFetchingNextPage: isFetchingMoreChecklist,
  } = useChecklistTasks(nameFilter);
  const { data: delegationData, isLoading: delegationLoading } =
    useDelegationTasks(nameFilter);
  const { data: usersData } = useUsers();
  const deleteChecklistMutation = useDeleteChecklistTasks();
  const updateChecklistMutation = useUpdateChecklistTask();

  // Flatten pages
  const checklistTasks = flattenChecklistPages(checklistData);
  const delegationTasks = flattenDelegationPages(delegationData);
  const allNames = usersData?.map((u) => u.user_name) || [];

  // Re-sync if localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setUserRole(localStorage.getItem("role") || "");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Filter tasks
  const filteredChecklistTasks = useMemo(() => {
    let filtered = checklistTasks;
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.task_description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (freqFilter) {
      filtered = filtered.filter((t) => t.frequency === freqFilter);
    }
    return filtered;
  }, [checklistTasks, searchTerm, freqFilter]);

  const filteredDelegationTasks = useMemo(() => {
    let filtered = delegationTasks;
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.task_description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (freqFilter) {
      filtered = filtered.filter((t) => t.frequency === freqFilter);
    }
    return filtered;
  }, [delegationTasks, searchTerm, freqFilter]);

  const tasks =
    activeTab === "checklist"
      ? filteredChecklistTasks
      : filteredDelegationTasks;
  const isLoading =
    activeTab === "checklist" ? checklistLoading : delegationLoading;
  const allFrequencies = [
    ...new Set(checklistTasks.map((t) => t.frequency).filter(Boolean)),
  ];

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || isFetchingMoreChecklist) return;
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    if (
      scrollHeight - scrollTop - clientHeight < 100 &&
      activeTab === "checklist" &&
      hasMoreChecklist
    ) {
      fetchNextChecklist();
    }
  }, [
    isFetchingMoreChecklist,
    activeTab,
    hasMoreChecklist,
    fetchNextChecklist,
  ]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  // Checkbox handlers
  const handleCheckboxChange = (task: ChecklistTask) => {
    if (selectedTasks.find((t) => t.task_id === task.task_id)) {
      setSelectedTasks(selectedTasks.filter((t) => t.task_id !== task.task_id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === filteredChecklistTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks([...filteredChecklistTasks]);
    }
  };

  // Delete handlers
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;
    try {
      await deleteChecklistMutation.mutateAsync(selectedTasks);
      setSelectedTasks([]);
      toast.success(`Deleted ${selectedTasks.length} tasks`);
    } catch {
      toast.error("Failed to delete tasks");
    }
  };

  const handleDeleteTask = async (task: ChecklistTask) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteChecklistMutation.mutateAsync([task]);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  // Edit handlers
  const handleEditClick = (task: ChecklistTask) => {
    setEditingTaskId(task.task_id);
    setEditFormData({ ...task });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!editFormData.task_id) return;
    const originalTask = checklistTasks.find(
      (t) => t.task_id === editFormData.task_id,
    );
    if (!originalTask) return;

    try {
      await updateChecklistMutation.mutateAsync({
        updatedTask: {
          department: editFormData.department || undefined,
          given_by: editFormData.given_by || undefined,
          name: editFormData.name || undefined,
          task_description: editFormData.task_description || undefined,
          enable_reminder:
            (editFormData.enable_reminder as "yes" | "no" | undefined) ||
            undefined,
          require_attachment:
            (editFormData.require_attachment as "yes" | "no" | undefined) ||
            undefined,
          remark: editFormData.remark || undefined,
        },
        originalTask: {
          department: originalTask.department || "",
          name: originalTask.name || "",
          task_description: originalTask.task_description || "",
        },
      });
      setEditingTaskId(null);
      setEditFormData({});
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleInputChange = (field: keyof ChecklistTask, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Filter handlers
  const handleNameFilterSelect = (name: string) => {
    setNameFilter(name);
    setDropdownOpen({ ...dropdownOpen, name: false });
  };

  const clearNameFilter = () => {
    setNameFilter("");
    setDropdownOpen({ ...dropdownOpen, name: false });
  };

  // Frequency badge
  const getFrequencyBadge = (freq: string) => {
    const colors: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      weekly:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      monthly: "bg-muted text-foreground dark:bg-muted dark:text-foreground",
    };
    return (
      colors[freq?.toLowerCase()] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Task Management
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Showing all unique tasks ({tasks.length})
          </p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "checklist" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"}`}
          >
            Checklist
          </button>
          <button
            onClick={() => setActiveTab("delegation")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "delegation" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"}`}
          >
            Delegation
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Name Filter */}
        <div className="relative">
          <button
            onClick={() =>
              setDropdownOpen({ ...dropdownOpen, name: !dropdownOpen.name })
            }
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
          >
            {nameFilter || "Filter by Name"}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${dropdownOpen.name ? "rotate-180" : ""}`}
            />
          </button>
          {dropdownOpen.name && (
            <div className="absolute z-50 mt-1 w-48 max-h-60 overflow-auto rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700">
              <button
                onClick={clearNameFilter}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
              >
                All Names
              </button>
              {allNames.map((name) => (
                <button
                  key={name}
                  onClick={() => handleNameFilterSelect(name)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Frequency Filter */}
        <div className="relative">
          <button
            onClick={() =>
              setDropdownOpen({
                ...dropdownOpen,
                frequency: !dropdownOpen.frequency,
              })
            }
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
          >
            <Filter className="w-4 h-4" />
            {freqFilter || "Frequency"}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${dropdownOpen.frequency ? "rotate-180" : ""}`}
            />
          </button>
          {dropdownOpen.frequency && (
            <div className="absolute z-50 mt-1 w-40 rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => {
                  setFreqFilter("");
                  setDropdownOpen({ ...dropdownOpen, frequency: false });
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
              >
                All
              </button>
              {allFrequencies.map((freq) => (
                <button
                  key={freq}
                  onClick={() => {
                    setFreqFilter(freq || "");
                    setDropdownOpen({ ...dropdownOpen, frequency: false });
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  {freq}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete button (admin only) */}
        {userRole === "admin" &&
          selectedTasks.length > 0 &&
          activeTab === "checklist" && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleteChecklistMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              {deleteChecklistMutation.isPending
                ? "Deleting..."
                : `Delete (${selectedTasks.length})`}
            </button>
          )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <QuickTaskSkeleton />
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>No tasks found</p>
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                <tr>
                  {userRole === "admin" && activeTab === "checklist" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedTasks.length ===
                            filteredChecklistTasks.length &&
                          filteredChecklistTasks.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Department
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Given By
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase min-w-48">
                    Task Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    Start Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    End Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Frequency
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Reminders
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Attachment
                  </th>
                  {activeTab === "checklist" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {tasks.map((task, index) => (
                  <tr
                    key={task.task_id || index}
                    className={`hover:bg-gray-50 dark:hover:bg-neutral-700/50 ${selectedTasks.find((t) => t.task_id === task.task_id) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  >
                    {userRole === "admin" && activeTab === "checklist" && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            !!selectedTasks.find(
                              (t) => t.task_id === task.task_id,
                            )
                          }
                          onChange={() =>
                            handleCheckboxChange(task as ChecklistTask)
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {editingTaskId === task.task_id ? (
                        <input
                          type="text"
                          value={editFormData.department || ""}
                          onChange={(e) =>
                            handleInputChange("department", e.target.value)
                          }
                          className="w-full px-2 py-1 text-xs border rounded"
                        />
                      ) : (
                        task.department || "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {editingTaskId === task.task_id ? (
                        <input
                          type="text"
                          value={editFormData.given_by || ""}
                          onChange={(e) =>
                            handleInputChange("given_by", e.target.value)
                          }
                          className="w-full px-2 py-1 text-xs border rounded"
                        />
                      ) : (
                        task.given_by || "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {editingTaskId === task.task_id ? (
                        <input
                          type="text"
                          value={editFormData.name || ""}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          className="w-full px-2 py-1 text-xs border rounded"
                        />
                      ) : (
                        task.name || "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-[200px] max-w-[300px]">
                      {editingTaskId === task.task_id ? (
                        <textarea
                          value={editFormData.task_description || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "task_description",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 text-xs border rounded"
                          rows={2}
                        />
                      ) : (
                        <div className="whitespace-normal break-words line-clamp-2">
                          {task.task_description || "—"}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {formatDate(task.task_start_date)}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {formatDate(task.submission_date)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(task.frequency || "")}`}
                      >
                        {task.frequency || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {task.enable_reminder || "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {task.require_attachment || "—"}
                    </td>
                    {activeTab === "checklist" && (
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          {editingTaskId === task.task_id ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                disabled={updateChecklistMutation.isPending}
                                className="p-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {updateChecklistMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 rounded bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleEditClick(task as ChecklistTask)
                                }
                                className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              {userRole === "admin" && (
                                <button
                                  onClick={() =>
                                    handleDeleteTask(task as ChecklistTask)
                                  }
                                  disabled={deleteChecklistMutation.isPending}
                                  className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isFetchingMoreChecklist && (
              <div className="flex justify-center py-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
