import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPendingRepairs,
  fetchAllOverdueRepairing,
  fetchRepairHistory,
  processRepair,
  createRepairRequest,
  fetchActiveUserNames,
  getUniqueMachines,
  getUniqueAssignedPersons,
  fetchPartsAndVendors,
  getUniqueVendors,
  getUniqueParts,
  fetchRepairLast7Days,
  fetchAMCRepairs,
  fetchPartPurchasePending,
  fetchPendingIndent,
} from "../api/repairingApi";
import type { PendingIndentFetchResponse } from "../api/repairingApi";
import type {
  RepairProcessFormData,
  RepairRequestFormData,
} from "../../../types/types";

// Query Keys
export const repairingKeys = {
  all: ["repairs"] as const,
  overdue: (
    page: number,
    limit: number,
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairingKeys.all,
      "overdue",
      { page, limit, searchTerm, role, username },
    ] as const,
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
      ...repairingKeys.all,
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
      ...repairingKeys.all,
      "history",
      { page, limit, searchTerm, role, username, startDate, endDate },
    ] as const,
  last7days: (
    page: number,
    limit: number,
    searchTerm: string,
    role: string | null,
    username: string | null,
    startDate?: string,
    endDate?: string,
  ) =>
    [
      ...repairingKeys.all,
      "last7days",
      { page, limit, searchTerm, role, username, startDate, endDate },
    ] as const,
  amc: (page: number, limit: number, searchTerm: string) =>
    [...repairingKeys.all, "amc", { page, limit, searchTerm }] as const,
  filters: () => [...repairingKeys.all, "filters"] as const,
  partsAndVendors: (
    page: number,
    limit: number,
    searchTerm: string,
    vendorFilter: string,
    partFilter: string,
  ) =>
    [
      ...repairingKeys.all,
      "partsAndVendors",
      { page, limit, searchTerm, vendorFilter, partFilter },
    ] as const,
  partsAndVendorsFilters: () =>
    [...repairingKeys.all, "partsAndVendorsFilters"] as const,
  partPurchasePending: (page: number, limit: number, searchTerm: string) =>
    [...repairingKeys.all, "partPurchasePending", { page, limit, searchTerm }] as const,
  pendingIndent: (page: number, limit: number, searchTerm: string) =>
    [...repairingKeys.all, "pendingIndent", { page, limit, searchTerm }] as const,
};

// --- Queries ---

export const useActiveUserNamesQuery = () => {
  return useQuery({
    queryKey: [...repairingKeys.all, "activeUsers"] as const,
    queryFn: fetchActiveUserNames,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAllOverdueRepairingQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
) => {
  return useQuery({
    queryKey: repairingKeys.overdue(page, limit, searchTerm, role, username),
    queryFn: () =>
      fetchAllOverdueRepairing(page, limit, searchTerm, role, username),
    placeholderData: (previousData) => previousData,
  });
};

export const usePendingRepairsQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
  startDate?: string,
  endDate?: string,
) => {
  return useQuery({
    queryKey: repairingKeys.pending(
      page,
      limit,
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchPendingRepairs(
        page,
        limit,
        searchTerm,
        role,
        username,
        startDate,
        endDate,
      ),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
};

export const useRepairHistoryQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
  startDate?: string,
  endDate?: string,
) => {
  return useQuery({
    queryKey: repairingKeys.history(
      page,
      limit,
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchRepairHistory(
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

export const useRepairLast7DaysQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  role: string | null,
  username: string | null,
  startDate?: string,
  endDate?: string,
) => {
  return useQuery({
    queryKey: repairingKeys.last7days(
      page,
      limit,
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchRepairLast7Days(page, limit, searchTerm, role, username, {
        startDate,
        endDate,
      }),
    placeholderData: (previousData) => previousData,
  });
};

export const useAMCRepairsQuery = (
  page: number,
  limit: number,
  searchTerm: string,
) => {
  return useQuery({
    queryKey: repairingKeys.amc(page, limit, searchTerm),
    queryFn: () => fetchAMCRepairs(page, limit, searchTerm),
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

export const usePartsAndVendorsQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  vendorFilter: string,
  partFilter: string,
) => {
  return useQuery({
    queryKey: repairingKeys.partsAndVendors(
      page,
      limit,
      searchTerm,
      vendorFilter,
      partFilter,
    ),
    queryFn: () =>
      fetchPartsAndVendors(page, limit, searchTerm, vendorFilter, partFilter),
    placeholderData: (previousData) => previousData,
  });
};

export const usePartsAndVendorsFiltersQuery = () => {
  return useQuery({
    queryKey: repairingKeys.partsAndVendorsFilters(),
    queryFn: async () => {
      const [vendors, parts] = await Promise.all([
        getUniqueVendors(),
        getUniqueParts(),
      ]);
      return { vendors, parts };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const usePartPurchasePendingQuery = (
  page: number,
  limit: number,
  searchTerm: string,
) => {
  return useQuery({
    queryKey: repairingKeys.partPurchasePending(page, limit, searchTerm),
    queryFn: () => fetchPartPurchasePending(page, limit, searchTerm),
    placeholderData: (previousData) => previousData,
  });
};

export const usePendingIndentQuery = (
  page: number,
  limit: number,
  searchTerm: string,
) => {
  return useQuery({
    queryKey: repairingKeys.pendingIndent(page, limit, searchTerm),
    queryFn: () => fetchPendingIndent(page, limit, searchTerm),
    placeholderData: (previousData) => previousData,
  });
};

// --- Mutations ---

export const useCreateRepairRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RepairRequestFormData) => createRepairRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairingKeys.all,
      });
    },
  });
};

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
