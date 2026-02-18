"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRepairDataQuery } from "../server/tanstackQuery/useRepairDashboardQuery";

const COLORS = [
  "#22c55e",
  "#facc15",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

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

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status: string | undefined): string {
  if (!status)
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  const s = status.toLowerCase();
  if (s.includes("completed") || s.includes("done") || s.includes("पूर्ण"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (s.includes("progress"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  if (s.includes("observation"))
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
  if (s.includes("temporary"))
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
  if (s.includes("cancel"))
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
}

// ============ Chart Data Types ============

export interface MachineChartItem {
  name: string;
  fullName: string;
  repairs: number;
}

export interface StatusChartItem {
  name: string;
  fullName: string;
  value: number;
  color: string;
}

export interface MonthlyTrendItem {
  month: string;
  repairs: number;
  cost: number;
}

export interface AssignedToChartItem {
  name: string;
  fullName: string;
  tasks: number;
}

export interface MonthOption {
  value: string;
  label: string;
}

export interface RepairStats {
  totalRepairs: number;
  totalCost: number;
  completedRepairs: number;
  pendingRepairs: number;
  inProgressRepairs: number;
  avgCostPerRepair: number;
}

// ============ Main Hook ============

export function useRepairingDashboard() {
  // ---- Filter State ----
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAssignedTo, setSelectedAssignedTo] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [selectedPart, setSelectedPart] = useState("all");
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);
  const machineDropdownRef = useRef<HTMLDivElement>(null);

  // ---- Data Queries (TanStack Query) ----
  const {
    data: repairData = [],
    isLoading: repairLoading,
    error: repairError,
    refetch: refetchRepairs,
  } = useRepairDataQuery();

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
    repairData.forEach((r) => {
      if (r.machine_name) set.add(r.machine_name);
    });
    return Array.from(set).sort();
  }, [repairData]);

  const statusList = useMemo(() => {
    const set = new Set<string>();
    repairData.forEach((r) => {
      if (r.status) set.add(r.status);
    });
    return Array.from(set).sort();
  }, [repairData]);

  const assignedToList = useMemo(() => {
    const set = new Set<string>();
    repairData.forEach((r) => {
      if (r.assigned_to) set.add(r.assigned_to);
    });
    return Array.from(set).sort();
  }, [repairData]);

  const vendorsList = useMemo(() => {
    const set = new Set<string>();
    repairData.forEach((r) => {
      if (r.vendor_name) set.add(r.vendor_name);
    });
    return Array.from(set).sort();
  }, [repairData]);

  const partsList = useMemo(() => {
    const set = new Set<string>();
    repairData.forEach((r) => {
      if (r.part_replaced) set.add(r.part_replaced);
    });
    return Array.from(set).sort();
  }, [repairData]);

  const monthsList = useMemo<MonthOption[]>(() => {
    const monthlyMap: Record<string, boolean> = {};
    repairData.forEach((row) => {
      const date = parseDateFromString(row.created_at);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = true;
      }
    });
    return Object.keys(monthlyMap)
      .sort()
      .reverse()
      .map((key) => ({
        value: key,
        label: new Date(key + "-01").toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      }));
  }, [repairData]);

  // ---- Filtered repair data ----
  const filteredData = useMemo(() => {
    return repairData.filter((item) => {
      const searchString = [
        item.task_id,
        item.machine_name,
        item.issue_detail,
        item.assigned_to,
        item.vendor_name,
        item.part_replaced,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchTerm
        ? searchString.includes(searchTerm.toLowerCase())
        : true;

      const matchesMachine =
        selectedMachines.length > 0
          ? selectedMachines.includes(item.machine_name || "")
          : true;

      const matchesStatus =
        selectedStatus !== "all" ? item.status === selectedStatus : true;

      const matchesAssignedTo =
        selectedAssignedTo !== "all"
          ? item.assigned_to === selectedAssignedTo
          : true;

      const matchesVendor =
        selectedVendor !== "all" ? item.vendor_name === selectedVendor : true;

      const matchesPart =
        selectedPart !== "all" ? item.part_replaced === selectedPart : true;

      let matchesMonth = true;
      if (selectedMonth !== "all") {
        const itemDate = parseDateFromString(item.created_at);
        if (itemDate) {
          const itemMonthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
          matchesMonth = itemMonthKey === selectedMonth;
        } else {
          matchesMonth = false;
        }
      }

      let matchesDateRange = true;
      if (startDate || endDate) {
        const itemDate = parseDateFromString(item.created_at);
        if (!itemDate) return false;
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (itemDate < s) matchesDateRange = false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (itemDate > e) matchesDateRange = false;
        }
      }

      return (
        matchesSearch &&
        matchesMachine &&
        matchesMonth &&
        matchesStatus &&
        matchesAssignedTo &&
        matchesVendor &&
        matchesPart &&
        matchesDateRange
      );
    });
  }, [
    repairData,
    searchTerm,
    selectedMachines,
    selectedStatus,
    selectedAssignedTo,
    selectedMonth,
    selectedVendor,
    selectedPart,
    startDate,
    endDate,
  ]);

  // ---- Repair stats ----
  const filteredRepairStats = useMemo<RepairStats>(() => {
    const total = filteredData.length;
    const totalCost = filteredData.reduce(
      (sum, item) => sum + (item.bill_amount || 0),
      0,
    );
    const completedRepairs = filteredData.filter(
      (item) =>
        item.status?.toLowerCase().includes("completed") ||
        item.status?.toLowerCase().includes("done"),
    ).length;
    const inProgressRepairs = filteredData.filter((item) =>
      item.status?.toLowerCase().includes("progress"),
    ).length;

    return {
      totalRepairs: total,
      totalCost,
      completedRepairs,
      pendingRepairs: total - completedRepairs,
      inProgressRepairs,
      avgCostPerRepair: total > 0 ? totalCost / total : 0,
    };
  }, [filteredData]);

  // ---- Chart data ----
  const machineChartData = useMemo<MachineChartItem[]>(() => {
    const counts: Record<string, number> = {};
    repairData.forEach((r) => {
      if (r.machine_name)
        counts[r.machine_name] = (counts[r.machine_name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, repairs]) => ({
        name: name.length > 20 ? name.substring(0, 20) + "..." : name,
        fullName: name,
        repairs,
      }))
      .sort((a, b) => b.repairs - a.repairs)
      .slice(0, 10);
  }, [repairData]);

  const statusChartData = useMemo<StatusChartItem[]>(() => {
    const counts: Record<string, number> = {};
    repairData.forEach((r) => {
      const s = r.status || "Pending";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], index) => ({
      name: name.length > 20 ? name.substring(0, 20) + "..." : name,
      fullName: name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [repairData]);

  const monthlyTrendData = useMemo<MonthlyTrendItem[]>(() => {
    const monthlyMap: Record<string, { repairs: number; cost: number }> = {};
    repairData.forEach((row) => {
      const date = parseDateFromString(row.created_at);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyMap[key]) monthlyMap[key] = { repairs: 0, cost: 0 };
        monthlyMap[key].repairs += 1;
        monthlyMap[key].cost += row.bill_amount || 0;
      }
    });
    return Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        repairs: data.repairs,
        cost: Math.round(data.cost / 1000),
      }));
  }, [repairData]);

  const assignedToChartData = useMemo<AssignedToChartItem[]>(() => {
    const counts: Record<string, number> = {};
    repairData.forEach((r) => {
      if (r.assigned_to)
        counts[r.assigned_to] = (counts[r.assigned_to] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, tasks]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        fullName: name,
        tasks,
      }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 8);
  }, [repairData]);

  // ---- Active filters check ----
  const hasActiveFilters = useMemo(() => {
    return (
      selectedMachines.length > 0 ||
      selectedStatus !== "all" ||
      selectedAssignedTo !== "all" ||
      selectedMonth !== "all" ||
      selectedVendor !== "all" ||
      selectedPart !== "all" ||
      searchTerm !== "" ||
      startDate !== "" ||
      endDate !== ""
    );
  }, [
    selectedMachines,
    selectedStatus,
    selectedAssignedTo,
    selectedMonth,
    selectedVendor,
    selectedPart,
    searchTerm,
    startDate,
    endDate,
  ]);

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
    setSelectedStatus("all");
    setSelectedAssignedTo("all");
    setSelectedMonth("all");
    setSelectedVendor("all");
    setSelectedPart("all");
    setStartDate("");
    setEndDate("");
    setShowMachineDropdown(false);
  }, []);

  return {
    // Loading & Error
    repairLoading,
    repairError: repairError
      ? repairError instanceof Error
        ? repairError.message
        : "Failed to load repair data"
      : null,
    refetchRepairs,

    // Raw data
    repairData,
    filteredData,

    // Filter state
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedMachines,
    selectedStatus,
    setSelectedStatus,
    selectedAssignedTo,
    setSelectedAssignedTo,
    selectedMonth,
    setSelectedMonth,
    selectedVendor,
    setSelectedVendor,
    selectedPart,
    setSelectedPart,
    showMachineDropdown,
    setShowMachineDropdown,
    machineDropdownRef,

    // Filter options
    machinesList,
    statusList,
    assignedToList,
    monthsList,
    vendorsList,
    partsList,
    hasActiveFilters,

    // Stats
    filteredRepairStats,

    // Chart data
    machineChartData,
    statusChartData,
    monthlyTrendData,
    assignedToChartData,

    // Actions
    handleMachineSelection,
    resetFilters,
  };
}
