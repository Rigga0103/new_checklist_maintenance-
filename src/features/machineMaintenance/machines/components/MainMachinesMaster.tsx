"use client";

import { useState } from "react";
import {
  useMachinesQuery,
  useCreateMachineMutation,
  useUpdateMachineMutation,
  useDeleteMachineMutation,
} from "../server/tanstackQuery/useMachineQueries";
import {
  useMachineTypesQuery,
  useAllMachineNamesQuery,
} from "../../repairing/server/tanstackQuery/useMachineTypes";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CreateMachineDTO } from "../server/api/machinesApi";
import { useRBAC } from "@/hooks/useRBAC";

const ITEMS_PER_PAGE = 20;

export default function MainMachinesMaster() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateMachineDTO>({
    machine_name: "",
    serial_no: "",
    model: "",
    location: "",
    department: "",
    type: "",
    status: "active",
  });

  const { data: machines = [], isLoading } = useMachinesQuery();
  const { data: machineTypes = [] } = useMachineTypesQuery();
  const { data: allRepairMachineNames = [] } = useAllMachineNamesQuery();
  const createMutation = useCreateMachineMutation();
  const updateMutation = useUpdateMachineMutation();
  const deleteMutation = useDeleteMachineMutation();

  const { canWrite, canEdit, canDelete } = useRBAC("machines");

  // Pagination
  const totalPages = Math.ceil(machines.length / ITEMS_PER_PAGE);
  const paginatedMachines = machines.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const showingStart =
    machines.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, machines.length);

  const handleOpenModal = (machine?: any) => {
    if (machine) {
      setEditingId(machine.id);
      setFormData({
        machine_name: machine.machine_name,
        serial_no: machine.serial_no || "",
        model: machine.model || "",
        location: machine.location || "",
        department: machine.department || "",
        type: machine.type || "",
        status: machine.status || "active",
      });
    } else {
      setEditingId(null);
      setFormData({
        machine_name: "",
        serial_no: "",
        model: "",
        location: "",
        department: "",
        type: "",
        status: "active",
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
        { onSuccess: handleCloseModal },
      );
    } else {
      createMutation.mutate(formData, { onSuccess: handleCloseModal });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this machine?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-7 bg-gray-200 dark:bg-neutral-700 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-72 mt-2 animate-pulse" />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-32" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-24" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded flex-1" />
              <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Machines Master
          </h1>
          <p className="text-muted-foreground">
            Manage your equipment and machinery registry.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Machine
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Machine Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Serial No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {machines.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  No machines found. Add your first machine to get started.
                </td>
              </tr>
            ) : (
              paginatedMachines.map((machine: any) => (
                <tr
                  key={machine.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {machine.machine_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {machine.serial_no || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {machine.model || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {machine.location || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {machine.department || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${machine.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                    >
                      {machine.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {machine.type || "-"}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {canEdit && (
                      <button
                        onClick={() => handleOpenModal(machine)}
                        className="text-neutral-500 hover:text-green-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(machine.id)}
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
              Showing {showingStart}-{showingEnd} of {machines.length} • Page{" "}
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
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? "Edit Machine" : "New Machine"}
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
                    Type
                  </label>
                  <input
                    type="text"
                    list="machine-types"
                    value={formData.type || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Search or type machine type..."
                  />
                  <datalist id="machine-types">
                    {machineTypes.map((type) => (
                      <option key={type.id} value={type.type_name} />
                    ))}
                  </datalist>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Machine Name *
                  </label>
                  <input
                    type="text"
                    required
                    list="repair-machine-names"
                    value={formData.machine_name}
                    onChange={(e) =>
                      setFormData({ ...formData, machine_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. CNC Machine 01"
                  />
                  <datalist id="repair-machine-names">
                    {(formData.type
                      ? allRepairMachineNames.filter(
                        (n) =>
                          n.type_id ===
                          machineTypes.find(
                            (t) => t.type_name === formData.type,
                          )?.id,
                      )
                      : allRepairMachineNames
                    ).map((name) => (
                      <option key={name.id} value={name.machine_name} />
                    ))}
                  </datalist>
                </div>



                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Serial No
                  </label>
                  <input
                    type="text"
                    value={formData.serial_no || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, serial_no: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. SN-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. ABC-1000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g. Building A, Floor 2"
                  />
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

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>


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
                  {editingId ? "Update Machine" : "Create Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
