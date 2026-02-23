"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useChecklistTasksQuery,
  useDelegationTasksQuery,
  useUsers,
  useDeleteChecklistTasks,
  useUpdateChecklistTask,
  useDeleteDelegationTasks,
  useUpdateDelegationTask,
} from "../server/tanstackQuery/useQuickTask";
import { QuickTaskSkeleton } from "./QuickTaskSkeleton";
import type { ChecklistTask, DelegationTask } from "../types/types";

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

  // Checklist State
  const [selectedTasks, setSelectedTasks] = useState<ChecklistTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ChecklistTask>>({});

  // Delegation State
  const [selectedDelegationTasks, setSelectedDelegationTasks] = useState<
    DelegationTask[]
  >([]);
  const [delegationEditingId, setDelegationEditingId] = useState<number | null>(
    null,
  );
  const [delegationEditFormData, setDelegationEditFormData] = useState<
    Partial<DelegationTask>
  >({});

  // Delete Confirmation State
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<
    ChecklistTask | DelegationTask | null
  >(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);

  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "";
  });

  // Pagination State
  const [checklistPage, setChecklistPage] = useState(0);
  const [delegationPage, setDelegationPage] = useState(0);
  const pageSize = 50;

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // TanStack Query hooks (Paginated)
  const { data: checklistResponse, isLoading: checklistLoading } =
    useChecklistTasksQuery(checklistPage, pageSize, nameFilter);

  const { data: delegationResponse, isLoading: delegationLoading } =
    useDelegationTasksQuery(delegationPage, pageSize, nameFilter);

  const { data: usersData } = useUsers();

  // Mutations
  const deleteChecklistMutation = useDeleteChecklistTasks();
  const updateChecklistMutation = useUpdateChecklistTask();
  const deleteDelegationMutation = useDeleteDelegationTasks();
  const updateDelegationMutation = useUpdateDelegationTask();

  // Data
  const checklistTasks = checklistResponse?.data || [];
  const checklistTotal = checklistResponse?.total || 0;

  const delegationTasks = delegationResponse?.data || [];
  const delegationTotal = delegationResponse?.total || 0;

  const allNames = usersData?.map((u) => u.user_name) || [];

  // Re-sync if localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setUserRole(localStorage.getItem("role") || "");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const filteredChecklistTasks = useMemo(() => {
    // Unique by task_id (safety check on current page)
    const unique = Array.from(
      new Map(checklistTasks.map((t) => [t.task_id, t])).values(),
    );

    let filtered = unique;
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
    // Unique by task_id (safety check on current page)
    const unique = Array.from(
      new Map(delegationTasks.map((t) => [t.task_id, t])).values(),
    );

    let filtered = unique;
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

  // Pagination helpers
  const currentPage =
    activeTab === "checklist" ? checklistPage : delegationPage;
  const totalCount =
    activeTab === "checklist" ? checklistTotal : delegationTotal;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleNextPage = () => {
    if (activeTab === "checklist") {
      setChecklistPage((p) => Math.min(p + 1, totalPages - 1));
    } else {
      setDelegationPage((p) => Math.min(p + 1, totalPages - 1));
    }
  };

  const handlePrevPage = () => {
    if (activeTab === "checklist") {
      setChecklistPage((p) => Math.max(0, p - 1));
    } else {
      setDelegationPage((p) => Math.max(0, p - 1));
    }
  };

  const allFrequencies = ["daily", "weekly", "monthly", "one-time"];

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
  const handleCheckboxChange = (task: ChecklistTask | DelegationTask) => {
    if (activeTab === "checklist") {
      const cTask = task as ChecklistTask;
      if (selectedTasks.find((t) => t.task_id === cTask.task_id)) {
        setSelectedTasks(
          selectedTasks.filter((t) => t.task_id !== cTask.task_id),
        );
      } else {
        setSelectedTasks([...selectedTasks, cTask]);
      }
    } else {
      const dTask = task as DelegationTask;
      if (selectedDelegationTasks.find((t) => t.task_id === dTask.task_id)) {
        setSelectedDelegationTasks(
          selectedDelegationTasks.filter((t) => t.task_id !== dTask.task_id),
        );
      } else {
        setSelectedDelegationTasks([...selectedDelegationTasks, dTask]);
      }
    }
  };

  const handleSelectAll = () => {
    if (activeTab === "checklist") {
      if (selectedTasks.length === filteredChecklistTasks.length) {
        setSelectedTasks([]);
      } else {
        setSelectedTasks([...filteredChecklistTasks]);
      }
    } else {
      if (selectedDelegationTasks.length === filteredDelegationTasks.length) {
        setSelectedDelegationTasks([]);
      } else {
        setSelectedDelegationTasks([...filteredDelegationTasks]);
      }
    }
  };

  // Delete handlers
  const confirmDeleteTask = (task: ChecklistTask | DelegationTask) => {
    setDeleteConfirmTask(task);
  };

  const confirmBulkDelete = () => {
    if (activeTab === "checklist" && selectedTasks.length === 0) return;
    if (activeTab === "delegation" && selectedDelegationTasks.length === 0)
      return;
    setIsBulkDeleteConfirm(true);
  };

  const executeDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    try {
      if (activeTab === "checklist") {
        await deleteChecklistMutation.mutateAsync([
          deleteConfirmTask as ChecklistTask,
        ]);
      } else {
        await deleteDelegationMutation.mutateAsync([
          deleteConfirmTask as DelegationTask,
        ]);
      }
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  const executeBulkDelete = async () => {
    try {
      if (activeTab === "checklist") {
        if (selectedTasks.length === 0) return;
        await deleteChecklistMutation.mutateAsync(selectedTasks);
        setSelectedTasks([]);
        toast.success(`Deleted ${selectedTasks.length} tasks`);
      } else {
        if (selectedDelegationTasks.length === 0) return;
        await deleteDelegationMutation.mutateAsync(selectedDelegationTasks);
        setSelectedDelegationTasks([]);
        toast.success(`Deleted ${selectedDelegationTasks.length} tasks`);
      }
    } catch {
      toast.error("Failed to delete tasks");
    } finally {
      setIsBulkDeleteConfirm(false);
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

  // Delegation edit handlers
  const handleDelegationEditClick = (task: DelegationTask) => {
    setDelegationEditingId(task.task_id);
    setDelegationEditFormData({ ...task });
  };

  const handleDelegationCancelEdit = () => {
    setDelegationEditingId(null);
    setDelegationEditFormData({});
  };

  const handleDelegationFieldChange = (
    field: keyof DelegationTask,
    value: string,
  ) => {
    setDelegationEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelegationSaveEdit = async () => {
    if (!delegationEditingId) return;

    const originalTask = delegationTasks.find(
      (t) => t.task_id === delegationEditingId,
    );
    if (!originalTask) return;

    try {
      await updateDelegationMutation.mutateAsync({
        updatedTask: {
          department: delegationEditFormData.department || undefined,
          given_by: delegationEditFormData.given_by || undefined,
          name: delegationEditFormData.name || undefined,
          task_description:
            delegationEditFormData.task_description || undefined,
          frequency: delegationEditFormData.frequency || undefined,
          enable_reminder:
            (delegationEditFormData.enable_reminder as
              | "yes"
              | "no"
              | undefined) || undefined,
          require_attachment:
            delegationEditFormData.require_attachment || undefined,
          task_start_date: delegationEditFormData.task_start_date || undefined,
          planned_date: delegationEditFormData.planned_date || undefined,
        },
        originalTask: {
          department: originalTask.department || null,
          name: originalTask.name || null,
          task_description: originalTask.task_description || null,
        },
      });
      toast.success("Delegation task updated");
      setDelegationEditingId(null);
      setDelegationEditFormData({});
    } catch {
      toast.error("Failed to update delegation task");
    }
  };

  // Filter handlers
  const handleNameFilterSelect = (name: string) => {
    setNameFilter(name);
    setDropdownOpen({ ...dropdownOpen, name: false });
    // Reset page to 0 when filter changes
    setChecklistPage(0);
    setDelegationPage(0);
  };

  const clearNameFilter = () => {
    setNameFilter("");
    setDropdownOpen({ ...dropdownOpen, name: false });
    setChecklistPage(0);
    setDelegationPage(0);
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

  // Row styling
  const getRowClassName = (task: ChecklistTask | any) => {
    const isSelected = selectedTasks.find((t) => t.task_id === task.task_id);
    if (isSelected)
      return "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30";

    if (activeTab === "delegation") {
      const dTask = task;
      // Completed
      if (dTask.status?.toLowerCase() === "done" || dTask.submission_date) {
        return "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30";
      }
      // Extended ("brown" -> amber/orange)
      if (dTask.status?.toLowerCase() === "extend") {
        return "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30";
      }
      // Overdue
      if (dTask.planned_date) {
        const planDate = new Date(dTask.planned_date);
        const now = new Date();
        if (planDate < now) {
          return "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30";
        }
      }
    }
    return "hover:bg-gray-50 dark:hover:bg-neutral-700/50";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your daily checklist and delegated tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => {
              setActiveTab("checklist");
              setChecklistPage(0);
              setSelectedTasks([]);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "checklist"
                ? "bg-white dark:bg-neutral-700 text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Checklist
          </button>
          <button
            onClick={() => {
              setActiveTab("delegation");
              setDelegationPage(0);
              setSelectedTasks([]);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "delegation"
                ? "bg-white dark:bg-neutral-700 text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Delegation
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              <Filter className="w-4 h-4" />
              <span className="max-w-25 truncate">
                {nameFilter || "All Users"}
              </span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            {dropdownOpen.name && (
              <div className="absolute z-50 mt-1 w-48 max-h-60 overflow-auto bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 p-1">
                <button
                  onClick={clearNameFilter}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded text-gray-700 dark:text-gray-200"
                >
                  All Users
                </button>
                {allNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleNameFilterSelect(name)}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded text-gray-700 dark:text-gray-200"
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
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              <Filter className="w-4 h-4" />
              <span>{freqFilter || "All Freq"}</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            {dropdownOpen.frequency && (
              <div className="absolute z-50 mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 p-1">
                <button
                  onClick={() => {
                    setFreqFilter("");
                    setDropdownOpen({ ...dropdownOpen, frequency: false });
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded text-gray-700 dark:text-gray-200"
                >
                  All Frequencies
                </button>
                {allFrequencies.map((freq) => (
                  <button
                    key={freq}
                    onClick={() => {
                      setFreqFilter(freq);
                      setDropdownOpen({ ...dropdownOpen, frequency: false });
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded text-gray-700 dark:text-gray-200"
                  >
                    {freq}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Delete */}
          {(selectedTasks.length > 0 || selectedDelegationTasks.length > 0) &&
            userRole === "admin" && (
              <button
                onClick={confirmBulkDelete}
                disabled={
                  activeTab === "checklist"
                    ? deleteChecklistMutation.isPending
                    : deleteDelegationMutation.isPending
                }
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors ml-auto"
              >
                {(
                  activeTab === "checklist"
                    ? deleteChecklistMutation.isPending
                    : deleteDelegationMutation.isPending
                ) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete (
                {activeTab === "checklist"
                  ? selectedTasks.length
                  : selectedDelegationTasks.length}
                )
              </button>
            )}
        </div>
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
                  {userRole === "admin" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-10">
                      <input
                        type="checkbox"
                        checked={
                          activeTab === "checklist"
                            ? selectedTasks.length ===
                                filteredChecklistTasks.length &&
                              filteredChecklistTasks.length > 0
                            : selectedDelegationTasks.length ===
                                filteredDelegationTasks.length &&
                              filteredDelegationTasks.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                  )}
                  <th className="px-3  py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Task ID
                  </th>
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
                  {activeTab === "delegation" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                      Edit
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {tasks.map((task, index) => {
                  const isDelegationEditing =
                    activeTab === "delegation" &&
                    delegationEditingId === task.task_id;
                  const isChecklistEditing =
                    activeTab === "checklist" && editingTaskId === task.task_id;

                  return (
                    <tr
                      key={task.task_id || index}
                      className={getRowClassName(task)}
                    >
                      {userRole === "admin" && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={
                              activeTab === "checklist"
                                ? !!selectedTasks.find(
                                    (t) => t.task_id === task.task_id,
                                  )
                                : !!selectedDelegationTasks.find(
                                    (t) => t.task_id === task.task_id,
                                  )
                            }
                            onChange={() => handleCheckboxChange(task)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                        </td>
                      )}
                      {/* TASK ID */}
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                        #{task.task_id}
                      </td>
                      {/* DEPARTMENT */}
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {isChecklistEditing ? (
                          <input
                            type="text"
                            value={editFormData.department || ""}
                            onChange={(e) =>
                              handleInputChange("department", e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isDelegationEditing ? (
                          <input
                            type="text"
                            value={delegationEditFormData.department || ""}
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "department",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          task.department || "—"
                        )}
                      </td>
                      {/* GIVEN BY */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isChecklistEditing ? (
                          <input
                            type="text"
                            value={editFormData.given_by || ""}
                            onChange={(e) =>
                              handleInputChange("given_by", e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isDelegationEditing ? (
                          <input
                            type="text"
                            value={delegationEditFormData.given_by || ""}
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "given_by",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          task.given_by || "—"
                        )}
                      </td>
                      {/* NAME (Assign To) */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isChecklistEditing ? (
                          <input
                            type="text"
                            value={editFormData.name || ""}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isDelegationEditing ? (
                          <input
                            type="text"
                            value={delegationEditFormData.name || ""}
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "name",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          task.name || "—"
                        )}
                      </td>
                      {/* TASK DESCRIPTION */}
                      <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-50 max-w-75">
                        {isChecklistEditing ? (
                          <textarea
                            value={editFormData.task_description || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "task_description",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                            rows={2}
                          />
                        ) : isDelegationEditing ? (
                          <textarea
                            value={
                              delegationEditFormData.task_description || ""
                            }
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "task_description",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                            rows={2}
                          />
                        ) : (
                          <div className="whitespace-normal wrap-break-word line-clamp-2">
                            {task.task_description || "—"}
                          </div>
                        )}
                      </td>
                      {/* START DATE */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                        {isDelegationEditing ? (
                          <input
                            type="date"
                            value={
                              delegationEditFormData.task_start_date
                                ? new Date(
                                    delegationEditFormData.task_start_date,
                                  )
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "task_start_date",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          formatDate(task.task_start_date)
                        )}
                      </td>
                      {/* END DATE (planned_date for delegation, submission_date for checklist) */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                        {isDelegationEditing ? (
                          <input
                            type="date"
                            value={
                              delegationEditFormData.planned_date
                                ? new Date(delegationEditFormData.planned_date)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "planned_date",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          formatDate(task.submission_date)
                        )}
                      </td>
                      {/* FREQUENCY */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isDelegationEditing ? (
                          <select
                            value={delegationEditFormData.frequency || ""}
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "frequency",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="daily">daily</option>
                            <option value="weekly">weekly</option>
                            <option value="monthly">monthly</option>
                            <option value="one-time">one-time</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(task.frequency || "")}`}
                          >
                            {task.frequency || "—"}
                          </span>
                        )}
                      </td>
                      {/* REMINDERS */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isDelegationEditing ? (
                          <select
                            value={
                              delegationEditFormData.enable_reminder || "no"
                            }
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "enable_reminder",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                          </select>
                        ) : (
                          task.enable_reminder || "—"
                        )}
                      </td>
                      {/* ATTACHMENT */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isChecklistEditing ? (
                          <select
                            value={editFormData.require_attachment || "no"}
                            onChange={(e) =>
                              handleInputChange(
                                "require_attachment",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white border-gray-200 dark:border-neutral-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        ) : isDelegationEditing ? (
                          <select
                            value={
                              delegationEditFormData.require_attachment || "no"
                            }
                            onChange={(e) =>
                              handleDelegationFieldChange(
                                "require_attachment",
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                          </select>
                        ) : (
                          task.require_attachment || "—"
                        )}
                      </td>
                      {/* ACTIONS */}
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          {isChecklistEditing || isDelegationEditing ? (
                            <>
                              <button
                                onClick={
                                  activeTab === "checklist"
                                    ? handleSaveEdit
                                    : handleDelegationSaveEdit
                                }
                                disabled={
                                  activeTab === "checklist"
                                    ? updateChecklistMutation.isPending
                                    : updateDelegationMutation.isPending
                                }
                                className="p-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {(
                                  activeTab === "checklist"
                                    ? updateChecklistMutation.isPending
                                    : updateDelegationMutation.isPending
                                ) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={
                                  activeTab === "checklist"
                                    ? handleCancelEdit
                                    : handleDelegationCancelEdit
                                }
                                className="p-1 rounded bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  activeTab === "checklist"
                                    ? handleEditClick(task as ChecklistTask)
                                    : handleDelegationEditClick(
                                        task as DelegationTask,
                                      )
                                }
                                className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              {userRole === "admin" && (
                                <button
                                  onClick={() => confirmDeleteTask(task)}
                                  disabled={
                                    activeTab === "checklist"
                                      ? deleteChecklistMutation.isPending
                                      : deleteDelegationMutation.isPending
                                  }
                                  className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalCount > 0 && !isLoading && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages || 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {(deleteConfirmTask || isBulkDeleteConfirm) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Deletion
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {isBulkDeleteConfirm
                ? `Are you sure you want to delete ${
                    activeTab === "checklist"
                      ? selectedTasks.length
                      : selectedDelegationTasks.length
                  } selected tasks? This action cannot be undone.`
                : `Are you sure you want to delete this task? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmTask(null);
                  setIsBulkDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={
                  isBulkDeleteConfirm ? executeBulkDelete : executeDeleteTask
                }
                disabled={
                  activeTab === "checklist"
                    ? deleteChecklistMutation.isPending
                    : deleteDelegationMutation.isPending
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
              >
                {(activeTab === "checklist"
                  ? deleteChecklistMutation.isPending
                  : deleteDelegationMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
