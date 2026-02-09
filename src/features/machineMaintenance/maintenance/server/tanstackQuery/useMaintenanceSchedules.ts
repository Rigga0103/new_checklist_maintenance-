import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  generateDailyTasks,
  CreateScheduleDTO,
} from "../api/maintenanceScheduleApi";
import { toast } from "sonner";

export const maintenanceScheduleKeys = {
  all: ["maintenance-schedules"] as const,
};

export const useMaintenanceSchedulesQuery = () => {
  return useQuery({
    queryKey: maintenanceScheduleKeys.all,
    queryFn: fetchMaintenanceSchedules,
  });
};

export const useCreateScheduleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSchedule: CreateScheduleDTO) =>
      createMaintenanceSchedule(newSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.all });
      toast.success("Schedule created successfully");
    },
    onError: (error) => {
      console.error("Error creating schedule:", error);
      toast.error("Failed to create schedule");
    },
  });
};

export const useUpdateScheduleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<CreateScheduleDTO>;
    }) => updateMaintenanceSchedule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.all });
      toast.success("Schedule updated successfully");
    },
    onError: (error) => {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule");
    },
  });
};

export const useDeleteScheduleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMaintenanceSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.all });
      toast.success("Schedule deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    },
  });
};

export const useGenerateTasksMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateDailyTasks(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }); // Invalidate all maintenance tasks
      toast.success(data.message);
    },
    onError: (error) => {
      console.error("Error generating tasks:", error);
      toast.error("Failed to generate tasks");
    },
  });
};
