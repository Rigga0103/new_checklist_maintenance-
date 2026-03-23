import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchVendors,
  createVendor,
  updateVendor,
  deleteVendor,
} from "../api/vendorsApi";
import { CreateVendorDTO } from "../../../types/types";
import { toast } from "sonner";

export const VENDORS_QUERY_KEY = ["vendors"];

export const useVendorsQuery = () => {
  return useQuery({
    queryKey: VENDORS_QUERY_KEY,
    queryFn: fetchVendors,
  });
};

export const useCreateVendorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendor: CreateVendorDTO) => createVendor(vendor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_QUERY_KEY });
      toast.success("Vendor created successfully");
    },
    onError: (error) => {
      console.error("Error creating vendor:", error);
      toast.error("Failed to create vendor");
    },
  });
};

export const useUpdateVendorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<CreateVendorDTO>;
    }) => updateVendor(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_QUERY_KEY });
      toast.success("Vendor updated successfully");
    },
    onError: (error) => {
      console.error("Error updating vendor:", error);
      toast.error("Failed to update vendor");
    },
  });
};

export const useDeleteVendorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_QUERY_KEY });
      toast.success("Vendor deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting vendor:", error);
      toast.error("Failed to delete vendor");
    },
  });
};
