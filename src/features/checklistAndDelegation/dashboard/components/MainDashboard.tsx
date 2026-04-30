"use client";

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListChecks,
  Users,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ClockCheck,
  Megaphone,
  FileText
} from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import { StatCardSkeleton, StaffTableSkeleton } from "./DashboardSkeleton";
import { useState } from "react";
import { Task } from "../types/types";
import RepairingDashboard from "./RepairingDashboard";
import AMC from "@/features/machineMaintenance/repairing/components/AMC";
import TodayChecklistReport from "./TodayChecklistReport";

const DASHBOARD_ITEMS_PER_PAGE = 20;

export default function MainDashboard() {
  const {
    dashboardType,
    filterStatus,
    searchQuery,
    dashboardStaffFilter,
    availableStaff,
    departmentFilter,
    availableDepartments,
    isLoading,
    departmentData,
    dateRange,
    userRole,
    filteredTasks,
    taskView,
    staffTaskSummary,
    isStaffSummaryLoading,
    repairActiveTab,
    setDashboardType,
    setFilterStatus,
    setSearchQuery,
    setDashboardStaffFilter,
    setDepartmentFilter,
    handleDateRangeChange,
    setTaskView,
    setRepairActiveTab,
  } = useDashboard();

  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [startDate, setStartDate] = useState(dateRange.startDate || "");
  const [endDate, setEndDate] = useState(dateRange.endDate || "");
  const [taskPage, setTaskPage] = useState(1);

  const applyDateRange = () => {
    if (startDate && endDate) {
      handleDateRangeChange(startDate, endDate);
      setShowDateRangePicker(false);
    }
  };

  const clearDateRange = () => {
    setStartDate("");
    setEndDate("");
    handleDateRangeChange("", null);
    setShowDateRangePicker(false);
  };

  // Get today's date in YYYY-MM-DD format for max date if needed
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Staff Summary Table Columns
  const renderStaffSummary = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-100 dark:border-neutral-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Staff Performance Summary
        </h2>
      </div>
      <div className="overflow-x-auto">
        {isStaffSummaryLoading ? (
          <div className="p-4">
            <StaffTableSkeleton rows={5} />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Staff Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Total Tasks
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  On-Time Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
              {staffTaskSummary.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground dark:text-muted-foreground"
                  >
                    No staff data available
                  </td>
                </tr>
              ) : (
                staffTaskSummary.map((staff) => (
                  <tr
                    key={staff.id}
                    className="hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                  >
                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                      {staff.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground-secondary dark:text-gray-300">
                      {staff.department}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {staff.total_tasks}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {staff.total_completed_tasks}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${staff.completion_score >= 80
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : staff.completion_score >= 50
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                      >
                        {staff.completion_score}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${staff.ontime_score >= 80
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : staff.ontime_score >= 50
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                      >
                        {staff.ontime_score}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // Task Table Skeleton
  const renderTaskTableSkeleton = (title: string) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-100 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 dark:bg-neutral-700/30 rounded-lg"
            >
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-gray-200 dark:bg-neutral-600 rounded" />
                <div className="flex gap-3">
                  <div className="w-24 h-3 bg-gray-200 dark:bg-neutral-600 rounded" />
                  <div className="w-28 h-3 bg-gray-200 dark:bg-neutral-600 rounded" />
                </div>
              </div>
              <div className="w-20 h-6 bg-gray-200 dark:bg-neutral-600 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTaskTable = (title: string, tasks: Task[]) => {
    const totalPages = Math.ceil(tasks.length / DASHBOARD_ITEMS_PER_PAGE);
    const paginatedTasks = tasks.slice(
      (taskPage - 1) * DASHBOARD_ITEMS_PER_PAGE,
      taskPage * DASHBOARD_ITEMS_PER_PAGE,
    );
    const showingStart =
      tasks.length > 0 ? (taskPage - 1) * DASHBOARD_ITEMS_PER_PAGE + 1 : 0;
    const showingEnd = Math.min(
      taskPage * DASHBOARD_ITEMS_PER_PAGE,
      tasks.length,
    );

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 dark:border-neutral-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <span className="text-xs text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider min-w-62.5">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground dark:text-muted-foreground"
                  >
                    No tasks found
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                  >
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-normal wrap-break-word">
                        {task.title}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-foreground-secondary dark:text-gray-300">
                        {task.assignedTo}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-foreground-secondary dark:text-gray-300">
                        {task.taskStartDate}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : task.status === "overdue"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                      >
                        {task.status.charAt(0).toUpperCase() +
                          task.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-muted-foreground">
              Showing {showingStart}-{showingEnd} of {tasks.length} • Page{" "}
              {taskPage} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                disabled={taskPage === 1}
                className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTaskPage((p) => Math.min(totalPages, p + 1))}
                disabled={taskPage === totalPages}
                className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const latestUpdates = filteredTasks.length > 0
    ? (filteredTasks.filter((t) => t.status === "completed").length > 0
      ? filteredTasks.filter((t) => t.status === "completed")
      : filteredTasks).slice(0, 15)
    : [];

  // Consolidate task tables with tabs
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Welcome back! Here&apos;s an overview of your tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Today Report Button */}
          {userRole === "admin" && (
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
              title="Today's Checklist Report"
            >
              <FileText className="w-4 h-4" />
              Report
            </button>
          )}

          {/* Date Range Picker */}
          {userRole === "admin" && (
            <div className="relative">
              <button
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                title="Filter by Date Range"
              >
                <Calendar className="w-4 h-4" />
                {dateRange.filtered
                  ? `${dateRange.startDate} - ${dateRange.endDate}`
                  : "Date Range"}
                <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
              </button>

              {showDateRangePicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDateRangePicker(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg z-20 p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Select Range
                        </h3>
                        {(startDate || endDate) && (
                          <button
                            onClick={clearDateRange}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            From
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            max={endDate || getTodayDate()}
                            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            To
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            max={getTodayDate()}
                            className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <button
                        onClick={applyDateRange}
                        disabled={!startDate || !endDate}
                        className="w-full py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dashboard Type Toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
            <button
              onClick={() => setDashboardType("checklist")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${dashboardType === "checklist"
                ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Checklist
            </button>
            <button
              onClick={() => setDashboardType("delegation")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${dashboardType === "delegation"
                ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Delegation
            </button>
            <button
              onClick={() => setDashboardType("repair")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${dashboardType === "repair"
                ? "bg-white dark:bg-neutral-700 text-orange-600 dark:text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Repair
            </button>
          </div>
        </div>
      </div>

      {dashboardType === "repair" && (
        <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setRepairActiveTab("repairing")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${repairActiveTab === "repairing"
              ? "bg-white dark:bg-neutral-700 text-orange-600 dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Repairing
          </button>
          <button
            onClick={() => setRepairActiveTab("amc")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${repairActiveTab === "amc"
              ? "bg-white dark:bg-neutral-700 text-orange-600 dark:text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            AMC
          </button>
        </div>
      )}

      {dashboardType === "repair" ? (
        repairActiveTab === "repairing" ? (
          <RepairingDashboard />
        ) : (
          <AMC />
        )
      ) : (
        <>
          {/* Dashboard Stats & Completion Rate */}
          {isLoading ? (
            <StatCardSkeleton count={4} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Stat Cards 2x2 */}
              <div className="lg:col-span-2 grid gap-4 grid-cols-2">
                {/* Total Tasks */}
                <div className="relative overflow-hidden p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                      <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Total Tasks
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {departmentData.totalTasks}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Completed */}
                <div className="relative overflow-hidden p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 rounded-lg dark:bg-emerald-900/20">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Completed
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {departmentData.completedTasks}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pending */}
                <div className="relative overflow-hidden p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 rounded-lg dark:bg-amber-900/20">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Pending
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {departmentData.pendingTasks}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Overdue */}
                <div className="relative overflow-hidden p-5 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 group hover:shadow-md transition-shadow">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-l-xl" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-50 rounded-lg dark:bg-rose-900/20">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Overdue
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {departmentData.overdueTasks}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Completion Rate Donut Chart */}
              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 flex flex-col items-center justify-center">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Completion Rate
                </h3>

                {/* SVG Donut Chart */}
                <div className="relative w-40 h-40 mb-4">
                  <svg
                    viewBox="0 0 120 120"
                    className="w-full h-full -rotate-90"
                  >
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-gray-100 dark:text-neutral-700"
                    />
                    {/* Completed segment (green) */}
                    {departmentData.totalTasks > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(departmentData.completedTasks / departmentData.totalTasks) * 314.16} 314.16`}
                        className="transition-all duration-1000 ease-out"
                      />
                    )}
                    {/* Pending segment (amber) */}
                    {departmentData.totalTasks > 0 &&
                      departmentData.pendingTasks > 0 && (
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${(departmentData.pendingTasks / departmentData.totalTasks) * 314.16} 314.16`}
                          strokeDashoffset={`${-((departmentData.completedTasks / departmentData.totalTasks) * 314.16)}`}
                          className="transition-all duration-1000 ease-out"
                        />
                      )}
                    {/* Overdue segment (rose) */}
                    {departmentData.totalTasks > 0 &&
                      departmentData.overdueTasks > 0 && (
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${(departmentData.overdueTasks / departmentData.totalTasks) * 314.16} 314.16`}
                          strokeDashoffset={`${-(((departmentData.completedTasks + departmentData.pendingTasks) / departmentData.totalTasks) * 314.16)}`}
                          className="transition-all duration-1000 ease-out"
                        />
                      )}
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {departmentData.completionRate}%
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      COMPLETED
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">
                      Completed ({departmentData.completedTasks})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">
                      Pending ({departmentData.pendingTasks})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground">
                      Overdue ({departmentData.overdueTasks})
                    </span>
                  </div>
                </div>

                {/* Quick info row */}
                <div className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700 flex justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{availableStaff.length} Staff</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date().toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Headlines / Latest Updates (Checklist only) */}
          {dashboardType === "checklist" && latestUpdates.length > 0 && (
            <div className="bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
                <Megaphone className="w-4 h-4 animate-pulse" />
                <h3 className="text-sm">Latest Updates</h3>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-blue-50/50 dark:bg-blue-900/20 text-xs text-blue-600/80 dark:text-blue-400/80 uppercase">
                    <tr>
                      <th className="px-4 py-2 font-medium">Task</th>
                      <th className="px-4 py-2 font-medium text-right">Assigned To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50 dark:divide-blue-900/20">
                    {latestUpdates.map((task, idx) => (
                      <tr
                        key={`update-${task.id}-${idx}`}
                        className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-blue-900 dark:text-blue-100 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="line-clamp-1">{task.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-blue-600/80 dark:text-blue-300/80 text-xs font-semibold text-right whitespace-nowrap">
                          {task.assignedTo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setTaskPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(
                  e.target.value as "all" | "pending" | "completed" | "overdue",
                );
                setTaskPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>

            {userRole === "admin" && availableStaff.length > 0 && (
              <select
                value={dashboardStaffFilter}
                onChange={(e) => {
                  setDashboardStaffFilter(e.target.value);
                  setTaskPage(1);
                }}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all cursor-pointer"
              >
                <option value="all">All Staff</option>
                {availableStaff.map((staff) => (
                  <option key={staff} value={staff}>
                    {staff}
                  </option>
                ))}
              </select>
            )}

            {dashboardType === "checklist" &&
              availableDepartments.length > 0 && (
                <select
                  value={departmentFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setTaskPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}
          </div>

          {/* Staff Summary Section (Admin Only) */}
          {userRole === "admin" && renderStaffSummary()}

          {/* Task Sections Tabs */}
          {!dateRange.filtered && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 p-1.5 flex gap-1">
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${taskView === "recent"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => {
                  setTaskView("recent");
                  setTaskPage(1);
                }}
              >
                <Clock className="w-4 h-4" />
                Recent & Today
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${taskView === "upcoming"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => {
                  setTaskView("upcoming");
                  setTaskPage(1);
                }}
              >
                <Calendar className="w-4 h-4" />
                Upcoming
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${taskView === "overdue"
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => {
                  setTaskView("overdue");
                  setTaskPage(1);
                }}
              >
                <AlertTriangle className="w-4 h-4" />
                Overdue
              </button>
            </div>
          )}

          {/* Conditional Rendering of Task Table */}
          <div className="mt-4">
            {isLoading ? (
              <>
                {dateRange.filtered ? (
                  renderTaskTableSkeleton(
                    `Tasks from ${dateRange.startDate} to ${dateRange.endDate}`,
                  )
                ) : (
                  <>
                    {taskView === "recent" &&
                      renderTaskTableSkeleton("Recent & Today's Tasks")}
                    {taskView === "upcoming" &&
                      renderTaskTableSkeleton("Upcoming Tasks (Next 7 Days)")}
                    {taskView === "overdue" &&
                      renderTaskTableSkeleton("Overdue Tasks")}
                  </>
                )}
              </>
            ) : (
              <>
                {dateRange.filtered ? (
                  renderTaskTable(
                    `Tasks from ${dateRange.startDate} to ${dateRange.endDate}`,
                    filteredTasks,
                  )
                ) : (
                  <>
                    {taskView === "recent" &&
                      renderTaskTable("Recent & Today's Tasks", filteredTasks)}
                    {taskView === "upcoming" &&
                      renderTaskTable(
                        "Upcoming Tasks (Next 7 Days)",
                        filteredTasks,
                      )}
                    {taskView === "overdue" &&
                      renderTaskTable("Overdue Tasks", filteredTasks)}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Today's Checklist Report Modal */}
      <TodayChecklistReport
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  );
}
