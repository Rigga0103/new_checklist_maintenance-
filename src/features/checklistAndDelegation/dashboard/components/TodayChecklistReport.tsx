"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Download,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Wrench,
  Users,
  Settings
} from "lucide-react";
import {
  useActiveChecklist,
  flattenChecklistPages,
  useChecklistHistory,
  useChecklistUpcoming7Days
} from "@/features/checklistAndDelegation/checklist/server/tanstackQuery/useChecklist";
import { useDashboardData } from "@/features/checklistAndDelegation/dashboard/server/tanstackQuery/useDashboardQuery";
import {
  useMaintenancePendingQuery,
  useMaintenanceHistoryQuery,
  useMaintenanceUpcomingQuery,
  useRepairEditQuery
} from "@/features/checklistAndDelegation/dashboard/server/tanstackQuery/useRepairDashboardQuery";
import { toast } from "sonner";

interface TodayChecklistReportProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = "checklist" | "maintenance" | "delegation" | "repairing";

export default function TodayChecklistReport({ isOpen, onClose }: TodayChecklistReportProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("checklist");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [userRole, setUserRole] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("role") || "");
      setUsername(localStorage.getItem("user-name") || "");
    }
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = nextWeekDate.toISOString().split("T")[0];

  // ============ Checklist Data ============
  const { data: upcomingChecklistData, isLoading: isLoadingUpcomingChecklist } = useChecklistUpcoming7Days("", userRole, username);
  const { data: historyChecklistData, isLoading: isLoadingHistoryChecklist } = useChecklistHistory();

  const historyChecklistTasks = useMemo(() => {
    if (!historyChecklistData?.pages) return [];
    return historyChecklistData.pages.flatMap(page => page.data).filter(task => {
      if (!task.submission_date) return false;
      return task.submission_date >= today && task.submission_date <= nextWeek;
    });
  }, [historyChecklistData, today, nextWeek]);

  // ============ Delegation Data ============
  const { data: delegationData, isLoading: isLoadingDelegation } = useDashboardData(
    "delegation",
    "upcoming",
    undefined,
    undefined,
    userRole,
    username
  );

  // ============ Maintenance Data ============
  const { data: maintenanceUpcoming, isLoading: isLoadingMaintUpcoming } = useMaintenanceUpcomingQuery("", userRole, username);
  const { data: maintenanceHistory, isLoading: isLoadingMaintHistory } = useMaintenanceHistoryQuery("", userRole, username);

  // ============ Repairing Data ============
  const { data: repairData, isLoading: isLoadingRepair } = useRepairEditQuery(0, 1000);

  const allFilteredData = useMemo(() => {
    let data: any[] = [];

    if (activeMainTab === "checklist") {
      const upcoming = (upcomingChecklistData?.data || []).map(t => ({ ...t, status_type: "pending", category: "checklist" }));
      const history = (historyChecklistTasks || []).map(t => ({ ...t, status_type: "completed", category: "checklist" }));
      data = [...upcoming, ...history];
    } else if (activeMainTab === "maintenance") {
      const upcoming = (maintenanceUpcoming || []).map(t => ({ ...t, status_type: "pending", category: "maintenance" }));
      const history = (maintenanceHistory || []).filter(t => (t.actual_date || "") >= today && (t.actual_date || "") <= nextWeek).map(t => ({ ...t, status_type: "completed", category: "maintenance", submission_date: t.actual_date }));
      data = [...upcoming, ...history];
    } else if (activeMainTab === "delegation") {
      data = (delegationData || []).map(t => {
        const isCompleted = !!t.submission_date || t.status === "done" || t.status === "Done";
        return {
          ...t,
          status_type: isCompleted ? "completed" : "pending",
          category: "delegation",
          task_id: t.task_id || t.id,
          task_description: t.task_description || t.description,
          name: t.name || t.assigned_to
        };
      });
    } else if (activeMainTab === "repairing") {
      data = (repairData?.data || []).filter(t => (t.task_start_date || "") >= today && (t.task_start_date || "") <= nextWeek).map(t => ({
        ...t,
        status_type: t.status?.toLowerCase() === "done" ? "completed" : "pending",
        category: "repairing",
        task_description: t.issue_detail,
        name: t.assigned_to,
        submission_date: t.actual_date
      }));
    }

    return data.filter(task => {
      const desc = task.task_description || task.issue_detail || task.description || "";
      const name = task.name || task.assigned_to || task.doer_name || "";
      const dept = task.department || task.machine_name || "";

      const matchesSearch =
        desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && task.status_type === "pending") ||
        (statusFilter === "completed" && task.status_type === "completed");

      return matchesSearch && matchesStatus;
    });
  }, [
    activeMainTab,
    upcomingChecklistData,
    historyChecklistTasks,
    delegationData,
    maintenanceUpcoming,
    maintenanceHistory,
    repairData,
    searchTerm,
    statusFilter,
    today
  ]);

  const stats = useMemo(() => {
    const total = allFilteredData.length;
    const completed = allFilteredData.filter(t => t.status_type === "completed").length;
    const pending = allFilteredData.filter(t => t.status_type === "pending").length;
    return { total, completed, pending };
  }, [allFilteredData]);

  const exportToCSV = () => {
    if (allFilteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Task ID",
      "Type",
      "Department/Machine",
      "Assigned To",
      "Description",
      "Status",
      "Submission Date",
      "Remark"
    ];

    const csvRows = allFilteredData.map((t) => [
      t.task_id,
      t.category,
      t.department || t.machine_name || "",
      t.name || t.assigned_to || t.doer_name || "",
      `"${(t.task_description || t.issue_detail || t.description || "").replace(/"/g, '""')}"`,
      t.status_type === "completed" ? "Completed" : "Pending",
      t.submission_date ? new Date(t.submission_date).toLocaleString() : "—",
      `"${(t.remark || t.remarks || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeMainTab}_Report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading =
    isLoadingUpcomingChecklist ||
    isLoadingHistoryChecklist ||
    isLoadingDelegation ||
    isLoadingMaintUpcoming ||
    isLoadingMaintHistory ||
    isLoadingRepair;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Weekly Operational Report
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Outlook for {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {nextWeekDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-2 bg-gray-50/50 dark:bg-neutral-800/30 border-b border-gray-100 dark:border-neutral-800 flex items-center gap-1">
          <button
            onClick={() => setActiveMainTab("checklist")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeMainTab === "checklist" ? "bg-white dark:bg-neutral-800 text-blue-600 shadow-sm border border-gray-200 dark:border-neutral-700" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="w-4 h-4" />
            Checklist
          </button>
          <button
            onClick={() => setActiveMainTab("maintenance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeMainTab === "maintenance" ? "bg-white dark:bg-neutral-800 text-orange-600 shadow-sm border border-gray-200 dark:border-neutral-700" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Settings className="w-4 h-4" />
            Maintenance
          </button>
          <button
            onClick={() => setActiveMainTab("delegation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeMainTab === "delegation" ? "bg-white dark:bg-neutral-800 text-purple-600 shadow-sm border border-gray-200 dark:border-neutral-700" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-4 h-4" />
            Delegation
          </button>
          <button
            onClick={() => setActiveMainTab("repairing")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeMainTab === "repairing" ? "bg-white dark:bg-neutral-800 text-red-600 shadow-sm border border-gray-200 dark:border-neutral-700" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Wrench className="w-4 h-4" />
            Repairing
          </button>
        </div>

        {/* Filters & Stats */}
        <div className="p-4 bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeMainTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-1 rounded-lg border border-gray-200 dark:border-neutral-700">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === "all" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === "completed" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"}`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Total: {stats.total}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Done: {stats.completed}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending: {stats.pending}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm font-medium">Loading {activeMainTab} data...</p>
            </div>
          ) : allFilteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-full mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No {activeMainTab} tasks found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                We couldn't find any {activeMainTab} tasks matching your filters for the upcoming week.
              </p>
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-neutral-800 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">Task ID</th>
                    <th className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
                      {activeMainTab === "repairing" || activeMainTab === "maintenance" ? "Machine" : "Department"}
                    </th>
                    <th className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">Name</th>
                    <th className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">Description</th>
                    <th className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">Status</th>
                    <th className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">Time</th>
                    <th className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                  {allFilteredData.map((task, idx) => (
                    <tr key={`${task.task_id || task.id}-${task.status_type}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">#{task.task_id || task.id}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <span className={`px-2 py-1 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-bold ${activeMainTab === "maintenance" ? "text-orange-600" :
                          activeMainTab === "delegation" ? "text-purple-600" :
                            activeMainTab === "repairing" ? "text-red-600" : "text-blue-600"
                          }`}>
                          {task.department || task.machine_name || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">{task.name || task.assigned_to || task.doer_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={task.task_description || task.issue_detail || task.description}>
                        {task.task_description || task.issue_detail || task.description}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${task.status_type === "completed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                          {task.status_type === "completed" ? (
                            <><CheckCircle2 className="w-3 h-3" /> Done</>
                          ) : (
                            <><Clock className="w-3 h-3" /> Pending</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {task.submission_date
                          ? new Date(task.submission_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : task.task_start_date ? new Date(task.task_start_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 italic">
                        {task.remark || task.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
