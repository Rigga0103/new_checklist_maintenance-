"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useMaintenanceDataQuery,
  useUpdateMaintenanceTask,
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

export type MaintenanceTab = "pending" | "history";

export function useMaintenanceDashboard() {
  // ---- Filter State ----
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);
  const machineDropdownRef = useRef<HTMLDivElement>(null);

  // ---- Data Queries (TanStack Query) ----
  const {
    data: maintenanceTasks = [],
    isLoading: maintenanceLoading,
    error: maintenanceError,
    refetch: refetchMaintenance,
  } = useMaintenanceDataQuery();

  const updateTaskMutation = useUpdateMaintenanceTask();
  const uploadImageMutation = useUploadMaintenanceImage();

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

  // ---- Derived filter lists ----
  const machinesList = useMemo(() => {
    const set = new Set<string>();
    maintenanceTasks.forEach((t) => {
      if (t.machine_name) set.add(t.machine_name);
    });
    return Array.from(set).sort();
  }, [maintenanceTasks]);

  // ---- Maintenance filtering ----
  const filteredMaintenanceData = useMemo(() => {
    let data = maintenanceTasks;

    // 1. Filter by Tab (Pending vs History)
    if (activeTab === "pending") {
      data = data.filter(
        (task) => !task.actual_date || task.actual_date.trim() === "",
      );
    } else {
      data = data.filter(
        (task) => task.actual_date && task.actual_date.trim() !== "",
      );
    }

    // 2. Filter by Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter((task) => {
        const searchable = [
          task.machine_name,
          task.task_description,
          task.doer_name,
          task.assigned_to,
          task.frequency,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(term);
      });
    }

    // 3. Filter by Machine
    if (selectedMachines.length > 0) {
      data = data.filter((task) => {
        const name = task.machine_name || "";
        return selectedMachines.some((machine) => name === machine);
      });
    }

    return data;
  }, [maintenanceTasks, activeTab, searchTerm, selectedMachines]);

  // ---- Active filters check ----
  const hasActiveFilters = useMemo(() => {
    return selectedMachines.length > 0 || searchTerm !== "";
  }, [selectedMachines, searchTerm]);

  // ---- Stats Calculation ----
  const maintenanceStats = useMemo<MaintenanceStats>(() => {
    const totalTasks = maintenanceTasks.length;
    const completedTasks = maintenanceTasks.filter(
      (t) => t.actual_date && t.actual_date.trim() !== "",
    ).length;
    const pendingTasks = totalTasks - completedTasks;

    const today = new Date().toISOString().split("T")[0];

    // Overdue: Start date < today and not completed
    const overdueTasks = maintenanceTasks.filter((t) => {
      if (t.actual_date && t.actual_date.trim() !== "") return false; // Completed
      if (!t.task_start_date) return false;
      return t.task_start_date < today;
    }).length;

    // Unique machines
    const distinctMachines = new Set(
      maintenanceTasks.map((t) => t.machine_name).filter(Boolean),
    ).size;

    return {
      totalMachines: distinctMachines,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
    };
  }, [maintenanceTasks]);

  // ---- Chart Data: Frequency Distribution ----
  const frequencyChartData = useMemo<FrequencyChartItem[]>(() => {
    const counts: Record<string, number> = {};
    maintenanceTasks.forEach((t) => {
      const freq = t.frequency || "Unknown";
      counts[freq] = (counts[freq] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [maintenanceTasks]);

  // ---- Chart Data: Machines with most tasks ----
  const machineChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    maintenanceTasks.forEach((t) => {
      const name = t.machine_name || "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [maintenanceTasks]);

  // ---- Dashboard Task Views (Recent / Upcoming / Overdue) ----
  const [dashboardView, setDashboardView] = useState<
    "recent" | "upcoming" | "overdue"
  >("recent");

  const dashboardTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let data = maintenanceTasks;

    // Filter by View
    if (dashboardView === "recent") {
      // Recent & Today: Start Date <= Today (and usually we might show some history, but for "Recent/Today" usually implies active context)
      // MainDashboard logic: start_date == today (or range).
      // User asked for "Today upcoming".
      // Let's interpret "Recent" as Today's tasks + Recent History?
      // Or just Today's tasks.
      // MainDashboard "recent" was: `task_start_date` == today.
      data = data.filter(
        (t) => t.task_start_date && t.task_start_date === today,
      );
    } else if (dashboardView === "upcoming") {
      // Upcoming: Start Date > Today
      data = data.filter((t) => t.task_start_date && t.task_start_date > today);
    } else if (dashboardView === "overdue") {
      // Overdue: Start Date < Today AND Not Completed
      data = data.filter((t) => {
        if (t.actual_date && t.actual_date.trim() !== "") return false; // Completed
        if (!t.task_start_date) return false;
        return t.task_start_date < today;
      });
    }

    // Apply strict sorting
    return data.sort((a, b) => {
      const dateA = a.task_start_date || "";
      const dateB = b.task_start_date || "";
      // For upcoming: ascending. For recent/overdue: descending?
      // Usually Overdue: oldest first (ascending).
      // Upcoming: soonest first (ascending).
      // Recent: newest first (descending).
      if (dashboardView === "recent") {
        return dateB.localeCompare(dateA);
      }
      return dateA.localeCompare(dateB);
    });
  }, [maintenanceTasks, dashboardView]);

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
    maintenanceError: maintenanceError
      ? maintenanceError instanceof Error
        ? maintenanceError.message
        : "Failed to load maintenance data"
      : null,
    refetchMaintenance,

    // Data
    maintenanceTasks,
    filteredMaintenanceData,
    dashboardTasks, // Exposed for dashboard table
    dashboardView,
    setDashboardView,

    // Filter state
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedMachines,
    setSelectedMachines,
    showMachineDropdown,
    setShowMachineDropdown,
    machineDropdownRef,

    // Mutations
    updateTaskMutation,
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
