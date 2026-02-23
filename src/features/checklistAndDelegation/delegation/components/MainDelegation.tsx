"use client";

import { useState, useEffect } from "react";

import {
  FileText,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  X,
  Trash2,
  Upload,
  Users,
  User,
  ChevronDown,
  Edit,
  Save,
  Calendar,
} from "lucide-react";
import { useUsers } from "../../quickTask/server/tanstackQuery/useQuickTask";
import { useDelegation } from "../hooks/useDelegation";

export default function MainDelegation() {
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [viewMyTasksOnly, setViewMyTasksOnly] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  // Date range filter for History tab
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");

  useEffect(() => {
    setRole(localStorage.getItem("role") || "user");
    setUsername(localStorage.getItem("user-name") || null);
  }, []);

  const effectiveRole =
    role === "admin" && viewMyTasksOnly ? "user" : undefined;
  const isAdmin = role === "admin";

  const {
    pendingTasks,
    historyTasks,
    activeTab,
    isLoading,
    isSubmitting,
    selectedTasks,
    currentPage,
    totalCount,
    taskRemarks,
    taskStatuses,
    handleSearch,
    handleTabChange,
    toggleTaskSelection,
    selectAllTasks,
    deselectAllTasks,
    updateTaskRemark,
    updateTaskStatus,
    submitSelectedTasks,
    setCurrentPage,
    refresh,
    formatDate,
    getStatusColor,
    taskImages,
    nextTargetDates,
    handleImageUpload,
    updateNextTargetDate,
    filters,
    handleNameFilter,
    handleStatusFilter,
    // Edit
    editingTaskId,
    editFormData,
    isSavingEdit,
    handleEditClick,
    handleCancelEdit,
    handleEditFieldChange,
    handleSaveEdit,
  } = useDelegation(effectiveRole);

  const { data: usersData } = useUsers();
  const allNames = usersData?.map((u) => u.user_name) || [];

  console.log(activeTab, "active tab");

  console.log(pendingTasks, "pending taks ");

  const rawHistoryTasks =
    activeTab === "history" && (historyFromDate || historyToDate)
      ? historyTasks.filter((t) => {
          const dateStr = t.submission_date || t.created_at || null;
          if (!dateStr) return false;
          const d = new Date(dateStr).setHours(0, 0, 0, 0);
          if (
            historyFromDate &&
            d < new Date(historyFromDate).setHours(0, 0, 0, 0)
          )
            return false;
          if (
            historyToDate &&
            d > new Date(historyToDate).setHours(23, 59, 59, 999)
          )
            return false;
          return true;
        })
      : historyTasks;

  const tasks = activeTab === "pending" ? pendingTasks : rawHistoryTasks;
  const totalPages = Math.ceil(totalCount / 50);

  // Format frequency display
  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      weekly:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      monthly: "bg-muted text-foreground dark:bg-muted dark:text-foreground",
      "one-time":
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[frequency?.toLowerCase()] || colors["one-time"];
  };

  // Overdue check: planned_date < today AND status is not done/completed
  const isOverdue = (task: {
    planned_date?: string | null;
    status?: string | null;
  }) => {
    if (!task.planned_date) return false;
    const done = ["done", "completed", "Done", "Completed"];
    if (done.includes(task.status || "")) return false;
    return new Date(task.planned_date) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Delegation
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {viewMyTasksOnly
              ? `Showing your delegated tasks only (${username})`
              : `Manage one-time delegated tasks (${tasks.length} tasks)`}
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

      {/* Compact Stats */}
      <div className="grid gap-3 grid-cols-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Total
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {totalCount}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Pending
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {pendingTasks.length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Completed
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {historyTasks.length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-primary dark:text-foreground" />
            <div>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Selected
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedTasks.size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs, Search, Actions */}
      <div className="flex flex-wrap items-center gap-3">
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
            onClick={() => handleTabChange("history")}
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
            {filters.name || "Filter by Name"}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute z-50 mt-1 w-48 max-h-60 overflow-auto rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => {
                  handleNameFilter("");
                  setDropdownOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
              >
                All Names
              </button>
              {allNames.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    handleNameFilter(name);
                    setDropdownOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Dropdown */}
        {activeTab === "pending" && (
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
            >
              {filters.status === "all" ? "Filter by Status" : filters.status}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {statusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-40 max-h-60 overflow-auto rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700">
                <button
                  onClick={() => {
                    handleStatusFilter("all");
                    setStatusDropdownOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  All Statuses
                </button>
                {["Pending", "Extend", "Overdue"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      handleStatusFilter(st);
                      setStatusDropdownOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700"
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Date range filter — History only */}
        {activeTab === "history" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Calendar className="w-3.5 h-3.5" />
              From:
            </div>
            <input
              type="date"
              value={historyFromDate}
              onChange={(e) => {
                setHistoryFromDate(e.target.value);
              }}
              className="px-2 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-xs text-muted-foreground font-medium">
              To:
            </span>
            <input
              type="date"
              value={historyToDate}
              onChange={(e) => {
                setHistoryToDate(e.target.value);
              }}
              className="px-2 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {(historyFromDate || historyToDate) && (
              <button
                onClick={() => {
                  setHistoryFromDate("");
                  setHistoryToDate("");
                }}
                className="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {activeTab === "pending" && pendingTasks.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={selectAllTasks}
              className="text-xs text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={deselectAllTasks}
              className="text-xs text-muted-foreground hover:underline"
            >
              Clear
            </button>
            {selectedTasks.size > 0 && (
              <button
                onClick={submitSelectedTasks}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Submit ({selectedTasks.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tasks Table - All Fields */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>No {activeTab} tasks found</p>
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            style={{ maxHeight: "calc(100vh - 320px)" }}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                <tr>
                  {activeTab === "pending" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase w-10">
                      Seq No
                    </th>
                  )}
                  {activeTab === "pending" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedTasks.size === tasks.length &&
                          tasks.length > 0
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-48">
                    Task Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    Start Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    {activeTab === "pending"
                      ? "Planned Date"
                      : "Submission Date"}
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
                    {activeTab === "pending" ? "Req Attachment" : "Attachment"}
                  </th>
                  {activeTab === "pending" && (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Remark
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase">
                        Upload
                      </th>
                    </>
                  )}
                  {/* Edit column header - sticky right */}
                  <th className="sticky right-0 z-10 bg-gray-50 dark:bg-neutral-900/50 px-3 py-2 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase w-16 border-l border-gray-200 dark:border-neutral-700">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {tasks.map((task, index) => (
                  <tr
                    key={task.task_id || index}
                    className={`hover:bg-gray-50 dark:hover:bg-neutral-700/50 ${
                      selectedTasks.has(task.task_id)
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : isOverdue(task)
                          ? "bg-orange-50 dark:bg-orange-900/20"
                          : task.status === "extend"
                            ? "bg-red-50 dark:bg-red-900/20"
                            : ""
                    }`}
                  >
                    {activeTab === "pending" && (
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {index + 1}
                      </td>
                    )}
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
                      {formatDate(task.created_at) || "—"}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {task.task_id || "—"}
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
                    <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-48">
                      <div className="whitespace-normal wrap-break-word">
                        {task.task_description || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {formatDate(task.task_start_date) || "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                      {activeTab === "pending" ? (
                        <span className="flex flex-col gap-0.5">
                          <span>{formatDate(task.planned_date) || "—"}</span>
                          {isOverdue(task) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                              ⚠ Overdue
                            </span>
                          )}
                        </span>
                      ) : (
                        formatDate(task.submission_date)
                      )}
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
                          <option value="Done">Done</option>
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
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(task.frequency)}`}
                      >
                        {task.frequency || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {task.enable_reminder || "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                      {task.image ? (
                        <a
                          href={task.image}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={task.image}
                            alt="attachment"
                            className="w-10 h-10 object-cover rounded border border-gray-300 dark:border-neutral-600 hover:border-blue-500 hover:opacity-80 transition-all"
                            title="Click to view full image"
                          />
                        </a>
                      ) : (
                        <span>{task.require_attachment || "—"}</span>
                      )}
                    </td>
                    {activeTab === "pending" && (
                      <>
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
                          {taskImages[task.task_id]?.uploading ? (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs">Uploading...</span>
                            </div>
                          ) : taskImages[task.task_id]?.previewUrl ||
                            task.image ? (
                            <label className="cursor-pointer inline-block">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageUpload(task.task_id, e)
                                }
                              />
                              <img
                                src={
                                  taskImages[task.task_id]?.previewUrl ||
                                  task.image!
                                }
                                alt="attachment"
                                className={`w-10 h-10 object-cover rounded border ${
                                  taskImages[task.task_id]?.previewUrl
                                    ? "border-green-300"
                                    : "border-gray-300 dark:border-neutral-600"
                                } hover:border-blue-500 hover:opacity-80 transition-all`}
                                title="Click to replace image"
                              />
                            </label>
                          ) : task.require_attachment?.toLowerCase() ===
                            "yes" ? (
                            <label className="cursor-pointer inline-block">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageUpload(task.task_id, e)
                                }
                              />
                              <div className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
                                <Upload className="w-4 h-4" />
                                <span className="text-xs">Upload</span>
                              </div>
                            </label>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    {/* Edit button cell - sticky right */}
                    <td className="sticky right-0 z-10 bg-white dark:bg-neutral-800 px-3 py-3 border-l border-gray-100 dark:border-neutral-700">
                      <button
                        onClick={() => handleEditClick(task)}
                        title="Edit task"
                        className="p-1.5 rounded text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
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
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-neutral-700">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Page {currentPage} of {totalPages}
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

      {/* ===== EDIT TASK MODAL ===== */}
      {editingTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-semibold text-foreground dark:text-foreground">
                  Edit Task #{editingTaskId}
                </h2>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Department
                </label>
                <input
                  type="text"
                  value={editFormData.department || ""}
                  onChange={(e) =>
                    handleEditFieldChange("department", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Department"
                />
              </div>

              {/* Given By */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Given By
                </label>
                <input
                  type="text"
                  value={editFormData.given_by || ""}
                  onChange={(e) =>
                    handleEditFieldChange("given_by", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Given By"
                />
              </div>

              {/* Assign To (name) */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Assign To
                </label>
                <input
                  type="text"
                  value={editFormData.name || ""}
                  onChange={(e) =>
                    handleEditFieldChange("name", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Employee name"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Task Description
                </label>
                <textarea
                  value={editFormData.task_description || ""}
                  onChange={(e) =>
                    handleEditFieldChange("task_description", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  placeholder="Describe the task..."
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  Frequency
                </label>
                <select
                  value={editFormData.frequency || ""}
                  onChange={(e) =>
                    handleEditFieldChange("frequency", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="one-time">One Time</option>
                </select>
              </div>

              {/* Start Date & End Date in a row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={
                      editFormData.task_start_date
                        ? new Date(editFormData.task_start_date)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleEditFieldChange("task_start_date", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    End Date
                    <span className="text-orange-500 ml-1 font-normal normal-case">
                      (deadline)
                    </span>
                  </label>
                  <input
                    type="date"
                    value={
                      editFormData.planned_date
                        ? new Date(editFormData.planned_date)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      handleEditFieldChange("planned_date", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {/* Enable Reminder & Require Attachment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Reminder
                  </label>
                  <select
                    value={editFormData.enable_reminder || "no"}
                    onChange={(e) =>
                      handleEditFieldChange("enable_reminder", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Require Attachment
                  </label>
                  <select
                    value={editFormData.require_attachment || "no"}
                    onChange={(e) =>
                      handleEditFieldChange(
                        "require_attachment",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-foreground dark:text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-neutral-700">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
