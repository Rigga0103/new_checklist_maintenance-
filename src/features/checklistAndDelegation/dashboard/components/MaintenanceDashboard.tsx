"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Settings,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Calendar,
  History,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useMaintenanceDashboard } from "../hooks/useMaintenanceDashboard";
import { Loader2 } from "lucide-react";

const ITEMS_PER_PAGE = 10;

// ============ Sub-Components ============

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subtext?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 border-l-4 ${color} p-5 hover:shadow-md transition-all duration-300`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
        <div
          className={`p-3 rounded-xl ${color
            .replace("border-", "bg-")
            .replace("-500", "-100")} dark:opacity-80`}
        >
          <Icon className={`w-6 h-6 ${color.replace("border-", "text-")}`} />
        </div>
      </div>
    </div>
  );
}

const FREQUENCY_COLORS = {
  daily: "#3b82f6", // blue-500
  weekly: "#22c55e", // green-500
  monthly: "#a855f7", // purple-500
  "one-time": "#64748b", // slate-500
  yearly: "#f59e0b", // amber-500
};

export default function MaintenanceDashboard() {
  const {
    maintenanceLoading,
    maintenanceError,
    maintenanceStats,
    frequencyChartData,
    machineChartData,
    dashboardTasks,
    dashboardView,
    setDashboardView,
    deleteTaskMutation,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useMaintenanceDashboard();

  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dashboardView]);

  // Filter tasks based on selected date range
  const filteredTasks = dashboardTasks.filter((task) => {
    if (!task.task_start_date) return false;

    // If no date range selected, show all
    if (!startDate && !endDate) return true;

    const taskDate = task.task_start_date;

    // Check start date
    if (startDate && taskDate < startDate) return false;

    // Check end date
    if (endDate && taskDate > endDate) return false;

    return true;
  });

  // Safety check for pagination bounds
  useEffect(() => {
    const total = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
    if (total > 0 && currentPage > total) {
      setCurrentPage(total);
    }
  }, [filteredTasks.length, currentPage]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const showingStart =
    filteredTasks.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredTasks.length,
  );

  const handleStartDate = (date: string) => {
    setStartDate(date);
    setCurrentPage(1);
  };

  const handleEndDate = (date: string) => {
    setEndDate(date);
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    if (filteredTasks.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = [
      "Machine Name",
      "Machine Type",
      "Task Description",
      "Assigned To",
      "Start Date",
      "Actual Date",
      "Status",
    ];

    const csvRows = filteredTasks.map((t) => {
      let statusStr = "Pending";
      if (t.actual_date && t.actual_date.trim() !== "") {
        statusStr = "Completed";
      } else if (dashboardView === "overdue") {
        statusStr = "Overdue";
      }

      return [
        `"${(t.machine_name || "").replace(/"/g, '""')}"`,
        `"${(t.machine_type || "").replace(/"/g, '""')}"`,
        `"${(t.task_description || "").replace(/"/g, '""')}"`,
        `"${(t.assigned_to || t.doer_name || "").replace(/"/g, '""')}"`,
        t.task_start_date || "",
        t.actual_date || "",
        statusStr,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...csvRows.map((e) => e.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Maintenance_${dashboardView}_Tasks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTaskMutation.mutateAsync([taskId]);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (maintenanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (maintenanceError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-500">
        Error loading dashboard data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Filter - Same Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Maintenance Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of machine maintenance activities
          </p>
        </div>

        {/* Date Range Filter - Aligned Right */}
        <div>
          <div className="flex items-center gap-2">
            <div className="font-bold pr-5">SELECT RANGE</div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute -top-2 left-2 px-1 text-[10px] bg-white dark:bg-neutral-800 text-muted-foreground">From</span>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDate(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <span className="absolute -top-2 left-2 px-1 text-[10px] bg-white dark:bg-neutral-800 text-muted-foreground">To</span>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDate(e.target.value)}
                  min={startDate}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilter}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {(startDate || endDate) && (
            <p className="text-xs text-muted-foreground mt-1 text-right">
              Showing tasks {startDate ? `from ${new Date(startDate).toLocaleDateString()}` : ""}
              {startDate && endDate ? " to " : endDate ? " up to " : ""}
              {endDate ? new Date(endDate).toLocaleDateString() : ""}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Machines"
          value={maintenanceStats.totalMachines}
          icon={Settings}
          color="border-gray-500"
          subtext="Active machines"
        />
        <StatCard
          title="Total Tasks"
          value={maintenanceStats.totalTasks}
          icon={Wrench}
          color="border-blue-500"
          subtext="All scheduled tasks"
        />
        <StatCard
          title="Completed"
          value={maintenanceStats.completedTasks}
          icon={CheckCircle2}
          color="border-green-500"
          subtext={`${((maintenanceStats.completedTasks / (maintenanceStats.totalTasks || 1)) * 100).toFixed(0)}% completion`}
        />
        <StatCard
          title="Overdue"
          value={maintenanceStats.overdueTasks}
          icon={AlertTriangle}
          color="border-rose-500"
          subtext="Tasks requiring attention"
        />
      </div>

      {/* Charts Grid - Reduced Height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequency Distribution */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <PieChartIcon size={20} className="text-blue-500" />
            Task Frequency
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={frequencyChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="name"
                >
                  {frequencyChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        FREQUENCY_COLORS[
                        entry.name.toLowerCase() as keyof typeof FREQUENCY_COLORS
                        ] || "#94a3b8"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value} Tasks`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    color: "#000",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Machines by Tasks */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <BarChart3 size={20} className="text-orange-500" />
            Top Machines (by Task Count)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={machineChartData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    color: "#000",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#f97316"
                  radius={[0, 4, 4, 0]}
                  barSize={15}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task View Toggles */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-1 flex-1 max-w-2xl">

              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${dashboardView === "recent"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => setDashboardView("recent")}
              >
                <TrendingUp className="w-4 h-4" />
                Recent & Today
              </button>

              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${dashboardView === "upcoming"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => setDashboardView("upcoming")}
              >
                <Settings className="w-4 h-4" />
                Upcoming
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${dashboardView === "overdue"
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => setDashboardView("overdue")}
              >
                <AlertTriangle className="w-4 h-4" />
                Overdue
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${dashboardView === "history"
                  ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => setDashboardView("history")}
              >
                <History className="w-4 h-4" />
                History
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${dashboardView === "pending"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-foreground"
                  }`}
                onClick={() => setDashboardView("pending")}
              >
                <Clock className="w-4 h-4" />
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-neutral-700 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {dashboardView === "pending" && "All Pending Tasks"}
                {dashboardView === "recent" && "Recent & Today's Tasks"}
                {dashboardView === "upcoming" && "Upcoming Tasks"}
                {dashboardView === "overdue" && "Overdue Tasks"}
                {dashboardView === "history" && "History Tasks"}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {filteredTasks.length} task
                {filteredTasks.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                    Machine Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                    Machine Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
                {paginatedTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground dark:text-muted-foreground"
                    >
                      {(startDate || endDate)
                        ? "No tasks found for the selected date range"
                        : "No tasks found"}
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map((task, idx) => (
                    <tr
                      key={task.task_id || idx}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                    >
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground-secondary dark:text-gray-300">
                          {task.machine_type || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.machine_name}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground-secondary dark:text-gray-300">
                          {task.task_description}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground-secondary dark:text-gray-300">
                          {task.assigned_to || task.doer_name || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground-secondary dark:text-gray-300">
                          {task.task_start_date}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.actual_date && task.actual_date.trim() !== ""
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : dashboardView === "overdue"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                        >
                          {task.actual_date && task.actual_date.trim() !== ""
                            ? "Completed"
                            : dashboardView === "overdue"
                              ? "Overdue"
                              : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDeleteTask(task.task_id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50 flex-wrap gap-y-2">
              <p className="text-xs text-muted-foreground">
                Showing {showingStart}-{showingEnd} of {filteredTasks.length}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-white dark:hover:bg-neutral-700 transition-colors bg-white dark:bg-neutral-800 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-white dark:hover:bg-neutral-700 transition-colors bg-white dark:bg-neutral-800 shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}