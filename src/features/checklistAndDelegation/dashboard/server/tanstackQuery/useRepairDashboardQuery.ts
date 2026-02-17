import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRepairData,
  fetchMaintenanceData,
  updateMaintenanceTask,
  MachineMaintenanceTask,
} from "../api/repairDashboardApi";

// Query Keys
export const repairDashboardKeys = {
  all: ["repairDashboard"] as const,
  repairs: () => [...repairDashboardKeys.all, "repairs"] as const,
  maintenance: () => [...repairDashboardKeys.all, "maintenance"] as const,
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
 * Fetch all maintenance data for the dashboard
 */
export function useMaintenanceDataQuery() {
  return useQuery({
    queryKey: repairDashboardKeys.maintenance(),
    queryFn: fetchMaintenanceData,
    staleTime: 1000 * 60 * 2, // 2 minutes
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
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.maintenance(),
      });
    },
  });
}
