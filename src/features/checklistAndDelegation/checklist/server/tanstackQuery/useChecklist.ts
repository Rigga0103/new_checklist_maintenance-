"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchChecklistDataSortByDate,
  fetchChecklistDataForHistory,
  updateChecklistData,
  postChecklistAdminDone,
} from "../api/checklistApi";
import type { ChecklistItem, ChecklistSubmissionItem } from "../../types/types";

// ============ Query Keys ============

export const checklistKeys = {
  all: ["checklist"] as const,
  active: (searchTerm: string, role: string | null, username: string | null) =>
    [...checklistKeys.all, "active", searchTerm, role, username] as const,
  history: (searchTerm: string, role: string | null, username: string | null) =>
    [...checklistKeys.all, "history", searchTerm, role, username] as const,
};

// ============ Active Checklist Query ============

/**
 * Infinite query for active checklist tasks (pending)
 * Shows skeleton loading during initial fetch
 */
export function useActiveChecklist(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
) {
  return useInfiniteQuery({
    queryKey: checklistKeys.active(searchTerm, role, username),
    queryFn: async ({ pageParam = 1 }) => {
      return fetchChecklistDataSortByDate(
        pageParam,
        1000,
        searchTerm,
        role,
        username,
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (acc, page) => acc + page.data.length,
        0,
      );
      if (loadedCount >= lastPage.totalCount) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
  });
}

/**
 * Helper to flatten infinite query pages
 */
export function flattenChecklistPages(
  data: ReturnType<typeof useActiveChecklist>["data"],
): ChecklistItem[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.data);
}

// ============ History Query ============

/**
 * Infinite query for checklist history (completed)
 */
export function useChecklistHistory(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
) {
  return useInfiniteQuery({
    queryKey: checklistKeys.history(searchTerm, role, username),
    queryFn: async ({ pageParam = 1 }) => {
      const data = await fetchChecklistDataForHistory(
        pageParam,
        searchTerm,
        role,
        username,
      );
      return { data, page: pageParam };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < 50) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
  });
}

// ============ Mutations ============

/**
 * Submit checklist tasks mutation
 */
export function useSubmitChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (submissionData: ChecklistSubmissionItem[]) =>
      updateChecklistData(submissionData),
    onSuccess: () => {
      // Invalidate both active and history queries
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
}

/**
 * Mark tasks as admin done mutation
 */
export function useMarkAdminDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (selectedItems: ChecklistItem[] | number[]) =>
      postChecklistAdminDone(selectedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
    },
  });
}
