"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Trash2,
  Edit,
  Save,
  X,
  RefreshCw,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useMaintenanceEditQuery,
  useRepairEditQuery,
  useUpdateMaintenanceTaskCascade,
  useDeleteMaintenanceTaskCascade,
  useDeleteRepairTasks,
  useUpdateRepairTask,
} from "../server/tanstackQuery/useRepairDashboardQuery";
import type {
  MachineMaintenanceTask,
  MachineRepairTask,
} from "../server/api/repairDashboardApi";
import { useUsers } from "../../settings/server/tanstackQuery/useSettings";
import { useMachinesQuery } from "../../../machineMaintenance/machines/server/tanstackQuery/useMachineQueries";

const PAGE_SIZE = 50;

type TabType = "maintenance" | "repairing";

// Format date helper
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
}

// Frequency badge
function getFrequencyBadge(freq: string) {
  const colors: Record<string, string> = {
    daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    weekly:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    monthly: "bg-muted text-foreground dark:bg-muted dark:text-foreground",
  };
  return (
    colors[freq?.toLowerCase()] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
  );
}

export default function MainEditMachine() {
  const [activeTab, setActiveTab] = useState<TabType>("maintenance");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [maintenancePage, setMaintenancePage] = useState(0);
  const [repairPage, setRepairPage] = useState(0);

  // Selection state
  const [selectedMaintenanceIds, setSelectedMaintenanceIds] = useState<
    number[]
  >([]);
  const [selectedRepairIds, setSelectedRepairIds] = useState<number[]>([]);

  // Edit state — maintenance
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<
    number | null
  >(null);
  const [maintenanceEditForm, setMaintenanceEditForm] = useState<
    Partial<MachineMaintenanceTask>
  >({});

  // Edit state — repair
  const [editingRepairId, setEditingRepairId] = useState<number | null>(null);
  const [repairEditForm, setRepairEditForm] = useState<
    Partial<MachineRepairTask>
  >({});

  // Delete Confirmation State
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<{
    type: "maintenance" | "repair";
    isBulk: boolean;
    task?: MachineMaintenanceTask | MachineRepairTask;
    taskId?: number;
    count?: number;
  } | null>(null);

  const [userRole, setUserRole] = useState<string>("");
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem("role") || "user");
  }, []);

  const isAdmin =
    userRole.toLowerCase() === "admin" ||
    userRole.toLowerCase() === "super_admin";

  // Queries - Maintenance targets machine_maintenance table (generated tasks)
  const { data: maintenanceResponse, isLoading: maintenanceLoading } =
    useMaintenanceEditQuery(
      maintenancePage,
      50,
      activeTab === "maintenance" ? searchTerm : "",
      activeTab === "maintenance" ? selectedMachine : "",
      activeTab === "maintenance" ? selectedPerson : "",
    );

  const { data: allUsersData } = useUsers();
  const { data: allMachinesData } = useMachinesQuery();

  const { data: repairResponse, isLoading: repairLoading } = useRepairEditQuery(
    repairPage,
    50,
    activeTab === "repairing" ? searchTerm : "",
    activeTab === "repairing" ? selectedMachine : "",
    activeTab === "repairing" ? selectedPerson : "",
  );

  // Data
  const maintenanceTasks =
    (maintenanceResponse?.data as MachineMaintenanceTask[]) || [];
  const maintenanceTotal = maintenanceResponse?.total || 0;
  const repairTasks = repairResponse?.data || [];
  const repairTotal = repairResponse?.total || 0;

  // Mutations
  const updateMaintenanceMutation = useUpdateMaintenanceTaskCascade();
  const deleteMaintenanceMutation = useDeleteMaintenanceTaskCascade();

  const deleteRepairMutation = useDeleteRepairTasks();
  const updateRepairMutation = useUpdateRepairTask();

  const isLoading =
    activeTab === "maintenance" ? maintenanceLoading : repairLoading;
  const currentPage =
    activeTab === "maintenance" ? maintenancePage : repairPage;
  const totalCount =
    activeTab === "maintenance" ? maintenanceTotal : repairTotal;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Deriving unique machine names for the filter (from ALL schedules if possible, but current page for now as a simple list)
  // Ideally we might want a separate query for all unique machines, but for now we can use what's in the current table
  // or just let a few show up.
  const uniqueMachines = useMemo(() => {
    if (allMachinesData && allMachinesData.length > 0) {
      return allMachinesData.map((m) => m.machine_name).sort();
    }
    if (activeTab === "maintenance") {
      const machines = maintenanceTasks
        .map((t) => t.machine_name)
        .filter(Boolean);
      return Array.from(new Set(machines)).sort();
    }
    const machines = repairTasks.map((t) => t.machine_name).filter(Boolean);
    return Array.from(new Set(machines)).sort();
  }, [allMachinesData, maintenanceTasks, repairTasks, activeTab]);

  const uniquePersons = useMemo(() => {
    if (allUsersData && allUsersData.length > 0) {
      return allUsersData
        .map((u) => u.user_name)
        .filter(Boolean)
        .sort();
    }
    if (activeTab === "maintenance") {
      const persons = maintenanceTasks
        .map((t) => t.assigned_to)
        .filter(Boolean);
      return Array.from(new Set(persons)).sort();
    }
    const persons = repairTasks.map((t) => t.assigned_to).filter(Boolean);
    return Array.from(new Set(persons)).sort();
  }, [allUsersData, maintenanceTasks, repairTasks, activeTab]);

  // Pagination
  const handleNextPage = () => {
    if (activeTab === "maintenance") {
      setMaintenancePage((p) => Math.min(p + 1, totalPages - 1));
    } else {
      setRepairPage((p) => Math.min(p + 1, totalPages - 1));
    }
  };

  const handlePrevPage = () => {
    if (activeTab === "maintenance") {
      setMaintenancePage((p) => Math.max(0, p - 1));
    } else {
      setRepairPage((p) => Math.max(0, p - 1));
    }
  };

  // ============ Maintenance Handlers ============

  const handleMaintenanceCheckbox = (id: number) => {
    setSelectedMaintenanceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleMaintenanceSelectAll = () => {
    if (selectedMaintenanceIds.length === maintenanceTasks.length) {
      setSelectedMaintenanceIds([]);
    } else {
      setSelectedMaintenanceIds(maintenanceTasks.map((t) => t.task_id));
    }
  };

  const confirmDeleteMaintenanceSelected = () => {
    if (selectedMaintenanceIds.length === 0) return;
    setDeleteConfirmTask({ type: "maintenance", isBulk: true });
  };

  const confirmDeleteMaintenanceTask = (task: MachineMaintenanceTask) => {
    const count = (task as any).task_count || 1;
    setDeleteConfirmTask({ type: "maintenance", isBulk: false, task, count });
  };

  const executeDeleteMaintenanceSelected = async () => {
    if (selectedMaintenanceIds.length === 0) return;
    const selectedTasks = maintenanceTasks.filter((t) =>
      selectedMaintenanceIds.includes(t.task_id),
    );
    const totalAffected = selectedTasks.reduce(
      (sum, t) => sum + ((t as any).task_count || 1),
      0,
    );

    try {
      for (const task of selectedTasks) {
        await deleteMaintenanceMutation.mutateAsync({
          machineName: task.machine_name,
          taskDescription: task.task_description || "",
          doerName: task.doer_name || "",
        });
      }
      setSelectedMaintenanceIds([]);
      toast.success(`Deleted ${totalAffected} tasks`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete tasks");
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  const executeDeleteMaintenanceTask = async () => {
    const task = deleteConfirmTask?.task as MachineMaintenanceTask;
    if (!task) return;
    const count = deleteConfirmTask?.count || 1;

    try {
      await deleteMaintenanceMutation.mutateAsync({
        machineName: task.machine_name,
        taskDescription: task.task_description || "",
        doerName: task.doer_name || "",
      });
      toast.success(`Deleted ${count} tasks`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete task");
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  const handleMaintenanceEditClick = (task: MachineMaintenanceTask) => {
    setEditingMaintenanceId(task.task_id);
    setMaintenanceEditForm({ ...task });
  };

  const handleMaintenanceCancelEdit = () => {
    setEditingMaintenanceId(null);
    setMaintenanceEditForm({});
  };

  const handleMaintenanceSaveEdit = async () => {
    if (!editingMaintenanceId) return;

    // Find the original task to get the old matching keys
    const originalTask = maintenanceTasks.find(
      (t) => t.task_id === editingMaintenanceId,
    );
    if (!originalTask) return;

    try {
      await updateMaintenanceMutation.mutateAsync({
        oldMachineName: originalTask.machine_name,
        oldTaskDescription: originalTask.task_description || "",
        oldDoerName: originalTask.doer_name || "",
        updates: {
          machine_name: maintenanceEditForm.machine_name,
          task_description: maintenanceEditForm.task_description,
          frequency: maintenanceEditForm.frequency,
          doer_name: maintenanceEditForm.doer_name,
        },
      });
      setEditingMaintenanceId(null);
      setMaintenanceEditForm({});
      toast.success("All matching maintenance tasks updated");
    } catch {
      toast.error("Failed to update tasks");
    }
  };

  const handleMaintenanceFieldChange = (field: string, value: string) => {
    setMaintenanceEditForm((prev) => ({ ...prev, [field]: value }));
  };

  // ============ Repair Handlers ============

  const handleRepairCheckbox = (taskId: number) => {
    setSelectedRepairIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((x) => x !== taskId)
        : [...prev, taskId],
    );
  };

  const handleRepairSelectAll = () => {
    if (selectedRepairIds.length === repairTasks.length) {
      setSelectedRepairIds([]);
    } else {
      setSelectedRepairIds(repairTasks.map((t) => t.task_id));
    }
  };

  const confirmDeleteRepairSelected = () => {
    if (selectedRepairIds.length === 0) return;
    setDeleteConfirmTask({ type: "repair", isBulk: true });
  };

  const confirmDeleteRepairTask = (taskId: number) => {
    setDeleteConfirmTask({ type: "repair", isBulk: false, taskId });
  };

  const executeDeleteRepairSelected = async () => {
    if (selectedRepairIds.length === 0) return;
    try {
      await deleteRepairMutation.mutateAsync(selectedRepairIds);
      setSelectedRepairIds([]);
      toast.success(`Deleted ${selectedRepairIds.length} tasks`);
    } catch {
      toast.error("Failed to delete tasks");
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  const executeDeleteRepairTask = async () => {
    const taskId = deleteConfirmTask?.taskId;
    if (!taskId) return;
    try {
      await deleteRepairMutation.mutateAsync([taskId]);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  const handleRepairEditClick = (task: MachineRepairTask) => {
    setEditingRepairId(task.task_id);
    setRepairEditForm({ ...task });
  };

  const handleRepairCancelEdit = () => {
    setEditingRepairId(null);
    setRepairEditForm({});
  };

  const handleRepairSaveEdit = async () => {
    if (!editingRepairId) return;
    try {
      await updateRepairMutation.mutateAsync({
        taskId: editingRepairId,
        updates: {
          machine_name: repairEditForm.machine_name,
          issue_detail: repairEditForm.issue_detail,
          assigned_to: repairEditForm.assigned_to,
          vendor_name: repairEditForm.vendor_name,
          part_replaced: repairEditForm.part_replaced,
          work_done: repairEditForm.work_done,
          warranty: repairEditForm.warranty,
          remarks: repairEditForm.remarks,
        },
      });
      setEditingRepairId(null);
      setRepairEditForm({});
      toast.success("Repair task updated");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleSave = async (id: number, data: any) => {
    try {
      if (activeTab === "maintenance") {
        // Find original task to get old matching keys
        const originalTask = maintenanceTasks.find((t) => t.task_id === id);
        if (!originalTask) return;

        // Remove task_id and created_at from update payload
        const {
          task_id: _,
          created_at: __,
          task_count: ___,
          ...updates
        } = data;

        await updateMaintenanceMutation.mutateAsync({
          oldMachineName: originalTask.machine_name,
          oldTaskDescription: originalTask.task_description || "",
          oldDoerName: originalTask.doer_name || "",
          updates,
        });
        toast.success("All matching maintenance tasks updated");
      } else {
        await updateRepairMutation.mutateAsync({
          taskId: id,
          updates: {
            machine_name: data.machine_name,
            issue_detail: data.issue_detail,
            assigned_to: data.assigned_to,
            task_start_date: data.task_start_date,
            status: data.status,
            vendor_name: data.vendor_name,
            bill_amount: data.bill_amount,
            warranty: data.warranty,
          },
        });
        toast.success("Repair task updated");
      }
      setEditingRepairId(null);
      setEditingMaintenanceId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update task");
    }
  };

  const handleRepairFieldChange = (field: string, value: string) => {
    setRepairEditForm((prev) => ({ ...prev, [field]: value }));
  };

  // ============ Render ============

  const inputClass =
    "w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white";

  const renderMaintenanceTable = () => (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
      <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
        <tr>
          {isAdmin && (
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-10">
              <input
                type="checkbox"
                checked={
                  selectedMaintenanceIds.length === maintenanceTasks.length &&
                  maintenanceTasks.length > 0
                }
                onChange={handleMaintenanceSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
            </th>
          )}
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            ID
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
            Machine Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Task Description
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
            Frequency
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
            Assigned To
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
            Count
          </th>
          {isAdmin && (
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
              Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
        {isLoading ? (
          <tr>
            <td colSpan={8} className="px-6 py-12 text-center">
              <Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" />
            </td>
          </tr>
        ) : maintenanceTasks.length === 0 ? (
          <tr>
            <td
              colSpan={8}
              className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
            >
              No maintenance tasks found
            </td>
          </tr>
        ) : (
          maintenanceTasks.map((task, index) => {
            const isEditing = editingMaintenanceId === task.task_id;
            const isSelected = selectedMaintenanceIds.includes(task.task_id);

            return (
              <tr
                key={task.task_id || index}
                className={
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                }
              >
                {isAdmin && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMaintenanceCheckbox(task.task_id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                  </td>
                )}
                <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                  #{task.task_id}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                  {isEditing ? (
                    <input
                      type="text"
                      value={maintenanceEditForm.machine_name || ""}
                      onChange={(e) =>
                        handleMaintenanceFieldChange(
                          "machine_name",
                          e.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  ) : (
                    task.machine_name || "—"
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-50 max-w-75">
                  {isEditing ? (
                    <textarea
                      value={maintenanceEditForm.task_description || ""}
                      onChange={(e) =>
                        handleMaintenanceFieldChange(
                          "task_description",
                          e.target.value,
                        )
                      }
                      className={inputClass}
                      rows={2}
                    />
                  ) : (
                    <div className="whitespace-normal break-all line-clamp-2">
                      {task.task_description || "—"}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  {isEditing ? (
                    <select
                      value={maintenanceEditForm.frequency || ""}
                      onChange={(e) =>
                        handleMaintenanceFieldChange(
                          "frequency",
                          e.target.value,
                        )
                      }
                      className={inputClass}
                    >
                      <option value="">Select</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="one-time">One-time</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(task.frequency || "")}`}
                    >
                      {task.frequency || "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                  {isEditing ? (
                    <input
                      type="text"
                      value={maintenanceEditForm.doer_name || ""}
                      onChange={(e) =>
                        handleMaintenanceFieldChange(
                          "doer_name",
                          e.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  ) : (
                    task.doer_name || "—"
                  )}
                </td>
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {(task as any).task_count || 1}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-3 py-3 text-sm whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleMaintenanceSaveEdit}
                          disabled={updateMaintenanceMutation.isPending}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                          title="Save"
                        >
                          {updateMaintenanceMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={handleMaintenanceCancelEdit}
                          className="p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMaintenanceEditClick(task)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title="Edit task"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteMaintenanceTask(task)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  const renderRepairTable = () => (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
      <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
        <tr>
          {isAdmin && (
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-10">
              <input
                type="checkbox"
                checked={
                  selectedRepairIds.length === repairTasks.length &&
                  repairTasks.length > 0
                }
                onChange={handleRepairSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
            </th>
          )}
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Task ID
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Machine Name
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase min-w-48">
            Issue Detail
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Assigned To
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Vendor
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Part Replaced
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Warranty
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
            Start Date
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Status
          </th>
          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
            Remarks
          </th>
          {isAdmin && (
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
              Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
        {repairTasks.map((task, index) => {
          const isEditing = editingRepairId === task.task_id;
          const isSelected = selectedRepairIds.includes(task.task_id);

          return (
            <tr
              key={task.task_id || index}
              className={
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  : "hover:bg-gray-50 dark:hover:bg-neutral-700/50"
              }
            >
              {isAdmin && (
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleRepairCheckbox(task.task_id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                </td>
              )}
              <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                #{task.task_id}
              </td>
              <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                {isEditing ? (
                  <input
                    type="text"
                    value={repairEditForm.machine_name || ""}
                    onChange={(e) =>
                      handleRepairFieldChange("machine_name", e.target.value)
                    }
                    className={inputClass}
                  />
                ) : (
                  task.machine_name || "—"
                )}
              </td>
              <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-50 max-w-75">
                {isEditing ? (
                  <textarea
                    value={repairEditForm.issue_detail || ""}
                    onChange={(e) =>
                      handleRepairFieldChange("issue_detail", e.target.value)
                    }
                    className={inputClass}
                    rows={2}
                  />
                ) : (
                  <div className="whitespace-normal break-all line-clamp-2">
                    {task.issue_detail || "—"}
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                {isEditing ? (
                  <input
                    type="text"
                    value={repairEditForm.assigned_to || ""}
                    onChange={(e) =>
                      handleRepairFieldChange("assigned_to", e.target.value)
                    }
                    className={inputClass}
                  />
                ) : (
                  task.assigned_to || "—"
                )}
              </td>
              <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                {isEditing ? (
                  <input
                    type="text"
                    value={repairEditForm.vendor_name || ""}
                    onChange={(e) =>
                      handleRepairFieldChange("vendor_name", e.target.value)
                    }
                    className={inputClass}
                  />
                ) : (
                  task.vendor_name || "—"
                )}
              </td>
              <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                {isEditing ? (
                  <input
                    type="text"
                    value={repairEditForm.part_replaced || ""}
                    onChange={(e) =>
                      handleRepairFieldChange("part_replaced", e.target.value)
                    }
                    className={inputClass}
                  />
                ) : (
                  task.part_replaced || "—"
                )}
              </td>
              <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                {isEditing ? (
                  <input
                    type="text"
                    value={repairEditForm.warranty || ""}
                    onChange={(e) =>
                      handleRepairFieldChange("warranty", e.target.value)
                    }
                    className={inputClass}
                  />
                ) : (
                  task.warranty || "—"
                )}
              </td>
              <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                {formatDate(task.task_start_date)}
              </td>
              <td className="px-3 py-3 text-sm whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    task.actual_date
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {task.actual_date ? "Completed" : "Pending"}
                </span>
              </td>
              <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground max-w-40">
                {isEditing ? (
                  <input
                    type="text"
                    value={repairEditForm.remarks || ""}
                    onChange={(e) =>
                      handleRepairFieldChange("remarks", e.target.value)
                    }
                    className={inputClass}
                  />
                ) : (
                  <div className="truncate">{task.remarks || "—"}</div>
                )}
              </td>
              {isAdmin && (
                <td className="px-3 py-3 text-sm whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleRepairSaveEdit}
                        disabled={updateRepairMutation.isPending}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                        title="Save"
                      >
                        {updateRepairMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={handleRepairCancelEdit}
                        className="p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRepairEditClick(task)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        title="Edit task"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDeleteRepairTask(task.task_id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const taskCount =
    activeTab === "maintenance" ? maintenanceTasks.length : repairTasks.length;
  const selectedCount =
    activeTab === "maintenance"
      ? selectedMaintenanceIds.length
      : selectedRepairIds.length;
  const isDeleting =
    deleteMaintenanceMutation.isPending || deleteRepairMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Machine Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage machine maintenance and repairing tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => {
              setActiveTab("maintenance");
              setMaintenancePage(0);
              setSelectedMaintenanceIds([]);
              setEditingMaintenanceId(null);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "maintenance"
                ? "bg-white dark:bg-neutral-700 text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Maintenance
          </button>
          <button
            onClick={() => {
              setActiveTab("repairing");
              setRepairPage(0);
              setSelectedRepairIds([]);
              setEditingRepairId(null);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "repairing"
                ? "bg-white dark:bg-neutral-700 text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Repairing
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setMaintenancePage(0);
                setRepairPage(0);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Machine Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMachine}
              onChange={(e) => {
                setSelectedMachine(e.target.value);
                setMaintenancePage(0);
                setRepairPage(0);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Machines</option>
              {uniqueMachines.map((machine) => (
                <option key={machine} value={machine}>
                  {machine}
                </option>
              ))}
            </select>

            <select
              value={selectedPerson}
              onChange={(e) => {
                setSelectedPerson(e.target.value);
                setMaintenancePage(0);
                setRepairPage(0);
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Names</option>
              {uniquePersons.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Delete */}
          {selectedCount > 0 && isAdmin && (
            <button
              onClick={
                activeTab === "maintenance"
                  ? confirmDeleteMaintenanceSelected
                  : confirmDeleteRepairSelected
              }
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors ml-auto"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete ({selectedCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : taskCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>No tasks found</p>
          </div>
        ) : (
          <div
            ref={tableRef}
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            {activeTab === "maintenance"
              ? renderMaintenanceTable()
              : renderRepairTable()}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Deletion
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {deleteConfirmTask.isBulk
                ? deleteConfirmTask.type === "maintenance"
                  ? `Delete ${selectedMaintenanceIds.length} unique task group(s) (${maintenanceTasks
                      .filter((t) => selectedMaintenanceIds.includes(t.task_id))
                      .reduce(
                        (sum, t) => sum + ((t as any).task_count || 1),
                        0,
                      )} total tasks)? This action cannot be undone.`
                  : `Are you sure you want to delete ${selectedRepairIds.length} repair task(s)? This action cannot be undone.`
                : deleteConfirmTask.type === "maintenance"
                  ? `Delete all ${deleteConfirmTask.count} task(s) for "${(deleteConfirmTask.task as MachineMaintenanceTask)?.task_description}" assigned to "${(deleteConfirmTask.task as MachineMaintenanceTask)?.doer_name || "—"}"? This action cannot be undone.`
                  : `Are you sure you want to delete this repair task? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmTask(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={
                  deleteConfirmTask.isBulk
                    ? deleteConfirmTask.type === "maintenance"
                      ? executeDeleteMaintenanceSelected
                      : executeDeleteRepairSelected
                    : deleteConfirmTask.type === "maintenance"
                      ? executeDeleteMaintenanceTask
                      : executeDeleteRepairTask
                }
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
