"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useDashboardSummary,
  useDashboardData,
  useDepartments,
  useStaffNames,
  useStaffTaskSummary,
} from "../server/tanstackQuery/useDashboardQuery";
import type {
  DepartmentData,
  DashboardType,
  FilterStatus,
  DateRange,
  Task,
  StaffTaskData,
} from "../types/types";

const initialDepartmentData: DepartmentData = {
  allTasks: [],
  staffMembers: [],
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  overdueTasks: 0,
  completionRate: 0,
  barChartData: [],
  pieChartData: [],
  completedRatingOne: 0,
  completedRatingTwo: 0,
  completedRatingThreePlus: 0,
};

export function useDashboard() {
  const [dashboardType, setDashboardType] =
    useState<DashboardType>("checklist");
  const [taskView, setTaskView] = useState<"recent" | "upcoming" | "overdue">(
    "recent",
  );
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardStaffFilter, setDashboardStaffFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    filtered: false,
  });

  // Get user info from localStorage with safe window check
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "user";
  });
  const [username, setUsername] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user-name") || "";
  });

  // Re-sync if localStorage changes via storage event (safe way to handle cross-tab or external changes)
  useEffect(() => {
    const handleStorageChange = () => {
      const role = localStorage.getItem("role") || "user";
      const name = localStorage.getItem("user-name") || "";
      if (role !== userRole) setUserRole(role);
      if (name !== username) setUsername(name);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [userRole, username]);

  // ============ Real Data Queries ============

  // Fetch dashboard summary (stats)
  const { data: summaryData, isLoading: isSummaryLoading } =
    useDashboardSummary(
      dashboardType,
      dashboardStaffFilter !== "all" ? dashboardStaffFilter : undefined,
      departmentFilter !== "all" ? departmentFilter : undefined,
      userRole,
      username,
    );

  // Fetch task list data (based on taskView)
  const { data: tasksData, isLoading: isTasksLoading } = useDashboardData(
    dashboardType,
    taskView,
    dashboardStaffFilter !== "all" ? dashboardStaffFilter : undefined,
    departmentFilter !== "all" ? departmentFilter : undefined,
    userRole,
    username,
  );

  // Fetch Staff Task Summary
  const { data: staffTaskSummary, isLoading: isStaffSummaryLoading } =
    useStaffTaskSummary(
      dashboardType,
      departmentFilter !== "all" ? departmentFilter : undefined,
    );

  // Fetch departments for filter
  const { data: departmentsData } = useDepartments();

  // Fetch staff names for filter
  const { data: staffData } = useStaffNames(
    departmentFilter !== "all" ? departmentFilter : undefined,
  );

  // ============ Derived State ============

  const isLoading = isSummaryLoading || isTasksLoading;

  const availableDepartments = departmentsData || [];
  const availableStaff = staffData || [];

  // Transform tasks data to match expected format
  const filteredTasks: Task[] = useMemo(() => {
    if (!tasksData) return [];
    return tasksData.map((task: Record<string, unknown>) => {
      const taskStartDate = (task.task_start_date as string) || "";
      const today = new Date().toISOString().split("T")[0];

      // Determine status
      let status: "pending" | "completed" | "overdue" = "pending";
      if (dashboardType === "checklist") {
        if (task.status === "yes" || task.status === "Yes") {
          status = "completed";
        } else if (
          taskStartDate &&
          taskStartDate < today &&
          !task.submission_date
        ) {
          status = "overdue";
        }
      } else {
        if (
          task.status === "done" ||
          task.status === "Done" ||
          task.submission_date
        ) {
          status = "completed";
        } else if (
          taskStartDate &&
          taskStartDate < today &&
          !task.submission_date
        ) {
          status = "overdue";
        }
      }

      return {
        id: String(task.task_id || task.id),
        title: (task.task_description || task.description || "") as string,
        assignedTo: (task.name || "") as string,
        taskStartDate: formatDisplayDate(taskStartDate),
        originalTaskStartDate: taskStartDate,
        submission_date: task.submission_date as string | null,
        status,
        frequency: (task.frequency || "one-time") as string,
        rating: (task.rating || 0) as number,
      };
    });
  }, [tasksData, dashboardType]);

  // Build department data from real data (Stats)
  const departmentData: DepartmentData = useMemo(() => {
    if (!summaryData) return initialDepartmentData;

    return {
      ...initialDepartmentData,
      totalTasks: summaryData.totalTasks,
      completedTasks: summaryData.completedTasks,
      pendingTasks: summaryData.pendingTasks,
      overdueTasks: summaryData.overdueTasks,
      completionRate: summaryData.completionRate,
      staffMembers: [], // Not used for stats directly in this view
      allTasks: [], // Not used for stats directly
    };
  }, [summaryData]);

  const handleDateRangeChange = useCallback(
    (startDate: string, endDate: string | null) => {
      if (startDate && endDate) {
        setDateRange({
          startDate,
          endDate,
          filtered: true,
        });
      } else {
        setDateRange({
          startDate: "",
          endDate: "",
          filtered: false,
        });
      }
    },
    [],
  );

  return {
    // State
    dashboardType,
    taskView,
    filterStatus,
    filterStaff,
    searchQuery,
    activeTab,
    dashboardStaffFilter,
    availableStaff,
    departmentFilter,
    availableDepartments,
    isLoading,
    departmentData,
    dateRange,
    userRole,
    username,
    filteredTasks,
    staffTaskSummary: (staffTaskSummary as StaffTaskData[]) || [],
    isStaffSummaryLoading,

    // Actions
    setDashboardType,
    setTaskView,
    setFilterStatus,
    setFilterStaff,
    setSearchQuery,
    setActiveTab,
    setDashboardStaffFilter,
    setDepartmentFilter,
    handleDateRangeChange,
  };
}

// Helper function to format date for display
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
