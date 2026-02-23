"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchChecklistData,
  fetchDelegationData,
  fetchUsersData,
  deleteChecklistTasksApi,
  deleteDelegationTasksApi,
  updateChecklistTaskApi,
  updateDelegationTaskApi,
} from "../api/quickTaskApi";
import type {
  ChecklistTask,
  DelegationTask,
  ChecklistUpdatePayload,
  ChecklistOriginalMatch,
  DelegationUpdatePayload,
  DelegationOriginalMatch,
} from "../../types/types";

// ============ Query Keys ============

export const quickTaskKeys = {
  all: ["quickTask"] as const,
  checklist: (nameFilter?: string) =>
    [...quickTaskKeys.all, "checklist", nameFilter] as const,
  delegation: (nameFilter?: string) =>
    [...quickTaskKeys.all, "delegation", nameFilter] as const,
  users: () => [...quickTaskKeys.all, "users"] as const,
};

// ============ Checklist Query ============

/**
 * Paginated query for checklist tasks
 */
export function useChecklistTasksQuery(
  page = 0,
  pageSize = 50,
  nameFilter = "",
) {
  return useQuery({
    queryKey: [...quickTaskKeys.checklist(nameFilter), "paginated", page],
    queryFn: () => fetchChecklistData(page, pageSize, nameFilter),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching next page
  });
}

/**
 * Paginated query for delegation tasks
 */
export function useDelegationTasksQuery(
  page = 0,
  pageSize = 50,
  nameFilter = "",
) {
  return useQuery({
    queryKey: [...quickTaskKeys.delegation(nameFilter), "paginated", page],
    queryFn: () => fetchDelegationData(page, pageSize, nameFilter),
    placeholderData: (previousData) => previousData,
  });
}

// Keep infinite queries for backward compatibility if needed, but we will use the above in the UI
export function useChecklistTasks(nameFilter = "") {
  return useInfiniteQuery({
    queryKey: quickTaskKeys.checklist(nameFilter),
    queryFn: async ({ pageParam = 0 }) => {
      return fetchChecklistData(pageParam, 50, nameFilter);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (acc, page) => acc + page.data.length,
        0,
      );
      if (loadedCount >= lastPage.total) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
  });
}

export function flattenChecklistPages(
  data: ReturnType<typeof useChecklistTasks>["data"],
) {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.data);
}

export function useDelegationTasks(nameFilter = "") {
  return useInfiniteQuery({
    queryKey: quickTaskKeys.delegation(nameFilter),
    queryFn: async ({ pageParam = 0 }) => {
      return fetchDelegationData(pageParam, 50, nameFilter);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (acc, page) => acc + page.data.length,
        0,
      );
      if (loadedCount >= lastPage.total) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
  });
}

export function flattenDelegationPages(
  data: ReturnType<typeof useDelegationTasks>["data"],
) {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.data);
}

// ============ Users Query ============

/**
 * Query for users list (filter dropdown)
 */
export function useUsers() {
  return useQuery({
    queryKey: quickTaskKeys.users(),
    queryFn: fetchUsersData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ Mutations ============

/**
 * Delete checklist tasks mutation
 */
export function useDeleteChecklistTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tasks: ChecklistTask[]) => deleteChecklistTasksApi(tasks),
    onSuccess: () => {
      // Invalidate all checklist queries to refetch
      queryClient.invalidateQueries({ queryKey: quickTaskKeys.checklist() });
    },
  });
}

/**
 * Delete delegation tasks mutation
 */
export function useDeleteDelegationTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tasks: DelegationTask[]) => deleteDelegationTasksApi(tasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickTaskKeys.delegation() });
    },
  });
}

/**
 * Update checklist task mutation
 */
export function useUpdateChecklistTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      updatedTask,
      originalTask,
    }: {
      updatedTask: ChecklistUpdatePayload;
      originalTask: ChecklistOriginalMatch;
    }) => updateChecklistTaskApi(updatedTask, originalTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickTaskKeys.checklist() });
    },
  });
}

/**
 * Update delegation task mutation
 */
export function useUpdateDelegationTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      updatedTask,
      originalTask,
    }: {
      updatedTask: DelegationUpdatePayload;
      originalTask: DelegationOriginalMatch;
    }) => updateDelegationTaskApi(updatedTask, originalTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickTaskKeys.delegation() });
    },
  });
}
