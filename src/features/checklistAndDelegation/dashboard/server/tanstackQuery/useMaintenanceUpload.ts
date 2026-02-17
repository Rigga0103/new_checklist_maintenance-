import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadChecklistImage } from "../../../checklist/server/api/checklistUploadApi";
import { repairDashboardKeys } from "./useRepairDashboardQuery";

/**
 * Hook to upload maintenance image
 * Reuses checklist upload API but invalidates maintenance queries
 */
export function useUploadMaintenanceImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, taskId }: { file: File; taskId: number }) =>
      uploadChecklistImage(file, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.maintenance(),
      });
    },
    onError: (error: Error) => {
      console.error("Maintenance image upload failed:", error);
    },
  });
}
