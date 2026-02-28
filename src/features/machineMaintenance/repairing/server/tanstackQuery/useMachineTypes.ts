import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMachineTypes,
  fetchMachineNamesByType,
  fetchAllMachineNames,
  createMachineType,
  updateMachineType,
  deleteMachineType,
  createMachineName,
  updateMachineName,
  deleteMachineName,
  MachineType,
  MachineName,
} from "../api/machineTypesApi";
import { toast } from "sonner";

export const machineTypesKeys = {
  all: ["machineTypes"] as const,
  types: () => [...machineTypesKeys.all, "types"] as const,
  names: (typeId?: number) =>
    [...machineTypesKeys.all, "names", { typeId }] as const,
  allNames: () => [...machineTypesKeys.all, "allNames"] as const,
};

// --- Queries ---

export const useMachineTypesQuery = () => {
  return useQuery({
    queryKey: machineTypesKeys.types(),
    queryFn: fetchMachineTypes,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useMachineNamesByTypeQuery = (
  typeId: number | null | undefined,
) => {
  return useQuery({
    queryKey: machineTypesKeys.names(typeId as number),
    queryFn: () => fetchMachineNamesByType(typeId as number),
    enabled: !!typeId, // Only fetch if typeId is provided
    staleTime: 1000 * 60 * 5,
  });
};

export const useAllMachineNamesQuery = () => {
  return useQuery({
    queryKey: machineTypesKeys.allNames(),
    queryFn: fetchAllMachineNames,
    staleTime: 1000 * 60 * 5,
  });
};

// --- Mutations ---

export const useCreateMachineTypeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (typeName: string) => createMachineType(typeName),
    onSuccess: () => {
      toast.success("Machine Type created successfully");
      queryClient.invalidateQueries({ queryKey: machineTypesKeys.types() });
    },
    onError: (error: any) => {
      toast.error(
        error?.message ||
          "Failed to create Machine Type. It might already exist.",
      );
    },
  });
};

export const useUpdateMachineTypeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<MachineType>;
    }) => updateMachineType(id, updates),
    onSuccess: () => {
      toast.success("Machine Type updated successfully");
      queryClient.invalidateQueries({ queryKey: machineTypesKeys.types() });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update Machine Type");
    },
  });
};

export const useDeleteMachineTypeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMachineType(id),
    onSuccess: () => {
      toast.success("Machine Type deleted successfully");
      queryClient.invalidateQueries({ queryKey: machineTypesKeys.types() });
      queryClient.invalidateQueries({ queryKey: machineTypesKeys.allNames() });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete Machine Type");
    },
  });
};

export const useCreateMachineNameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      typeId,
      machineName,
    }: {
      typeId: number;
      machineName: string;
    }) => createMachineName(typeId, machineName),
    onSuccess: (data, variables) => {
      toast.success("Machine Name created successfully");
      queryClient.invalidateQueries({
        queryKey: machineTypesKeys.names(variables.typeId),
      });
      queryClient.invalidateQueries({ queryKey: machineTypesKeys.allNames() });
    },
    onError: (error: any) => {
      toast.error(
        error?.message ||
          "Failed to create Machine Name. It might already exist.",
      );
    },
  });
};

export const useUpdateMachineNameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
      typeId,
    }: {
      id: number;
      updates: Partial<MachineName>;
      typeId: number;
    }) => updateMachineName(id, updates),
    onSuccess: (data, variables) => {
      toast.success("Machine Name updated successfully");
      queryClient.invalidateQueries({
        queryKey: machineTypesKeys.names(variables.typeId),
      });
      queryClient.invalidateQueries({ queryKey: machineTypesKeys.allNames() });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update Machine Name");
    },
  });
};

export const useDeleteMachineNameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, typeId }: { id: number; typeId: number }) =>
      deleteMachineName(id),
    onSuccess: (data, variables) => {
      toast.success("Machine Name deleted successfully");
      queryClient.invalidateQueries({
        queryKey: machineTypesKeys.names(variables.typeId),
      });
      queryClient.invalidateQueries({ queryKey: machineTypesKeys.allNames() });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete Machine Name");
    },
  });
};
