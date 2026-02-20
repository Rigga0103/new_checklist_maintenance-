import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRepairData,
  fetchMaintenanceData,
  fetchMaintenancePending,
  fetchMaintenanceHistory,
  updateMaintenanceTask,
  MachineMaintenanceTask,
} from "../api/repairDashboardApi";

// Query Keys
export const repairDashboardKeys = {
  all: ["repairDashboard"] as const,
  repairs: () => [...repairDashboardKeys.all, "repairs"] as const,
  maintenance: () => [...repairDashboardKeys.all, "maintenance"] as const,
  maintenancePending: (
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenancePending",
      searchTerm,
      role,
      username,
    ] as const,
  maintenanceHistory: (
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenanceHistory",
      searchTerm,
      role,
      username,
    ] as const,
};

/**
 * Fetch all repair data for the dashboard
 */
export function useRepairDataQuery() {
  return useQuery({
    queryKey: repairDashboardKeys.repairs(),
    queryFn: fetchRepairData,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch all maintenance data for the dashboard (charts/stats)
 */
export function useMaintenanceDataQuery() {
  return useQuery({
    queryKey: repairDashboardKeys.maintenance(),
    queryFn: fetchMaintenanceData,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch today's pending maintenance tasks (filtered by date + user)
 */
export function useMaintenancePendingQuery(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenancePending(
      searchTerm,
      role,
      username,
    ),
    queryFn: () => fetchMaintenancePending(searchTerm, role, username),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch completed maintenance tasks (history, filtered by user)
 */
export function useMaintenanceHistoryQuery(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenanceHistory(
      searchTerm,
      role,
      username,
    ),
    queryFn: () => fetchMaintenanceHistory(searchTerm, role, username),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Update a maintenance task
 */
export function useUpdateMaintenanceTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<MachineMaintenanceTask>;
    }) => updateMaintenanceTask(id, updates),
    onSuccess: () => {
      // Invalidate all maintenance queries (pending, history, and dashboard)
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}
