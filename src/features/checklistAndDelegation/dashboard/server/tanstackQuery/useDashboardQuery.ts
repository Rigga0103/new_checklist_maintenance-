"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardDataApi,
  getDashboardSummaryApi,
  getUniqueDepartmentsApi,
  getStaffNamesApi,
  getTotalUsersCountApi,
  getStaffTaskSummaryApi,
} from "../api/dashboardApi";
import type { DashboardType, TaskView } from "../../types/types";

// ============ Query Keys ============

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (
    type: DashboardType,
    staff?: string,
    dept?: string,
    start?: string | null,
    end?: string | null,
  ) =>
    [...dashboardKeys.all, "summary", type, staff, dept, start, end] as const,
  data: (
    type: DashboardType,
    view: TaskView,
    staff?: string,
    dept?: string,
    start?: string | null,
    end?: string | null,
  ) =>
    [
      ...dashboardKeys.all,
      "data",
      type,
      view,
      staff,
      dept,
      start,
      end,
    ] as const,
  departments: () => [...dashboardKeys.all, "departments"] as const,
  staff: (dept?: string) => [...dashboardKeys.all, "staff", dept] as const,
  usersCount: (dept?: string) =>
    [...dashboardKeys.all, "usersCount", dept] as const,
};

// ============ Dashboard Summary ============

/**
 * Query for dashboard summary stats (total, completed, pending, overdue)
 * Shows skeleton loading during initial fetch
 */
export function useDashboardSummary(
  dashboardType: DashboardType,
  staffFilter?: string,
  departmentFilter?: string,
  role?: string | null,
  username?: string | null,
  startDate?: string | null,
  endDate?: string | null,
) {
  return useQuery({
    queryKey: dashboardKeys.summary(
      dashboardType,
      staffFilter,
      departmentFilter,
      startDate,
      endDate,
    ),
    queryFn: () =>
      getDashboardSummaryApi(
        dashboardType,
        staffFilter,
        departmentFilter,
        role,
        username,
        startDate,
        endDate,
      ),
    enabled: dashboardType !== "repair",
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============ Dashboard Data ============

/**
 * Query for dashboard task list with filters
 */
export function useDashboardData(
  dashboardType: DashboardType,
  taskView: TaskView = "recent",
  staffFilter?: string,
  departmentFilter?: string,
  role?: string | null,
  username?: string | null,
  page = 1,
  limit = 1000,
  startDate?: string | null,
  endDate?: string | null,
) {
  return useQuery({
    queryKey: dashboardKeys.data(
      dashboardType,
      taskView,
      staffFilter,
      departmentFilter,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchDashboardDataApi({
        dashboardType,
        staffFilter,
        page,
        limit,
        taskView,
        departmentFilter,
        role,
        username,
        startDate,
        endDate,
      }),
    enabled: dashboardType !== "repair",
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============ Filter Options ============

/**
 * Query for unique departments list
 */
export function useDepartments() {
  return useQuery({
    queryKey: dashboardKeys.departments(),
    queryFn: getUniqueDepartmentsApi,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query for staff names filtered by department
 */
export function useStaffNames(departmentFilter?: string) {
  return useQuery({
    queryKey: dashboardKeys.staff(departmentFilter),
    queryFn: () => getStaffNamesApi(departmentFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query for total users count
 */
export function useTotalUsersCount(departmentFilter?: string) {
  return useQuery({
    queryKey: dashboardKeys.usersCount(departmentFilter),
    queryFn: () => getTotalUsersCountApi(departmentFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query for staff task summary
 */
export function useStaffTaskSummary(
  dashboardType: DashboardType,
  departmentFilter?: string,
) {
  return useQuery({
    queryKey: [
      ...dashboardKeys.all,
      "staffSummary",
      dashboardType,
      departmentFilter,
    ],
    queryFn: () => getStaffTaskSummaryApi(dashboardType, departmentFilter),
    enabled: dashboardType !== "repair",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
