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
} from "../api/quickTaskApi";
import type {
  ChecklistTask,
  DelegationTask,
  ChecklistUpdatePayload,
  ChecklistOriginalMatch,
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
 * Infinite query for checklist tasks with pagination
 * Shows skeleton loading during initial fetch
 */
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

/**
 * Helper to flatten infinite query pages into single array
 */
export function flattenChecklistPages(
  data: ReturnType<typeof useChecklistTasks>["data"],
) {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.data);
}

// ============ Delegation Query ============

/**
 * Infinite query for delegation tasks with pagination
 */
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

/**
 * Helper to flatten infinite query pages into single array
 */
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
    mutationFn: (taskIds: number[]) => deleteDelegationTasksApi(taskIds),
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
