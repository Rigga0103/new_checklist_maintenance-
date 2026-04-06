import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchParts,
  createPart,
  updatePart,
  deletePart,
} from "../api/partsApi";
import { CreatePartDTO } from "../../../types/types";
import { toast } from "sonner";

export const PARTS_QUERY_KEY = ["parts"];

export const usePartsQuery = (searchTerm?: string) => {
  return useQuery({
    queryKey: [...PARTS_QUERY_KEY, searchTerm],
    queryFn: () => fetchParts(searchTerm),
  });
};

export const useCreatePartMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (part: CreatePartDTO) => createPart(part),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast.success("Part created successfully");
    },
    onError: (error) => {
      console.error("Error creating part:", error);
      toast.error("Failed to create part");
    },
  });
};

export const useUpdatePartMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<CreatePartDTO>;
    }) => updatePart(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast.success("Part updated successfully");
    },
    onError: (error) => {
      console.error("Error updating part:", error);
      toast.error("Failed to update part");
    },
  });
};

export const useDeletePartMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast.success("Part deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting part:", error);
      toast.error("Failed to delete part");
    },
  });
};
