"use client";

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListChecks,
  TrendingUp,
  Users,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import { DashboardPageSkeleton } from "./DashboardSkeleton";
import { useState } from "react";
import { Task } from "../types/types";
import RepairingDashboard from "./RepairingDashboard";

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
    setDashboardType,
    setFilterStatus,
    setSearchQuery,
    setDashboardStaffFilter,
    setDepartmentFilter,
    handleDateRangeChange,
    setTaskView,
  } = useDashboard();

  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [startDate, setStartDate] = useState(dateRange.startDate || "");
  const [endDate, setEndDate] = useState(dateRange.endDate || "");

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

  if (isLoading) {
    return <DashboardPageSkeleton />;
  }

  // Staff Summary Table Columns
  const renderStaffSummary = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-100 dark:border-neutral-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Staff Performance Summary
        </h2>
      </div>
      <div className="overflow-x-auto">
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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        staff.completion_score >= 80
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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        staff.ontime_score >= 80
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
      </div>
    </div>
  );

  const renderTaskTable = (title: string, tasks: Task[]) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-100 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-neutral-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
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
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground dark:text-muted-foreground"
                >
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                >
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.status === "completed"
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
    </div>
  );

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
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dashboardType === "checklist"
                  ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Checklist
            </button>
            <button
              onClick={() => setDashboardType("delegation")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dashboardType === "delegation"
                  ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Delegation
            </button>
            <button
              onClick={() => setDashboardType("repair")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                dashboardType === "repair"
                  ? "bg-white dark:bg-neutral-700 text-orange-600 dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Repair
            </button>
          </div>
        </div>
      </div>

      {dashboardType === "repair" ? (
        <RepairingDashboard />
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                  <ListChecks className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {departmentData.totalTasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg dark:bg-green-900/30">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {departmentData.completedTasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg dark:bg-yellow-900/30">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {departmentData.pendingTasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg dark:bg-red-900/30">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Overdue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {departmentData.overdueTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Completion Rate Card */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg dark:bg-muted">
                  <TrendingUp className="w-6 h-6 text-primary dark:text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Completion Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {departmentData.completionRate}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-neutral-700">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${departmentData.completionRate}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg dark:bg-primary/30">
                  <Users className="w-6 h-6 text-primary dark:text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Active Staff
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {availableStaff.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-100 rounded-lg dark:bg-cyan-900/30">
                  <Calendar className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    Today&apos;s Date
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {new Date().toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
            <div className="flex-1 min-w-48">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as "all" | "pending" | "completed" | "overdue",
                )
              }
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>

            {userRole === "admin" && availableStaff.length > 0 && (
              <select
                value={dashboardStaffFilter}
                onChange={(e) => setDashboardStaffFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="flex border-b border-gray-200 dark:border-neutral-700">
            <button
              className={`flex items-center gap-2 px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                taskView === "recent"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-neutral-600"
              }`}
              onClick={() => setTaskView("recent")}
            >
              Recent & Today
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                taskView === "upcoming"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-neutral-600"
              }`}
              onClick={() => setTaskView("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                taskView === "overdue"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-neutral-600"
              }`}
              onClick={() => setTaskView("overdue")}
            >
              Overdue
            </button>
          </div>

          {/* Conditional Rendering of Task Table */}
          <div className="mt-4">
            {taskView === "recent" &&
              renderTaskTable("Recent & Today's Tasks", filteredTasks)}
            {taskView === "upcoming" &&
              renderTaskTable("Upcoming Tasks (Next 7 Days)", filteredTasks)}
            {taskView === "overdue" &&
              renderTaskTable("Overdue Tasks", filteredTasks)}
          </div>
        </>
      )}
    </div>
  );
}
