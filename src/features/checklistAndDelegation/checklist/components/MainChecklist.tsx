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
  Users,
  User,
  ChevronDown,
} from "lucide-react";
// import Image from "next/image";
import {
  useActiveChecklist,
  useChecklistHistory,
  useSubmitChecklist,
  flattenChecklistPages,
} from "../server/tanstackQuery/useChecklist";
import { useUsers } from "../../quickTask/server/tanstackQuery/useQuickTask";
import { useUploadChecklistImage } from "../server/tanstackQuery/useChecklistUpload";
import { ChecklistSubmissionItem } from "../types/types";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 50;

export default function MainChecklist() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
  } = useChecklistHistory(searchTerm, effectiveRole, username);

  const { data: usersData } = useUsers();
  const allNames = usersData?.map((u) => u.user_name) || [];

  const submitMutation = useSubmitChecklist();
  const uploadImageMutation = useUploadChecklistImage();

  const activeTasks = flattenChecklistPages(activeData);
  const historyTasks = historyData?.pages.flatMap((page) => page.data) || [];

  const rawTasks = activeTab === "pending" ? activeTasks : historyTasks;
  const tasks = nameFilter
    ? rawTasks.filter((t) => t.name === nameFilter)
    : rawTasks;

  const isLoading = isFetchingActive || isFetchingHistory;

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
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit");
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
      toast.success("Checklist submitted successfully");
    } catch (error) {
      console.error("Failed to submit checklist:", error);
      toast.error("Failed to submit checklist");
    }
  };

  const refresh = () => {
    refetchActive();
    refetchHistory();
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
                onClick={() => {
                  setViewMyTasksOnly(true);
                  setCurrentPage(1);
                }}
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
            }`}
          >
            History
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
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
          >
            {nameFilter || "Filter by Name"}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute z-50 mt-1 w-48 max-h-60 overflow-auto rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => {
                  setNameFilter("");
                  setDropdownOpen(false);
                  setCurrentPage(1);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
              >
                All Names
              </button>
              {allNames.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setNameFilter(name);
                    setDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === "pending" && tasks.length > 0 && (
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
                  {activeTab === "pending" && (
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Timestamp
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    Start Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    {activeTab === "pending" ? "End Date" : "Submitted Date"}
                  </th>
                  {activeTab === "pending" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-blue-50 dark:bg-blue-900/20">
                      Status
                    </th>
                  )}
                  {activeTab === "pending" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-indigo-50 dark:bg-indigo-900/20">
                      Next Target
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Freq
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Reminders
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                    Attach Req
                  </th>
                  {activeTab === "pending" ? (
                    <>
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
                        Remark
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Attachment
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {paginatedTasks.map((task, index) => (
                  <tr
                    key={task.task_id || index}
                    className={`hover:bg-gray-50 dark:hover:bg-neutral-700/50 ${
                      selectedTasks.has(task.task_id)
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
                          checked={selectedTasks.has(task.task_id)}
                          onChange={() => toggleTaskSelection(task.task_id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {formatDate(task.created_at)}
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
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {formatDate(task.task_start_date)}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {activeTab === "pending"
                        ? formatDate(task.planned_date)
                        : formatDate(task.submission_date)}
                    </td>
                    {activeTab === "pending" && (
                      <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/10">
                        <select
                          disabled={!selectedTasks.has(task.task_id)}
                          value={taskStatuses[task.task_id] || ""}
                          onChange={(e) =>
                            updateTaskStatus(task.task_id, e.target.value)
                          }
                          className="border border-gray-300 dark:border-neutral-600 rounded-md px-2 py-1 w-full disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-xs sm:text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select</option>
                          <option value="yes">Done</option>
                          <option value="no">Not Done</option>
                          <option value="Extend date">Extend</option>
                        </select>
                      </td>
                    )}
                    {activeTab === "pending" && (
                      <td className="px-3 py-3 bg-indigo-50 dark:bg-indigo-900/10">
                        <input
                          type="date"
                          disabled={
                            !selectedTasks.has(task.task_id) ||
                            taskStatuses[task.task_id] !== "Extend date"
                          }
                          value={nextTargetDates[task.task_id] || ""}
                          onChange={(e) => {
                            updateNextTargetDate(task.task_id, e.target.value);
                          }}
                          className="border border-gray-300 dark:border-neutral-600 rounded-md px-2 py-1 w-full disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-xs sm:text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                        />
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
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {task.require_attachment || "—"}
                    </td>

                    {/* Pending Tab Actions */}
                    {activeTab === "pending" && (
                      <>
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
                            <span className="text-xs text-muted-foreground">
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
                            className="w-24 px-2 py-1 text-xs rounded border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </td>
                      </>
                    )}

                    {/* History Tab Info */}
                    {activeTab === "history" && (
                      <>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.status === "yes" || task.status === "Done"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : task.status === "Extend date"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {task.status === "yes" || task.status === "Done"
                              ? "Done"
                              : task.status === "Extend date"
                                ? "Extended"
                                : "Not Done"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground max-w-37.5 truncate">
                          {task.remark || "—"}
                        </td>
                        <td className="px-3 py-3">
                          {task.image ? (
                            <a
                              href={task.image}
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
    </div>
  );
}
