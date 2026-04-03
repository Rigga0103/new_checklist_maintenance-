"use client";

import { useState } from "react";
import {
  useMaintenanceSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useGenerateTasksMutation,
} from "../server/tanstackQuery/useMaintenanceSchedules";
import { useActiveMachinesQuery } from "../../machines/server/tanstackQuery/useMachineQueries";
import { useMachineTypesQuery } from "../../repairing/server/tanstackQuery/useMachineTypes";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CreateScheduleDTO } from "../server/api/maintenanceScheduleApi";
import { useRBAC } from "@/hooks/useRBAC";

const ITEMS_PER_PAGE = 20;

export default function MainMaintenanceSchedule() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateScheduleDTO>({
    machine_type: "",
    machine_name: "",
    task_description: "",
    frequency: "daily",
    assigned_to: "",
    department: "",
  });

  const { data: schedules = [], isLoading } = useMaintenanceSchedulesQuery();
  const { data: machinesData = [] } = useActiveMachinesQuery();
  const { data: machineTypesData = [] } = useMachineTypesQuery();
  const createMutation = useCreateScheduleMutation();
  const updateMutation = useUpdateScheduleMutation();
  const deleteMutation = useDeleteScheduleMutation();
  const generateMutation = useGenerateTasksMutation();

  const { canWrite, canEdit, canDelete } = useRBAC("maintenance_schedules");

  // Pagination
  const totalPages = Math.ceil(schedules.length / ITEMS_PER_PAGE);
  const paginatedSchedules = schedules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const showingStart =
    schedules.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, schedules.length);

  const handleOpenModal = (schedule?: any) => {
    if (schedule) {
      setEditingId(schedule.id);
      setFormData({
        machine_type: schedule.machine_type || "",
        machine_name: schedule.machine_name,
        task_description: schedule.task_description,
        frequency: schedule.frequency,
        assigned_to: schedule.assigned_to || "",
        department: schedule.department || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        machine_type: "",
        machine_name: "",
        task_description: "",
        frequency: "daily",
        assigned_to: "",
        department: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, updates: formData },
        {
          onSuccess: handleCloseModal,
        },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: handleCloseModal,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-7 bg-gray-200 dark:bg-neutral-700 rounded w-56 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-80 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-28" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded flex-1" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-20" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-0 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Maintenance Schedules
          </h1>
          <p className="text-muted-foreground">
            Manage recurring maintenance tasks for machines.
          </p>
        </div>
        <div className="flex gap-3">
          {canWrite && (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Generate Tasks
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Schedule
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Machine Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Machine Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Frequency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Assigned To
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {schedules.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  No schedules found. Create one to get started.
                </td>
              </tr>
            ) : (
              paginatedSchedules.map((schedule: any) => (
                <tr
                  key={schedule.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                >
                  <td className="px-6 py-4 text-sm text-foreground">
                    {schedule.machine_type || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {schedule.machine_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {schedule.task_description}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${schedule.frequency === "daily"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : schedule.frequency === "weekly"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}
                    >
                      {schedule.frequency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {schedule.assigned_to || "-"}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {canEdit && (
                      <button
                        onClick={() => handleOpenModal(schedule)}
                        className="text-neutral-500 hover:text-green-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="text-neutral-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-muted-foreground">
              Showing {showingStart}-{showingEnd} of {schedules.length} • Page{" "}
              {currentPage} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? "Edit Schedule" : "New Schedule"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Machine Type
                  </label>
                  <select
                    value={formData.machine_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        machine_type: e.target.value,
                        machine_name: "", // Reset machine name when type changes
                      })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a type</option>
                    {machineTypesData.map((type) => (
                      <option key={type.id} value={type.type_name}>
                        {type.type_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Machine Name
                  </label>
                  <select
                    required
                    value={formData.machine_name}
                    onChange={(e) =>
                      setFormData({ ...formData, machine_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a machine</option>
                    {(formData.machine_type
                      ? machinesData.filter((m) => m.type === formData.machine_type)
                      : machinesData
                    ).map((machine) => (
                      <option key={machine.id} value={machine.machine_name}>
                        {machine.machine_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Task Description
                </label>
                <textarea
                  required
                  value={formData.task_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      task_description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Check hydraulic oil level"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({ ...formData, frequency: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={formData.assigned_to || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="User Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Production"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {editingId ? "Update Schedule" : "Create Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
