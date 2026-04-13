"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useMaintenanceDataQuery,
  useMaintenancePendingQuery,
  useMaintenanceHistoryQuery,
  useMaintenanceLast7DaysQuery,
  useMaintenanceOverdueQuery,
  useMaintenanceUpcomingQuery,
  useUpdateMaintenanceTask,
  useDeleteMaintenanceTasks,
} from "../server/tanstackQuery/useRepairDashboardQuery";
import { useUploadMaintenanceImage } from "../server/tanstackQuery/useMaintenanceUpload";
import type { MachineMaintenanceTask } from "../server/api/repairDashboardApi";

// ============ Helper Functions ============

function parseDateFromString(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const date = parseDateFromString(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ============ Chart Data Types ============

export interface MaintenanceStats {
  totalMachines: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface FrequencyChartItem {
  name: string;
  count: number;
}

// ============ Main Hook ============

export type MaintenanceTab = "pending" | "history" | "last7days" | "upcoming";

interface UseMaintenanceDashboardOptions {
  role?: string | null;
  username?: string | null;
}

export function useMaintenanceDashboard(
  options: UseMaintenanceDashboardOptions = {},
) {
  const { role = null, username = null } = options;

  // ---- Filter State ----
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);
  const machineDropdownRef = useRef<HTMLDivElement>(null);

  // ---- Data Queries ----
  // Filtered queries for MaintenanceList (pending/history views)
  const {
    data: pendingTasks = [],
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = useMaintenancePendingQuery(
    searchTerm,
    role,
    username,
    startDate || undefined,
    endDate || undefined,
  );

  const {
    data: historyTasks = [],
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useMaintenanceHistoryQuery(
    searchTerm,
    role,
    username,
    startDate || undefined,
    endDate || undefined,
  );

  const {
    data: last7DaysTasks = [],
    isLoading: last7DaysLoading,
    error: last7DaysError,
    refetch: refetchLast7Days,
  } = useMaintenanceLast7DaysQuery(searchTerm, role, username);

  const {
    data: overdueTasks = [],
    isLoading: overdueLoading,
    error: overdueError,
    refetch: refetchOverdue,
  } = useMaintenanceOverdueQuery(searchTerm, role, username);

  const {
    data: upcomingTasks = [],
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useMaintenanceUpcomingQuery(searchTerm, role, username);

  // Full data query for Dashboard charts/stats (no user/date filter)
  const {
    data: allMaintenanceTasks = [],
    isLoading: allMaintenanceLoading,
    refetch: refetchAllMaintenance,
  } = useMaintenanceDataQuery();

  // ---- Dashboard Global Date Filter ----
  // We filter allMaintenanceTasks by startDate and endDate.
  const filteredAllMaintenanceTasks = useMemo(() => {
    let tasks = allMaintenanceTasks;

    if (startDate) {
      tasks = tasks.filter((t) => t.task_start_date && t.task_start_date >= startDate);
    }
    if (endDate) {
      tasks = tasks.filter((t) => t.task_start_date && t.task_start_date <= endDate);
    }

    return tasks;
  }, [allMaintenanceTasks, startDate, endDate]);

  const updateTaskMutation = useUpdateMaintenanceTask();
  const deleteTaskMutation = useDeleteMaintenanceTasks();
  const uploadImageMutation = useUploadMaintenanceImage();

  // ---- Loading & Error (based on active tab) ----
  const maintenanceLoading =
    activeTab === "pending"
      ? pendingLoading || overdueLoading
      : activeTab === "history"
        ? historyLoading
        : activeTab === "last7days"
          ? last7DaysLoading
          : upcomingLoading;
  const maintenanceError =
    pendingError ||
    historyError ||
    last7DaysError ||
    overdueError ||
    upcomingError;

  const refetchMaintenance = useCallback(() => {
    refetchPending();
    refetchHistory();
    refetchLast7Days();
    refetchOverdue();
    refetchUpcoming();
    refetchAllMaintenance();
  }, [
    refetchPending,
    refetchHistory,
    refetchLast7Days,
    refetchOverdue,
    refetchUpcoming,
    refetchAllMaintenance,
  ]);

  // ---- Click-away handler for machine dropdown ----
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        machineDropdownRef.current &&
        !machineDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMachineDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- Active data based on tab ----
  const currentTabData = useMemo(() => {
    if (activeTab === "pending") {
      // Combine and deduplicate overdue + pending tasks
      const combined = [...overdueTasks, ...pendingTasks];
      const seen = new Set();
      return combined.filter((t) => {
        if (seen.has(t.task_id)) return false;
        seen.add(t.task_id);
        return true;
      });
    }
    if (activeTab === "history") return historyTasks;
    if (activeTab === "last7days") return last7DaysTasks;
    return upcomingTasks;
  }, [
    activeTab,
    pendingTasks,
    historyTasks,
    last7DaysTasks,
    overdueTasks,
    upcomingTasks,
  ]);

  // ---- Derived filter lists (from current tab data) ----
  const machinesList = useMemo(() => {
    const set = new Set<string>();
    currentTabData.forEach((t) => {
      if (t.machine_name) set.add(t.machine_name);
    });
    return Array.from(set).sort();
  }, [currentTabData]);

  // ---- Machine filter (client-side, on top of server-side filtering) ----
  const filteredMaintenanceData = useMemo(() => {
    let data = currentTabData;

    // Filter by Machine
    if (selectedMachines.length > 0) {
      data = data.filter((task) => {
        const name = task.machine_name || "";
        return selectedMachines.some((machine) => name === machine);
      });
    }

    return data;
  }, [currentTabData, selectedMachines]);

  // ---- Active filters check ----
  const hasActiveFilters = useMemo(() => {
    return selectedMachines.length > 0 || searchTerm !== "";
  }, [selectedMachines, searchTerm]);

  // ---- Stats Calculation (uses ALL data for dashboard) ----
  const maintenanceStats = useMemo<MaintenanceStats>(() => {
    const today = new Date().toISOString().split("T")[0];

    // Filter tasks till today (inclusive)
    const tasksTillToday = filteredAllMaintenanceTasks.filter(
      (t) => t.task_start_date && t.task_start_date <= today
    );

    const totalTasks = tasksTillToday.length;
    const completedTasks = tasksTillToday.filter(
      (t) => t.actual_date && t.actual_date.trim() !== "",
    ).length;
    const pendingTasksCount = totalTasks - completedTasks;

    // Overdue: Start date < today and not completed
    const overdueTasks = tasksTillToday.filter((t) => {
      if (t.actual_date && t.actual_date.trim() !== "") return false;
      if (!t.task_start_date) return false;
      return t.task_start_date < today;
    }).length;

    // Unique machines
    const distinctMachines = new Set(
      filteredAllMaintenanceTasks.map((t) => t.machine_name).filter(Boolean),
    ).size;

    return {
      totalMachines: distinctMachines,
      totalTasks,
      completedTasks,
      pendingTasks: pendingTasksCount,
      overdueTasks,
    };
  }, [filteredAllMaintenanceTasks]);

  // ---- Chart Data: Frequency Distribution ----
  const frequencyChartData = useMemo<FrequencyChartItem[]>(() => {
    const counts: Record<string, number> = {};
    filteredAllMaintenanceTasks.forEach((t) => {
      const freq = t.frequency || "Unknown";
      counts[freq] = (counts[freq] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAllMaintenanceTasks]);

  // ---- Chart Data: Machines with most tasks ----
  const machineChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAllMaintenanceTasks.forEach((t) => {
      const name = t.machine_name || "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredAllMaintenanceTasks]);

  // ---- Dashboard Task Views (Recent / Upcoming / Overdue) ----
  const [dashboardView, setDashboardView] = useState<
    "recent" | "upcoming" | "overdue" | "history" | "pending"
  >("recent");

  const dashboardTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let data = filteredAllMaintenanceTasks;

    if (dashboardView === "recent") {
      data = data.filter(
        (t) => t.task_start_date && t.task_start_date.startsWith(today),
      );
    } else if (dashboardView === "upcoming") {
      data = data.filter((t) => t.task_start_date && t.task_start_date > today);
    } else if (dashboardView === "overdue") {
      data = data.filter((t) => {
        if (t.actual_date && t.actual_date.trim() !== "") return false;
        if (!t.task_start_date) return false;
        return t.task_start_date < today;
      });
    } else if (dashboardView === "history") {
      data = data.filter((t) => t.actual_date && t.actual_date.trim() !== "");
    } else if (dashboardView === "pending") {
      data = data.filter((t) => !t.actual_date || t.actual_date.trim() === "");
    }

    return data.sort((a, b) => {
      if (dashboardView === "history") {
        const dateA = a.actual_date || a.task_start_date || "";
        const dateB = b.actual_date || b.task_start_date || "";
        return dateB.localeCompare(dateA);
      }

      const dateA = a.task_start_date || "";
      const dateB = b.task_start_date || "";
      if (dashboardView === "recent") {
        return dateB.localeCompare(dateA);
      }
      return dateA.localeCompare(dateB);
    });
  }, [filteredAllMaintenanceTasks, dashboardView]);

  // ---- Handlers ----
  const handleMachineSelection = useCallback((machine: string) => {
    setSelectedMachines((prev) =>
      prev.includes(machine)
        ? prev.filter((item) => item !== machine)
        : [...prev, machine],
    );
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedMachines([]);
    setShowMachineDropdown(false);
  }, []);

  return {
    // Loading & Error
    maintenanceLoading,
    allMaintenanceLoading,
    maintenanceError: maintenanceError
      ? maintenanceError instanceof Error
        ? maintenanceError.message
        : "Failed to load maintenance data"
      : null,
    refetchMaintenance,

    // Data
    maintenanceTasks: allMaintenanceTasks,
    filteredMaintenanceData,
    dashboardTasks,
    dashboardView,
    setDashboardView,

    // Filter state
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

    // Mutations
    updateTaskMutation,
    deleteTaskMutation,
    uploadImageMutation,

    // Filter options
    machinesList,
    hasActiveFilters,

    // Actions
    handleMachineSelection,
    resetFilters,

    // Stats
    maintenanceStats,
    frequencyChartData,
    machineChartData,
  };
}