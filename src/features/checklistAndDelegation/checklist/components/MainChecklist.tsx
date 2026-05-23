"use client";

import { useState, useEffect, useMemo, useRef } from "react";

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
  Users,
  User,
  ChevronDown,
  Calendar,
  Download,
  Trash2,
} from "lucide-react";
// import Image from "next/image";
import {
  useActiveChecklist,
  useChecklistHistory,
  useSubmitChecklist,
  flattenChecklistPages,
  useChecklistLast7Days,
  useChecklistUpcoming7Days,
  useChecklistOverdue,
  useDeleteChecklistRow,
} from "../server/tanstackQuery/useChecklist";
import { useUsers } from "../../quickTask/server/tanstackQuery/useQuickTask";
import { useUploadChecklistImage } from "../server/tanstackQuery/useChecklistUpload";
import { ChecklistSubmissionItem } from "../types/types";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ITEMS_PER_PAGE = 50;

export default function MainChecklist({ initialNameFilter }: { initialNameFilter?: string }) {
  const [activeTab, setActiveTab] = useState<
    "pending" | "history" | "last7days" | "upcoming7days" | "overdue"
  >("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [nameFilter, setNameFilter] = useState(initialNameFilter || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [nameSearchQuery, setNameSearchQuery] = useState("");
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
  const [nextTargetDates, setNextTargetDates] = useState<
    Record<number, string>
  >({});

  // Date range filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  const [frequencyFilter, setFrequencyFilter] = useState("");

  // Read role and username from localStorage for role-based filtering
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
    data: activeData,
    isFetching: isFetchingActive,
    refetch: refetchActive,
  } = useActiveChecklist(searchTerm, effectiveRole, username);

  const {
    data: historyData,
    isFetching: isFetchingHistory,
    refetch: refetchHistory,
  } = useChecklistHistory(
    searchTerm,
    effectiveRole,
    username,
    activeTab === "history" ? startDate : "",
    activeTab === "history" ? endDate : "",
  );

  const {
    data: last7DaysData,
    isFetching: isFetchingLast7Days,
    refetch: refetchLast7Days,
  } = useChecklistLast7Days(searchTerm, effectiveRole, username, nameFilter);

  const {
    data: upcoming7DaysData,
    isFetching: isFetchingUpcoming7Days,
    refetch: refetchUpcoming7Days,
  } = useChecklistUpcoming7Days(
    searchTerm,
    effectiveRole,
    username,
    nameFilter,
  );
  const {
    data: overdueData,
    isFetching: isFetchingOverdue,
    refetch: refetchOverdue,
  } = useChecklistOverdue(searchTerm, effectiveRole, username, nameFilter);

  const { data: usersData } = useUsers();
  const allNames = useMemo(() => {
    if (!usersData) return [];
    const validNames = usersData
      .filter((u) => u.user_name && u.status === "active")
      .map((u) => u.user_name);

    return Array.from(new Set(validNames)).sort();
  }, [usersData]);

  // Triple-click to delete (admin only)
  const [tripleClickTaskId, setTripleClickTaskId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const clickCountsRef = useRef<Record<number, number>>({});
  const clickTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const deleteRowMutation = useDeleteChecklistRow();

  const handleRowClick = (taskId: number) => {
    if (!isAdmin) return;
    if (clickTimersRef.current[taskId]) clearTimeout(clickTimersRef.current[taskId]);
    clickCountsRef.current[taskId] = (clickCountsRef.current[taskId] || 0) + 1;
    if (clickCountsRef.current[taskId] >= 3) {
      clickCountsRef.current[taskId] = 0;
      setTripleClickTaskId(taskId);
      setDeleteConfirmId(taskId);
    } else {
      clickTimersRef.current[taskId] = setTimeout(() => {
        clickCountsRef.current[taskId] = 0;
      }, 600);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteRowMutation.mutateAsync(deleteConfirmId);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleteConfirmId(null);
      setTripleClickTaskId(null);
    }
  };

  const submitMutation = useSubmitChecklist();
  const uploadImageMutation = useUploadChecklistImage();

  const activeTasks = flattenChecklistPages(activeData);
  const historyTasks = historyData?.pages.flatMap((page) => page.data) || [];
  const last7DaysTasks = last7DaysData?.data || [];
  const upcoming7DaysTasks = upcoming7DaysData?.data || [];
  const overdueTasks = overdueData?.data || [];

  const rawTasks =
    activeTab === "pending"
      ? activeTasks
      : activeTab === "history"
        ? historyTasks
        : activeTab === "last7days"
          ? last7DaysTasks
          : activeTab === "overdue"
            ? overdueTasks
            : upcoming7DaysTasks;

  // Apply date-range filter ONLY on history and overdue tabs
  const dateFilteredTasks =
    (startDate || endDate) && (activeTab === "history" || activeTab === "overdue")
      ? rawTasks.filter((t) => {
        const dateStr = t.task_start_date;

        if (!dateStr) return false;
        const d = new Date(dateStr).setHours(0, 0, 0, 0);
        if (
          startDate &&
          d < new Date(startDate).setHours(0, 0, 0, 0)
        )
          return false;
        if (
          endDate &&
          d > new Date(endDate).setHours(23, 59, 59, 999)
        )
          return false;
        return true;
      })
      : rawTasks;

  const tasks = dateFilteredTasks.filter((t) => {
    let keep = true;
    if (nameFilter) {
      if (nameFilter === "Ritu Sahu") {
        if (t.name !== "Ritu Sahu" && t.name !== "Hemlata Verma") keep = false;
      } else {
        if (t.name !== nameFilter) keep = false;
      }
    }
    if (frequencyFilter && t.frequency !== frequencyFilter) keep = false;
    if (activeTab === "last7days" && statusFilter === "pending") {
      if (
        t.status === "yes" ||
        t.status === "Done" ||
        t.status === "no" ||
        t.status === "Extend date"
      ) {
        keep = false;
      } else if (
        t.task_start_date &&
        new Date(t.task_start_date) < new Date(new Date().setHours(0, 0, 0, 0))
      ) {
        // Also exclude tasks that are considered "Overdue"
        keep = false;
      }
    }
    if (activeTab === "last7days" && statusFilter === "done") {
      if (t.status !== "Done") keep = false;
    }
    return keep;
  });

  const isLoading =
    isFetchingActive ||
    isFetchingHistory ||
    isFetchingLast7Days ||
    isFetchingUpcoming7Days ||
    isFetchingOverdue;

  // Pagination
  const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = tasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const showingStart =
    tasks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, tasks.length);

  // Handlers
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    // Reset selections on search
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

  const markAllDone = () => {
    // Select all tasks and set their status to 'yes'
    const allIds = tasks.map((t) => t.task_id);
    setSelectedTasks(new Set(allIds));
    const newStatuses: Record<number, string> = { ...taskStatuses };
    allIds.forEach((id) => {
      newStatuses[id] = "yes";
    });
    setTaskStatuses(newStatuses);
  };

  // Count how many selected tasks have status set to 'yes' (Done)
  const doneCount = Array.from(selectedTasks).filter(
    (taskId) => taskStatuses[taskId] === "yes",
  ).length;

  const updateTaskStatus = (taskId: number, status: string) => {
    setTaskStatuses((prev) => ({ ...prev, [taskId]: status }));
    // Auto-select when interacting
    if (!selectedTasks.has(taskId)) {
      toggleTaskSelection(taskId);
    }
    // Reset next target date if status changes from "Extend date"
    if (status !== "Extend date") {
      setNextTargetDates((prev) => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  };

  const updateNextTargetDate = (taskId: number, date: string) => {
    setNextTargetDates((prev) => ({ ...prev, [taskId]: date }));
    // Auto-select when interacting
    if (!selectedTasks.has(taskId)) {
      toggleTaskSelection(taskId);
    }
  };

  const updateTaskRemark = (taskId: number, remark: string) => {
    setTaskRemarks((prev) => ({ ...prev, [taskId]: remark }));
    // Auto-select when interacting
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

    // Validate file size
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 20MB limit");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    // Set loading state
    setTaskImages((prev) => ({
      ...prev,
      [taskId]: { file, previewUrl, uploading: true },
    }));

    // Auto-select
    if (!selectedTasks.has(taskId)) {
      toggleTaskSelection(taskId);
    }

    try {
      // Upload to Supabase
      const uploadedUrl = await uploadImageMutation.mutateAsync({
        file,
        taskId,
      });

      // Update state with uploaded URL
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
      console.error("Upload failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );

      // Remove from state on failure
      setTaskImages((prev) => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  };

  const handleSubmit = async () => {
    if (selectedTasks.size === 0) return;

    // Check if any images are still uploading (only for tasks that have images)
    const uploadingTasks = Array.from(selectedTasks).filter(
      (taskId) => taskImages[taskId] && taskImages[taskId].uploading === true,
    );

    if (uploadingTasks.length > 0) {
      toast.error("Please wait for all images to finish uploading");
      return;
    }

    // Check if tasks requiring attachment have an image uploaded (only when status is "yes"/Done)
    const missingImageTask = Array.from(selectedTasks)
      .map((taskId) => {
        const task = tasks.find((t) => t.task_id === taskId);
        const isDone = (taskStatuses[taskId] || "yes") === "yes";
        if (isDone && task?.require_attachment?.toLowerCase() === "yes") {
          const hasImage = taskImages[taskId]?.uploadedUrl || task.image;
          if (!hasImage) return task;
        }
        return null;
      })
      .find((t) => t !== null);

    if (missingImageTask) {
      toast.error(
        `Attachment image is required for task: "${missingImageTask.task_description || missingImageTask.name || missingImageTask.task_id
        }"`
      );
      return;
    }

    const submissionData: ChecklistSubmissionItem[] = Array.from(
      selectedTasks,
    ).map((taskId) => ({
      taskId,
      status: taskStatuses[taskId] || "yes", // Default to 'yes' if selected but not explicitly set
      remarks: taskRemarks[taskId] || "",
      nextExtendDate:
        taskStatuses[taskId] === "Extend date"
          ? nextTargetDates[taskId]
          : undefined,
      image: taskImages[taskId]?.uploadedUrl
        ? {
          previewUrl: taskImages[taskId].uploadedUrl!, // Use uploaded URL
          name: taskImages[taskId].file.name,
          type: taskImages[taskId].file.type,
        }
        : undefined,
    }));

    console.log("Submitting checklist data:", {
      selectedTasksCount: selectedTasks.size,
      taskImages,
      submissionData,
    });

    try {
      await submitMutation.mutateAsync(submissionData);
      // Reset local state
      setSelectedTasks(new Set());
      setTaskRemarks({});
      setTaskStatuses({});
      setTaskImages({});
      // Refresh data
      refetchActive();
      refetchHistory();
      refetchOverdue();
      toast.success("Checklist submitted successfully");
    } catch (error) {
      console.error("Failed to submit checklist:", error);
      toast.error("Failed to submit checklist");
    }
  };

  const refresh = () => {
    refetchActive();
    refetchHistory();
    refetchLast7Days();
    refetchUpcoming7Days();
    refetchOverdue();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getFrequencyBadge = (frequency: string | null) => {
    const freq = frequency?.toLowerCase() || "one-time";
    const colors: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      weekly:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      monthly: "bg-muted text-foreground dark:bg-muted dark:text-foreground",
      "one-time":
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[freq] || colors["one-time"];
  };

  const getImageUrl = (imageVal: any): string | null => {
    if (!imageVal) return null;
    if (Array.isArray(imageVal)) return imageVal.length > 0 ? imageVal[0] : null;
    if (typeof imageVal === "string") {
      try {
        if ((imageVal.startsWith("[") && imageVal.endsWith("]")) || (imageVal.startsWith("{") && imageVal.endsWith("}"))) {
          const parsed = JSON.parse(imageVal);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
          if (typeof parsed === "string") return parsed;
        }
      } catch (e) {
        // ignore JSON parse error
      }
      if (imageVal.includes(",")) return imageVal.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
      return imageVal;
    }
    return null;
  };

  const exportToCSV = () => {
    if (tasks.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Task ID",
      "Timestamp",
      "Department",
      "Given By",
      "Name",
      "Description",
      "Plan Date",
      ...(activeTab === "history" || activeTab === "last7days"
        ? ["Submitted Date"]
        : []),
      "Status",
      "Freq",
      "Remarks",
    ];

    const csvRows = tasks.map((t) => [
      t.task_id,
      formatDate(t.created_at),
      t.department || "",
      t.given_by || "",
      t.name || "",
      `"${(t.task_description || "").replace(/"/g, '""')}"`,
      formatDate(t.task_start_date),
      ...(activeTab === "history" || activeTab === "last7days"
        ? [formatDate(t.submission_date)]
        : []),
      t.status || "Pending",
      t.frequency || "One-time",
      `"${(t.remark || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((e) => e.join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Checklist_${activeTab}_Tasks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const exportTasks =
      selectedTasks.size > 0
        ? tasks.filter((t) => selectedTasks.has(t.task_id))
        : tasks;

    if (exportTasks.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(14);
    doc.text("Checklist Tasks", 14, 15);
    doc.setFontSize(9);
    doc.text(
      `Tab: ${activeTab}  |  Exported: ${new Date().toLocaleDateString("en-IN")}  |  Total: ${exportTasks.length}`,
      14,
      22,
    );

    const columns = [
      "Task ID",
      "Timestamp",
      "Department",
      "Given By",
      "Name",
      "Description",
      "Plan Date",
      ...(activeTab === "history" || activeTab === "last7days" ? ["Submitted Date"] : []),
      "Status",
      "Freq",
      "Remarks",
    ];

    const rows = exportTasks.map((t) => [
      t.task_id,
      formatDate(t.created_at),
      t.department || "—",
      t.given_by || "—",
      t.name || "—",
      t.task_description || "—",
      formatDate(t.task_start_date),
      ...(activeTab === "history" || activeTab === "last7days" ? [formatDate(t.submission_date)] : []),
      t.status || "Pending",
      t.frequency || "One-time",
      t.remark || "—",
    ]);

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 27,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 5: { cellWidth: 55 } },
    });

    doc.save(`Checklist_${activeTab}_Tasks_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success(`PDF exported (${exportTasks.length} task${exportTasks.length !== 1 ? "s" : ""})`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Checklist
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {viewMyTasksOnly
              ? `Showing your tasks only (${username})`
              : "Manage daily operational checklist tasks"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* My Tasks / All Tasks Toggle - only for admin */}
          {isAdmin && (
            <div className="flex p-1 bg-gray-100 dark:bg-neutral-700 rounded-lg">
              <button
                onClick={() => {
                  setViewMyTasksOnly(false);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!viewMyTasksOnly
                  ? "bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                All Tasks
              </button>
              <button
                onClick={() => {
                  setViewMyTasksOnly(true);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMyTasksOnly
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
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs, Search, Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab("pending");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "pending"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
          >
            Today Pending
          </button>
          <button
            onClick={() => {
              setActiveTab("upcoming7days");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "upcoming7days"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
          >
            Upcoming 7 Days Task
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "history"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
          >
            History
          </button>
          <button
            onClick={() => {
              setActiveTab("last7days");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "last7days"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              setActiveTab("overdue");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "overdue"
              ? "bg-red-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
              }`}
          >
            Overdue
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Name Filter Dropdown */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setNameSearchQuery("");
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
            >
              <span className="max-w-28 truncate">{nameFilter || "Filter by Name"}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute z-50 mt-1 w-52 rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-neutral-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search names..."
                        value={nameSearchQuery}
                        onChange={(e) => setNameSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    <button
                      onClick={() => {
                        setNameFilter("");
                        setDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100 dark:hover:bg-neutral-700 ${!nameFilter ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-200"}`}
                    >
                      All Names
                    </button>
                    {allNames
                      .filter((name) => name.toLowerCase().includes(nameSearchQuery.toLowerCase()))
                      .map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            setNameFilter(name);
                            setDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`block w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100 dark:hover:bg-neutral-700 ${nameFilter === name ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-200"}`}
                        >
                          {name}
                        </button>
                      ))}
                    {allNames.filter((name) => name.toLowerCase().includes(nameSearchQuery.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No names found</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Frequency Filter */}
        <select
          value={frequencyFilter}
          onChange={(e) => {
            setFrequencyFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 focus:outline-none"
        >
          <option value="">All Freq</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="one-time">One-time</option>
        </select>

        {/* Status filter for Last 7 Days */}
        {activeTab === "last7days" && (
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "pending" | "done");
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}

        {/* Date range filter */}
        {(activeTab === "history" || activeTab === "overdue") && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              title="Start Date"
            />
            <span className="text-gray-500 dark:text-gray-400 text-sm">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <button
          onClick={exportToCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 ml-auto text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
        <button
          onClick={exportToPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Download PDF
        </button>

        {(activeTab === "pending" || activeTab === "overdue" || activeTab === "last7days" || activeTab === "upcoming7days") && tasks.length > 0 && (
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
                disabled={submitMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Submit ({doneCount} Done of {selectedTasks.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700">
        {isLoading && tasks.length === 0 ? (
          <div className="p-4 space-y-3">
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
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>No {activeTab} checklist items found</p>
          </div>
        ) : (
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 320px)" }}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase w-10">
                    Seq No
                  </th>
                  {(activeTab === "pending" || activeTab === "overdue" || activeTab === "last7days" || activeTab === "upcoming7days") && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase w-10">
                      <input
                        type="checkbox"
                        checked={
                          tasks.length > 0 &&
                          selectedTasks.size === tasks.length
                        }
                        onChange={() =>
                          selectedTasks.size === tasks.length
                            ? deselectAllTasks()
                            : selectAllTasks()
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    Plan Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Task ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Department
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Given By
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-50">
                    Description
                  </th>
                  {activeTab === "history" ||
                    activeTab === "last7days" ||
                    activeTab === "overdue" ||
                    activeTab === "upcoming7days" ? (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                      Submitted Date
                    </th>
                  ) : null}
                  {(activeTab === "pending" || activeTab === "last7days" || activeTab === "upcoming7days") && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-blue-50 dark:bg-blue-900/20">
                      Status
                    </th>
                  )}

                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Freq
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Reminders
                  </th>
                  {(activeTab === "pending" ||
                    activeTab === "overdue" ||
                    activeTab === "upcoming7days") && (
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Attachment Required
                      </th>
                    )}
                  {activeTab === "pending" ? (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Sample Image
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Image
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Upload
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Remark
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Sample Image
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Image
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Remark
                      </th>
                      {activeTab === "overdue" && (
                        <>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-blue-50 dark:bg-blue-900/20">
                            Select Status
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                            New Remark
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                            New Upload
                          </th>
                        </>
                      )}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {paginatedTasks.map((task, index) => {
                  const safeSampleImage = getImageUrl(task.sample_image);
                  const safeTaskImage = getImageUrl(task.image);
                  return (
                    <tr
                      key={task.task_id || index}
                      onClick={() => handleRowClick(task.task_id)}
                      className={`hover:bg-gray-50 dark:hover:bg-neutral-700/50 cursor-default ${selectedTasks.has(task.task_id)
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                        }`}
                    >
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      {(activeTab === "pending" || activeTab === "overdue" || activeTab === "last7days" || activeTab === "upcoming7days") && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.task_id)}
                            onChange={() => toggleTaskSelection(task.task_id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                        </td>
                      )}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                        {formatDate(task.task_start_date)}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {task.task_id}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {task.department || "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {task.given_by || "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {task.name || "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-50">
                        <div
                          className="whitespace-normal wrap-break-word"
                          title={task.task_description || ""}
                        >
                          {task.task_description || "—"}
                        </div>
                      </td>
                      {(activeTab === "history" ||
                        activeTab === "last7days" ||
                        activeTab === "overdue" ||
                        activeTab === "upcoming7days") && (
                          <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                            {formatDate(task.submission_date)}
                          </td>
                        )}
                      {(activeTab === "pending" || activeTab === "last7days" || activeTab === "upcoming7days") && (
                        <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/10">
                          <select
                            disabled={!selectedTasks.has(task.task_id)}
                            value={taskStatuses[task.task_id] || ""}
                            onChange={(e) =>
                              updateTaskStatus(task.task_id, e.target.value)
                            }
                            className="min-w-32 border border-gray-300 dark:border-neutral-600 rounded-md px-2 py-1 w-full disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-xs sm:text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select</option>
                            <option value="yes">Done</option>
                            <option value="no">Not Done</option>
                          </select>
                        </td>
                      )}

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(
                            task.frequency,
                          )}`}
                        >
                          {task.frequency || "One-time"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {task.enable_reminder || "—"}
                      </td>
                      {(activeTab === "pending" ||
                        activeTab === "overdue" ||
                        activeTab === "upcoming7days") && (
                          <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.require_attachment === "yes"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                            >
                              {task.require_attachment === "yes" ? "Yes" : "No"}
                            </span>
                          </td>
                        )}
                      {/* History, Last 7 Days, Overdue & Upcoming 7 Days Tab Info */}
                      {(activeTab === "history" ||
                        activeTab === "last7days" ||
                        activeTab === "overdue" ||
                        activeTab === "upcoming7days") && (
                          <>
                            <td className="px-3 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.status === "yes" || task.status === "Done"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : task.status === "Extend date"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : task.status === "no" ||
                                      (task.task_start_date &&
                                        new Date(task.task_start_date) <
                                        new Date(
                                          new Date().setHours(0, 0, 0, 0),
                                        ))
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}
                              >
                                {task.status === "yes" || task.status === "Done"
                                  ? "Done"
                                  : task.status === "Extend date"
                                    ? "Extended"
                                    : task.status === "no"
                                      ? "Not Done"
                                      : task.task_start_date &&
                                        new Date(task.task_start_date) <
                                        new Date(
                                          new Date().setHours(0, 0, 0, 0),
                                        )
                                        ? "Overdue"
                                        : "Pending"}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {safeSampleImage ? (
                                <div className="w-10 h-10 rounded border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                  <a
                                    href={safeSampleImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={safeSampleImage}
                                      alt="Sample"
                                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "https://placehold.co/40?text=Error";
                                      }}
                                    />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No Image
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {safeTaskImage ? (
                                <div className="w-10 h-10 rounded border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                  <a
                                    href={safeTaskImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={safeTaskImage}
                                      alt="Task"
                                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "https://placehold.co/40?text=Error";
                                      }}
                                    />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No Image
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground max-w-37.5 truncate">
                              {task.remark || "—"}
                            </td>
                            {/* Interactive columns for Overdue tab */}
                            {activeTab === "overdue" && (
                              <>
                                <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/10">
                                  <select
                                    disabled={!selectedTasks.has(task.task_id)}
                                    value={taskStatuses[task.task_id] || ""}
                                    onChange={(e) =>
                                      updateTaskStatus(task.task_id, e.target.value)
                                    }
                                    className="min-w-32 border border-gray-300 dark:border-neutral-600 rounded-md px-2 py-1 w-full disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-xs sm:text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                                  >
                                    <option value="">Select</option>
                                    <option value="yes">Done</option>
                                    <option value="no">Not Done</option>
                                  </select>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={taskRemarks[task.task_id] || ""}
                                    onChange={(e) =>
                                      updateTaskRemark(task.task_id, e.target.value)
                                    }
                                    placeholder="Remark..."
                                    className="w-24 px-2 py-1 text-xs rounded border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  {task.require_attachment === "yes" ? (
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
                                        <div className="flex items-center gap-1 text-blue-600">
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                          <span className="text-xs">Uploading...</span>
                                        </div>
                                      ) : taskImages[task.task_id]?.uploadedUrl ? (
                                        <div className="flex items-center gap-1 text-green-600">
                                          <Check className="w-4 h-4" />
                                          <span className="text-xs">Uploaded</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                          <Upload className="w-4 h-4" />
                                          <span className="text-xs">Upload</span>
                                        </div>
                                      )}
                                    </label>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                              </>
                            )}
                          </>
                        )}

                      {/* Pending Tab Actions */}
                      {activeTab === "pending" && (
                        <>
                          <td className="px-3 py-3">
                            {safeSampleImage ? (
                              <div className="w-10 h-10 rounded border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                <a
                                  href={safeSampleImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={safeSampleImage}
                                    alt="Sample"
                                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://placehold.co/40?text=Error";
                                    }}
                                  />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No Image
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {safeTaskImage ? (
                              <div className="w-10 h-10 rounded border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                <a
                                  href={safeTaskImage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={safeTaskImage}
                                    alt="Task"
                                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        "https://placehold.co/40?text=Error";
                                    }}
                                  />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No Image
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {task.require_attachment === "yes" ? (
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
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Check className="w-4 h-4" />
                                    <span className="text-xs">Uploaded</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                    <Upload className="w-4 h-4" />
                                    <span className="text-xs">Upload</span>
                                  </div>
                                )}
                              </label>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
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
                              className="w-24 px-2 py-1 text-xs rounded border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-neutral-700">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Showing {showingStart}-{showingEnd} of {tasks.length} • Page{" "}
              {currentPage} of {totalPages}
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

      {/* Triple-click Delete Confirmation Modal (admin only) */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Task
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Task ID: <span className="font-medium text-gray-900 dark:text-white">#{deleteConfirmId}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This will permanently delete this checklist instance. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmId(null);
                  setTripleClickTaskId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteRowMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
              >
                {deleteRowMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
