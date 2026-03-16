import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRepairData,
  fetchMaintenanceData,
  fetchMaintenancePending,
  fetchMaintenanceHistory,
  fetchMaintenanceLast7Days,
  fetchMaintenanceOverdue,
  fetchMaintenanceUpcoming,
  updateMaintenanceTask,
  fetchMaintenanceTasksForEdit,
  fetchUniqueMaintenanceTasksForEdit,
  updateMaintenanceTaskCascade,
  deleteMaintenanceTaskCascade,
  deleteMaintenanceTasks,
  fetchRepairTasksForEdit,
  deleteRepairTasks,
  updateRepairTask,
  fetchMaintenanceSchedulesForEdit,
  updateMaintenanceScheduleCascade,
  deleteMaintenanceScheduleCascade,
  MachineMaintenanceTask,
  MachineRepairTask,
  MaintenanceSchedule,
} from "../api/repairDashboardApi";

// Query Keys
export const repairDashboardKeys = {
  all: ["repairDashboard"] as const,
  repairs: () => [...repairDashboardKeys.all, "repairs"] as const,
  maintenance: () => [...repairDashboardKeys.all, "maintenance"] as const,
  maintenanceEdit: (
    page: number,
    searchTerm: string,
    machineName: string,
    assignedTo: string,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenanceEdit",
      page,
      searchTerm,
      machineName,
      assignedTo,
    ] as const,
  maintenanceSchedulesEdit: (
    page: number,
    searchTerm: string,
    machineName: string,
    assignedTo: string,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenanceSchedulesEdit",
      page,
      searchTerm,
      machineName,
      assignedTo,
    ] as const,
  repairEdit: (
    page: number,
    searchTerm: string,
    machineName: string,
    assignedTo: string,
  ) =>
    [
      ...repairDashboardKeys.all,
      "repairEdit",
      page,
      searchTerm,
      machineName,
      assignedTo,
    ] as const,
  maintenancePending: (
    searchTerm: string,
    role: string | null,
    username: string | null,
    startDate?: string,
    endDate?: string,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenancePending",
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ] as const,
  maintenanceHistory: (
    searchTerm: string,
    role: string | null,
    username: string | null,
    startDate?: string,
    endDate?: string,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenanceHistory",
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ] as const,
  maintenanceLast7Days: (
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenanceLast7Days",
      searchTerm,
      role,
      username,
    ] as const,
  maintenanceOverdue: (
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenanceOverdue",
      searchTerm,
      role,
      username,
    ] as const,
  maintenanceUpcoming: (
    searchTerm: string,
    role: string | null,
    username: string | null,
  ) =>
    [
      ...repairDashboardKeys.all,
      "maintenanceUpcoming",
      searchTerm,
      role,
      username,
    ] as const,
};

/**
 * Fetch all repair data for the dashboard
 */
export function useRepairDataQuery() {
  return useQuery({
    queryKey: repairDashboardKeys.repairs(),
    queryFn: fetchRepairData,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch all maintenance data for the dashboard (charts/stats)
 */
export function useMaintenanceDataQuery() {
  return useQuery({
    queryKey: repairDashboardKeys.maintenance(),
    queryFn: fetchMaintenanceData,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch current week's pending maintenance tasks (filtered by date + user)
 */
export function useMaintenancePendingQuery(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenancePending(
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchMaintenancePending(searchTerm, role, username, startDate, endDate),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch completed maintenance tasks (history, filtered by user)
 */
export function useMaintenanceHistoryQuery(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenanceHistory(
      searchTerm,
      role,
      username,
      startDate,
      endDate,
    ),
    queryFn: () =>
      fetchMaintenanceHistory(searchTerm, role, username, startDate, endDate),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch last 7 days maintenance tasks (Mon-Sat, all statuses)
 */
export function useMaintenanceLast7DaysQuery(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenanceLast7Days(
      searchTerm,
      role,
      username,
    ),
    queryFn: () => fetchMaintenanceLast7Days(searchTerm, role, username),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch overdue maintenance tasks
 */
export function useMaintenanceOverdueQuery(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenanceOverdue(
      searchTerm,
      role,
      username,
    ),
    queryFn: () => fetchMaintenanceOverdue(searchTerm, role, username),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch upcoming maintenance tasks
 */
export function useMaintenanceUpcomingQuery(
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenanceUpcoming(
      searchTerm,
      role,
      username,
    ),
    queryFn: () => fetchMaintenanceUpcoming(searchTerm, role, username),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Update a maintenance task
 */
export function useUpdateMaintenanceTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<MachineMaintenanceTask>;
    }) => updateMaintenanceTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}

// ============ Edit Task Queries & Mutations ============

/**
 * Paginated query for maintenance schedules (edit view)
 */
export function useMaintenanceSchedulesEditQuery(
  page = 0,
  pageSize = 50,
  searchTerm = "",
  machineName = "",
  assignedTo = "",
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenanceSchedulesEdit(
      page,
      searchTerm,
      machineName,
      assignedTo,
    ),
    queryFn: () =>
      fetchMaintenanceSchedulesForEdit(
        page,
        pageSize,
        searchTerm,
        machineName,
        assignedTo,
      ),
    placeholderData: (prev) => prev,
  });
}

/**
 * Paginated query for unique maintenance tasks (edit view) - deduplicates by machine_name + task_description + doer_name
 */
export function useMaintenanceEditQuery(
  page = 0,
  pageSize = 50,
  searchTerm = "",
  machineName = "",
  assignedTo = "",
) {
  return useQuery({
    queryKey: repairDashboardKeys.maintenanceEdit(
      page,
      searchTerm,
      machineName,
      assignedTo,
    ),
    queryFn: () =>
      fetchUniqueMaintenanceTasksForEdit(
        page,
        pageSize,
        searchTerm,
        machineName,
        assignedTo,
      ),
    placeholderData: (prev) => prev,
  });
}

/**
 * Cascade update all matching maintenance tasks
 */
export function useUpdateMaintenanceTaskCascade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      oldMachineName,
      oldTaskDescription,
      oldDoerName,
      updates,
    }: {
      oldMachineName: string;
      oldTaskDescription: string;
      oldDoerName: string;
      updates: Partial<MachineMaintenanceTask>;
    }) =>
      updateMaintenanceTaskCascade(
        oldMachineName,
        oldTaskDescription,
        oldDoerName,
        updates,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}

/**
 * Cascade delete all matching maintenance tasks
 */
export function useDeleteMaintenanceTaskCascade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      machineName,
      taskDescription,
      doerName,
    }: {
      machineName: string;
      taskDescription: string;
      doerName: string;
    }) => deleteMaintenanceTaskCascade(machineName, taskDescription, doerName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}

/**
 * Paginated query for repair tasks (edit view)
 */
export function useRepairEditQuery(
  page = 0,
  pageSize = 50,
  searchTerm = "",
  machineName = "",
  assignedTo = "",
) {
  return useQuery({
    queryKey: repairDashboardKeys.repairEdit(
      page,
      searchTerm,
      machineName,
      assignedTo,
    ),
    queryFn: () =>
      fetchRepairTasksForEdit(
        page,
        pageSize,
        searchTerm,
        machineName,
        assignedTo,
      ),
    placeholderData: (prev) => prev,
  });
}

/**
 * Delete maintenance tasks mutation (legacy)
 */
export function useDeleteMaintenanceTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: number[]) => deleteMaintenanceTasks(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}

/**
 * Update maintenance schedule (cascade)
 */
export function useUpdateMaintenanceScheduleCascade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      oldData,
      newData,
    }: {
      id: number;
      oldData: MaintenanceSchedule;
      newData: Partial<MaintenanceSchedule>;
    }) => updateMaintenanceScheduleCascade(id, oldData, newData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}

/**
 * Delete maintenance schedule (cascade)
 */
export function useDeleteMaintenanceScheduleCascade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      oldData,
    }: {
      id: number;
      oldData: MaintenanceSchedule;
    }) => deleteMaintenanceScheduleCascade(id, oldData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}

/**
 * Delete repair tasks mutation
 */
export function useDeleteRepairTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: number[]) => deleteRepairTasks(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}

/**
 * Update a repair task mutation
 */
export function useUpdateRepairTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: number;
      updates: Partial<MachineRepairTask>;
    }) => updateRepairTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: repairDashboardKeys.all,
      });
    },
  });
}
