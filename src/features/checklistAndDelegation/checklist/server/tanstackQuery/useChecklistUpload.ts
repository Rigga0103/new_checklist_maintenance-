import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadChecklistImage,
  deleteChecklistImage,
} from "../api/checklistUploadApi";

/**
 * Hook to upload checklist image
 * Returns mutation with loading states and error handling
 */
export function useUploadChecklistImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, taskId }: { file: File; taskId: number }) =>
      uploadChecklistImage(file, taskId),
    onSuccess: () => {
      // Invalidate checklist queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["checklist"] });
    },
    onError: (error: Error) => {
      console.error("Image upload failed:", error);
    },
  });
}

/**
 * Hook to delete checklist image
 * Returns mutation with loading states and error handling
 */
export function useDeleteChecklistImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageUrl: string) => deleteChecklistImage(imageUrl),
    onSuccess: () => {
      // Invalidate checklist queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["checklist"] });
    },
    onError: (error: Error) => {
      console.error("Image deletion failed:", error);
    },
  });
}
