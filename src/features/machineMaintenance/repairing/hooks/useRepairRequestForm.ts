import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useActiveMachinesQuery } from "../../machines/server/tanstackQuery/useMachineQueries";
import { usePartsQuery } from "../../machines/server/tanstackQuery/usePartQueries";
import {
  useActiveUserNamesQuery,
  useCreateRepairRequestMutation,
} from "../server/tanstackQuery/useRepairingQueries";
import {
  useMachineTypesQuery,
  useMachineNamesByTypeQuery,
} from "../server/tanstackQuery/useMachineTypes";

// Form state shape
interface RepairRequestFormState {
  formFilledBy: string;
  assignedTo: string;
  machineType: string;
  machineName: string;
  customMachine: string;
  issueDetail: string;
  task_start_date: string;
  part_replaced: string[];
}

const initialFormData: RepairRequestFormState = {
  formFilledBy: "",
  assignedTo: "",
  machineType: "",
  machineName: "",
  customMachine: "",
  issueDetail: "",
  task_start_date: new Date().toISOString().split("T")[0],
  part_replaced: [],
};

const STATIC_USERS = [
  "Pratap Kumar Rout",
  "Chhotu Bhaiya",
  "Prashant Kumar Sharma",
  "Rakesh Kumar Rout",
  "Other",
];

export function useRepairRequestForm() {
  const [formData, setFormData] =
    useState<RepairRequestFormState>(initialFormData);

  // ── Data queries ──────────────────────────────────────────────
  const requestByUsers = STATIC_USERS;
  const assignToUsers = ["Pratap Kumar Rout", "muzammil"];

  const { isLoading: isUsersLoading } = { isLoading: false };

  const { data: machinesData = [], isLoading: isLoadingMachines } =
    useActiveMachinesQuery();

  // Fetch parts
  const { data: partsData = [], isLoading: isPartsLoading } = usePartsQuery();

  // Fetch dynamic machine types
  const { data: dbMachineTypes = [], isLoading: isMachineTypesLoading } =
    useMachineTypesQuery();

  // Find the selected Machine Type ID to fetch its names
  const selectedTypeObj = dbMachineTypes.find(
    (t) => t.type_name === formData.machineType,
  );

  // Fetch dynamic machine names for the selected type
  const { data: dbMachineNames = [], isLoading: isMachineNamesLoading } =
    useMachineNamesByTypeQuery(selectedTypeObj?.id);

  // Derived filtered machines based on the selected type
  const filteredMachines = useMemo(() => {
    if (!formData.machineType || !selectedTypeObj) return [];
    return dbMachineNames.map((n) => n.machine_name);
  }, [formData.machineType, dbMachineNames, selectedTypeObj]);

  // The types list
  const machineTypes = dbMachineTypes.map((t) => t.type_name);

  // ── Mutation ──────────────────────────────────────────────────
  const createMutation = useCreateRepairRequestMutation();

  // ── Overall loading ───────────────────────────────────────────
  const isLoading =
    (isUsersLoading && isLoadingMachines) || isMachineTypesLoading || isPartsLoading;
  const isSubmitting = createMutation.isPending;

  // ── Handlers ──────────────────────────────────────────────────
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;

      if (name === "machineType") {
        setFormData((prev) => ({
          ...prev,
          machineType: value,
          machineName: "", // Reset machine when type changes
          customMachine: "",
        }));
      } else if (name === "machineName") {
        setFormData((prev) => ({
          ...prev,
          machineName: value,
          customMachine: value === "other" ? prev.customMachine : "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    [],
  );

  const handlePartChange = useCallback((partName: string) => {
    setFormData((prev) => {
      const currentParts = prev.part_replaced || [];
      if (currentParts.includes(partName)) {
        return { ...prev, part_replaced: currentParts.filter((p) => p !== partName) };
      } else {
        return { ...prev, part_replaced: [...currentParts, partName] };
      }
    });
  }, []);

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (
        !formData.formFilledBy ||
        !formData.assignedTo ||
        !formData.issueDetail
      ) {
        toast.error("Please fill in all required fields");
        return;
      }

      const machineName = formData.customMachine || formData.machineName;
      if (!machineName) {
        toast.error("Please select or enter a machine name");
        return;
      }

      createMutation.mutate(
        {
          formFilledBy: formData.formFilledBy,
          assignedTo: formData.assignedTo,
          machineType: formData.machineType,
          machineName,
          issueDetail: formData.issueDetail,
          task_start_date: formData.task_start_date,
          part_replaced: formData.part_replaced,
        },
        {
          onSuccess: (result) => {
            if (result) {
              toast.success("Repair request submitted successfully!");
              handleReset();
            } else {
              toast.error("Failed to submit repair request. Please try again.");
            }
          },
          onError: () => {
            toast.error("Failed to submit repair request. Please try again.");
          },
        },
      );
    },
    [formData, createMutation, handleReset],
  );

  return {
    // State
    formData,
    // Data
    requestByUsers,
    assignToUsers,
    machineTypes,
    filteredMachines,
    partsData,
    // Loading
    isLoading,
    isSubmitting,
    // Handlers
    handleChange,
    handlePartChange,
    handleSubmit,
    handleReset,
  };
}
