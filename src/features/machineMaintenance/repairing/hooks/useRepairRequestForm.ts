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
  customPart: string;
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
  customPart: "",
};

const STATIC_USERS = [
  "Pratap Kumar Rout",
  "Chhotu Bhaiya",
  "Kamal Sharma",
  "Rakesh Kumar Rout",
  "Other",
];

export function useRepairRequestForm() {
  const [formData, setFormData] =
    useState<RepairRequestFormState>(initialFormData);

  // ── Data queries ──────────────────────────────────────────────
  const requestByUsers = STATIC_USERS;
  const assignToUsers = ["Pratap Kumar Rout", "Kamal Sharma", "muzammil"];

  const { isLoading: isUsersLoading } = { isLoading: false };

  const { data: machinesData = [], isLoading: isLoadingMachines } =
    useActiveMachinesQuery();

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch parts
  const { data: partsData = [], isLoading: isPartsLoading } = usePartsQuery(searchTerm);

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
    (isUsersLoading && isLoadingMachines) || isMachineTypesLoading;
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
      const isSelected = currentParts.includes(partName);

      let nextParts: string[];
      if (isSelected) {
        nextParts = currentParts.filter((p) => p !== partName);
      } else {
        nextParts = [...currentParts, partName];
      }

      return {
        ...prev,
        part_replaced: nextParts,
        customPart: nextParts.includes("other") ? prev.customPart : "",
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setSearchTerm("");
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

      let partsList = [...(formData.part_replaced || [])];

      // Handle the "other" manual entry
      if (partsList.includes("other")) {
        // Remove the placeholder "other"
        partsList = partsList.filter((p) => p !== "other");

        // Split custom parts by comma and add them individually
        if (formData.customPart.trim()) {
          const manualParts = formData.customPart
            .split(",")
            .map(p => p.trim())
            .filter(p => p !== "");
          partsList = [...partsList, ...manualParts];
        }
      }

      // If still empty, ensure we send at least one entry (the backend handles null/empty if handled there, 
      // but the API I saw maps onto the array length)
      if (partsList.length === 0) {
        partsList = []; // Backend createRepairRequest uses [null] if empty
      }

      createMutation.mutate(
        {
          formFilledBy: formData.formFilledBy,
          assignedTo: formData.assignedTo,
          machineType: formData.machineType,
          machineName,
          issueDetail: formData.issueDetail,
          task_start_date: formData.task_start_date,
          part_replaced: partsList,
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
    searchTerm,
    setSearchTerm,
    isPartsLoading,
  };
}
