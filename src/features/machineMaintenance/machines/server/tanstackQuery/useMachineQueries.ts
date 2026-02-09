import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMachines,
  fetchActiveMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  CreateMachineDTO,
} from "../api/machinesApi";
import { toast } from "sonner";

export const machineKeys = {
  all: ["machines"] as const,
  active: () => [...machineKeys.all, "active"] as const,
};

export const useMachinesQuery = () => {
  return useQuery({
    queryKey: machineKeys.all,
    queryFn: fetchMachines,
  });
};

export const useActiveMachinesQuery = () => {
  return useQuery({
    queryKey: machineKeys.active(),
    queryFn: fetchActiveMachines,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useCreateMachineMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newMachine: CreateMachineDTO) => createMachine(newMachine),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineKeys.all });
      toast.success("Machine created successfully");
    },
    onError: (error) => {
      console.error("Error creating machine:", error);
      toast.error("Failed to create machine");
    },
  });
};

export const useUpdateMachineMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<CreateMachineDTO>;
    }) => updateMachine(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineKeys.all });
      toast.success("Machine updated successfully");
    },
    onError: (error) => {
      console.error("Error updating machine:", error);
      toast.error("Failed to update machine");
    },
  });
};

export const useDeleteMachineMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machineKeys.all });
      toast.success("Machine deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting machine:", error);
      toast.error("Failed to delete machine");
    },
  });
};
