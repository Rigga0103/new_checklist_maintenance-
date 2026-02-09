import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPendingRepairs,
  fetchRepairHistory,
  processRepair,
  getUniqueMachines,
  getUniqueAssignedPersons,
} from "../api/repairingApi";
import type { RepairProcessFormData } from "../../../types/types";

// Query Keys
export const repairingKeys = {
  all: ["repairs"] as const,
  pending: (
    page: number,
    limit: number,
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairingKeys.all,
      "pending",
      { page, limit, searchTerm, role, username },
    ] as const,
  history: (
    page: number,
    limit: number,
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairingKeys.all,
      "history",
      { page, limit, searchTerm, role, username },
    ] as const,
  filters: () => [...repairingKeys.all, "filters"] as const,
};

// --- Queries ---

export const usePendingRepairsQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
) => {
  return useQuery({
    queryKey: repairingKeys.pending(page, limit, searchTerm, role, username),
    queryFn: () => fetchPendingRepairs(page, limit, searchTerm, role, username),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
};

export const useRepairHistoryQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
) => {
  return useQuery({
    queryKey: repairingKeys.history(page, limit, searchTerm, role, username),
    queryFn: () => fetchRepairHistory(page, limit, searchTerm, role, username),
    placeholderData: (previousData) => previousData,
  });
};

export const useRepairFiltersQuery = () => {
  return useQuery({
    queryKey: repairingKeys.filters(),
    queryFn: async () => {
      const [machines, persons] = await Promise.all([
        getUniqueMachines(),
        getUniqueAssignedPersons(),
      ]);
      return { machines, persons };
    },
    staleTime: 1000 * 60 * 5, // Cache filters for 5 minutes
  });
};

// --- Mutations ---

export const useProcessRepairMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      data,
      photoFile,
      billFile,
    }: {
      taskId: number;
      data: RepairProcessFormData;
      photoFile?: File;
      billFile?: File;
    }) => processRepair(taskId, data, photoFile, billFile),
    onSuccess: () => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({
        queryKey: ["repairs"], // Invalidate all repairs (pending and history could change)
      });
    },
  });
};
