import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchChecklistApprovalData,
  fetchDelegationApprovalData,
  updateAdminStatus,
  markMultipleAsDone,
} from "../api/approvalApi";
import { ApprovalTask } from "../../types/types";
import { toast } from "sonner";

// Query keys
export const approvalKeys = {
  all: ["approval"] as const,
  checklist: (role: string | null, username: string | null) =>
    [...approvalKeys.all, "checklist", role, username] as const,
  delegation: (role: string | null, username: string | null) =>
    [...approvalKeys.all, "delegation", role, username] as const,
};

// Hook to fetch checklist approval data
export function useChecklistApproval(
  role: string | null = null,
  username: string | null = null,
) {
  return useQuery({
    queryKey: approvalKeys.checklist(role, username),
    queryFn: () => fetchChecklistApprovalData(username, role),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to fetch delegation approval data
export function useDelegationApproval(
  role: string | null = null,
  username: string | null = null,
) {
  return useQuery({
    queryKey: approvalKeys.delegation(role, username),
    queryFn: () => fetchDelegationApprovalData(username, role),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook to update admin status for a single task
export function useUpdateAdminStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      status,
      sheetType,
    }: {
      taskId: string | number;
      status: string;
      sheetType: "checklist" | "delegation";
    }) => updateAdminStatus(taskId, status, sheetType),
    onSuccess: () => {
      toast.success("Admin status updated successfully!");
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// Hook to mark multiple tasks as done
export function useMarkMultipleDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      checklistTaskIds,
      delegationTaskIds,
    }: {
      checklistTaskIds: (string | number)[];
      delegationTaskIds: (string | number)[];
    }) => markMultipleAsDone(checklistTaskIds, delegationTaskIds),
    onSuccess: (_, variables) => {
      const total =
        variables.checklistTaskIds.length + variables.delegationTaskIds.length;
      toast.success(`Successfully marked ${total} items as Admin Done!`);
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark tasks as done: ${error.message}`);
    },
  });
}
