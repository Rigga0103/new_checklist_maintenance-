import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPendingMaintenance,
  fetchMaintenanceHistory,
  fetchMaintenanceLast7Days,
  fetchAllOverdueMaintenance,
  fetchAllMaintenance,
  completeMaintenance,
  bulkCompleteMaintenance,
  getUniqueMachines,
  getUniqueFrequencies,
} from "../api/maintenanceApi";

// Query Keys
export const maintenanceKeys = {
  all: ["maintenance"] as const,
  pending: (
    page: number,
    limit: number,
    searchTerm: string,
    role: string | null,
    username: string | null,
    startDate?: string,
    endDate?: string,
  ) =>
    [
      ...maintenanceKeys.all,
      "pending",
      { page, limit, searchTerm, role, username, startDate, endDate },
    ] as const,
  history: (
    page: number,
    limit: number,
    searchTerm: string,
    role: string | null,
    username: string | null,
    startDate?: string,
    endDate?: string,
  ) =>
    [
      ...maintenanceKeys.all,
      "history",
      { page, limit, searchTerm, role, username, startDate, endDate },
    ] as const,
  filters: () => [...maintenanceKeys.all, "filters"] as const,
  allTasks: () => [...maintenanceKeys.all, "allTasks"] as const,
  last7days: (
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...maintenanceKeys.all,
      "last7days",
      { searchTerm, role, username },
    ] as const,
  overdue: (
    page: number,
    limit: number,
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...maintenanceKeys.all,
      "overdue",
      { page, limit, searchTerm, role, username },
    ] as const,
};

// --- Queries ---

export const usePendingMaintenanceQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
  startDate?: string,
  endDate?: string,
) => {
  return useQuery({
    queryKey: maintenanceKeys.pending(
      page,
      limit,
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchPendingMaintenance(
        page,
        limit,
        searchTerm,
        role,
        username,
        startDate,
        endDate,
      ),
    placeholderData: (previousData) => previousData,
  });
};

export const useMaintenanceHistoryQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
  startDate?: string,
  endDate?: string,
) => {
  return useQuery({
    queryKey: maintenanceKeys.history(
      page,
      limit,
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchMaintenanceHistory(
        page,
        limit,
        searchTerm,
        role,
        username,
        startDate,
        endDate,
      ),
    placeholderData: (previousData) => previousData,
  });
};

export const useMaintenanceLast7DaysQuery = (
  searchTerm: string,
  role: string | null,
  username: string | null,
) => {
  return useQuery({
    queryKey: maintenanceKeys.last7days(searchTerm, role, username),
    queryFn: () =>
      fetchMaintenanceLast7Days(1, 1000, searchTerm, role, username),
    placeholderData: (previousData) => previousData,
  });
};

export const useAllOverdueMaintenanceQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
) => {
  return useQuery({
    queryKey: maintenanceKeys.overdue(page, limit, searchTerm, role, username),
    queryFn: () =>
      fetchAllOverdueMaintenance(page, limit, searchTerm, role, username),
    placeholderData: (previousData) => previousData,
  });
};

export const useMaintenanceFiltersQuery = () => {
  return useQuery({
    queryKey: maintenanceKeys.filters(),
    queryFn: async () => {
      const [machines, frequencies] = await Promise.all([
        getUniqueMachines(),
        getUniqueFrequencies(),
      ]);
      return { machines, frequencies };
    },
    staleTime: 1000 * 60 * 5, // Cache filters for 5 minutes
  });
};

// --- Mutations ---

export const useCompleteMaintenanceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      remarks,
      imageFile,
      maintenanceCost,
    }: {
      taskId: number;
      remarks?: string;
      imageFile?: File;
      maintenanceCost?: number;
    }) => completeMaintenance(taskId, remarks, imageFile, maintenanceCost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });
};

export const useBulkCompleteMaintenanceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskIds,
      remarks,
    }: {
      taskIds: number[];
      remarks?: string;
    }) => bulkCompleteMaintenance(taskIds, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });
};

export const useAllMaintenanceQuery = () => {
  return useQuery({
    queryKey: maintenanceKeys.allTasks(),
    queryFn: () => fetchAllMaintenance(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
