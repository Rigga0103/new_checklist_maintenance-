"use client";

import { useState } from "react";
import {
  useMachineTypesQuery,
  useMachineNamesByTypeQuery,
  useCreateMachineTypeMutation,
  useUpdateMachineTypeMutation,
  useDeleteMachineTypeMutation,
  useCreateMachineNameMutation,
  useUpdateMachineNameMutation,
  useDeleteMachineNameMutation,
} from "../server/tanstackQuery/useMachineTypes";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  Settings,
} from "lucide-react";
import type { MachineType, MachineName } from "../server/api/machineTypesApi";

export default function MainRepairSettings() {
  const { data: machineTypes = [], isLoading: isLoadingTypes } =
    useMachineTypesQuery();

  const [selectedType, setSelectedType] = useState<MachineType | null>(null);

  const { data: machineNames = [], isLoading: isLoadingNames } =
    useMachineNamesByTypeQuery(selectedType?.id);

  // Mutations
  const createTypeMut = useCreateMachineTypeMutation();
  const updateTypeMut = useUpdateMachineTypeMutation();
  const deleteTypeMut = useDeleteMachineTypeMutation();

  const createNameMut = useCreateMachineNameMutation();
  const updateNameMut = useUpdateMachineNameMutation();
  const deleteNameMut = useDeleteMachineNameMutation();

  // Modal States
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<MachineType | null>(null);
  const [typeNameInput, setTypeNameInput] = useState("");

  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [editingName, setEditingName] = useState<MachineName | null>(null);
  const [machineNameInput, setMachineNameInput] = useState("");

  // Handlers for Machine Types
  const handleOpenTypeModal = (type?: MachineType) => {
    if (type) {
      setEditingType(type);
      setTypeNameInput(type.type_name);
    } else {
      setEditingType(null);
      setTypeNameInput("");
    }
    setIsTypeModalOpen(true);
  };

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      updateTypeMut.mutate(
        { id: editingType.id, updates: { type_name: typeNameInput } },
        {
          onSuccess: () => {
            setIsTypeModalOpen(false);
            if (selectedType?.id === editingType.id) {
              setSelectedType({ ...selectedType, type_name: typeNameInput });
            }
          },
        },
      );
    } else {
      createTypeMut.mutate(typeNameInput, {
        onSuccess: () => setIsTypeModalOpen(false),
      });
    }
  };

  // Handlers for Machine Names
  const handleOpenNameModal = (name?: MachineName) => {
    if (name) {
      setEditingName(name);
      setMachineNameInput(name.machine_name);
    } else {
      setEditingName(null);
      setMachineNameInput("");
    }
    setIsNameModalOpen(true);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    if (editingName) {
      updateNameMut.mutate(
        {
          id: editingName.id,
          updates: { machine_name: machineNameInput },
          typeId: selectedType.id,
        },
        { onSuccess: () => setIsNameModalOpen(false) },
      );
    } else {
      createNameMut.mutate(
        { typeId: selectedType.id, machineName: machineNameInput },
        { onSuccess: () => setIsNameModalOpen(false) },
      );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Repairing Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage Machine Types and associate Machine Names dynamically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-140px)] min-h-150">
        {/* Left Column: Machine Types */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
            <h2 className="font-semibold text-foreground">Machine Types</h2>
            <button
              onClick={() => handleOpenTypeModal()}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
              title="Add Machine Type"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingTypes ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : machineTypes.length === 0 ? (
              <div className="text-center p-8 text-sm text-muted-foreground">
                No Machine Types found. Add one to get started.
              </div>
            ) : (
              <ul className="space-y-1">
                {machineTypes.map((type) => (
                  <li key={type.id} className="group flex items-center gap-2">
                    <button
                      onClick={() => setSelectedType(type)}
                      className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors border ${
                        selectedType?.id === type.id
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-medium"
                          : "border-transparent text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                      }`}
                    >
                      <span className="truncate pr-2">{type.type_name}</span>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-opacity ${
                          selectedType?.id === type.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-40"
                        }`}
                      />
                    </button>
                    <div className="flex shrink-0">
                      <button
                        onClick={() => handleOpenTypeModal(type)}
                        className="p-2 text-neutral-400 hover:text-blue-600 transition-colors rounded-md"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Delete this Machine Type? All associated Machine Names will also be deleted.",
                            )
                          ) {
                            deleteTypeMut.mutate(type.id);
                            if (selectedType?.id === type.id)
                              setSelectedType(null);
                          }
                        }}
                        className="p-2 text-neutral-400 hover:text-red-600 transition-colors rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Machine Names */}
        <div className="lg:col-span-8 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 h-full flex flex-col overflow-hidden">
          {selectedType ? (
            <>
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">
                    Names for{" "}
                    <span className="text-blue-600 dark:text-blue-400">
                      &quot;{selectedType.type_name}&quot;
                    </span>
                  </h2>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-muted-foreground">
                    {machineNames.length} names
                  </span>
                </div>
                <button
                  onClick={() => handleOpenNameModal()}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Name
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Machine Name
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {isLoadingNames ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-12 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                        </td>
                      </tr>
                    ) : machineNames.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-6 py-12 text-center text-sm text-muted-foreground"
                        >
                          No Machine Names associated with this type yet.
                        </td>
                      </tr>
                    ) : (
                      machineNames.map((name) => (
                        <tr
                          key={name.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                        >
                          <td className="px-6 py-3 text-sm text-foreground">
                            {name.machine_name}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenNameModal(name)}
                                className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors rounded-md"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Delete this Machine Name?")) {
                                    deleteNameMut.mutate({
                                      id: name.id,
                                      typeId: selectedType.id,
                                    });
                                  }
                                }}
                                className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors rounded-md"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Settings className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                Select a Machine Type
              </h3>
              <p className="max-w-xs text-sm">
                Choose a machine type from the left sidebar to view and manage
                its associated names.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-semibold text-foreground">
                {editingType ? "Edit Machine Type" : "Add Machine Type"}
              </h3>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveType} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Type Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Injection Molding"
                  value={typeNameInput}
                  onChange={(e) => setTypeNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTypeMut.isPending || updateTypeMut.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {(createTypeMut.isPending || updateTypeMut.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Name Modal */}
      {isNameModalOpen && selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-semibold text-foreground">
                {editingName ? "Edit Machine Name" : "Add Machine Name"}
              </h3>
              <button
                onClick={() => setIsNameModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveName} className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm mb-4">
                Adding to: <strong>{selectedType.type_name}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Machine Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Printer A"
                  value={machineNameInput}
                  onChange={(e) => setMachineNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createNameMut.isPending || updateNameMut.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {(createNameMut.isPending || updateNameMut.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
