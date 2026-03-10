"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchChecklistDataSortByDate,
  fetchChecklistDataForHistory,
  fetchChecklistLast7Days,
  fetchChecklistUpcoming7Days,
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
  last7days: (
    searchTerm: string,
    role: string | null,
    username: string | null,
    nameFilter: string,
  ) =>
    [
      ...checklistKeys.all,
      "last7days",
      searchTerm,
      role,
      username,
      nameFilter,
    ] as const,
  upcoming7days: (
    searchTerm: string,
    role: string | null,
    username: string | null,
    nameFilter: string,
  ) =>
    [
      ...checklistKeys.all,
      "upcoming7days",
      searchTerm,
      role,
      username,
      nameFilter,
    ] as const,
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

// ============ Last 7 Days Query ============

/**
 * Query for checklist tasks from the most recent Monday-Saturday
 */
export function useChecklistLast7Days(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  nameFilter = "",
) {
  return useQuery({
    queryKey: checklistKeys.last7days(searchTerm, role, username, nameFilter),
    queryFn: async () => {
      const result = await fetchChecklistLast7Days(
        1,
        1000,
        searchTerm,
        role,
        username,
        nameFilter,
      );
      return result;
    },
  });
}

// ============ Upcoming 7 Days Query ============

/**
 * Query for checklist tasks scheduled for the next 7 days
 */
export function useChecklistUpcoming7Days(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  nameFilter = "",
) {
  return useQuery({
    queryKey: checklistKeys.upcoming7days(
      searchTerm,
      role,
      username,
      nameFilter,
    ),
    queryFn: async () => {
      const result = await fetchChecklistUpcoming7Days(
        1,
        1000,
        searchTerm,
        role,
        username,
        nameFilter,
      );
      return result;
    },
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
