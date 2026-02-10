import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useActiveMachinesQuery } from "../../machines/server/tanstackQuery/useMachineQueries";
import {
  useActiveUserNamesQuery,
  useCreateRepairRequestMutation,
} from "../server/tanstackQuery/useRepairingQueries";

// Form state shape
interface RepairRequestFormState {
  formFilledBy: string;
  assignedTo: string;
  machineName: string;
  customMachine: string;
  issueDetail: string;
}

const initialFormData: RepairRequestFormState = {
  formFilledBy: "",
  assignedTo: "",
  machineName: "",
  customMachine: "",
  issueDetail: "",
};

export function useRepairRequestForm() {
  const [formData, setFormData] = useState<RepairRequestFormState>(initialFormData);

  // Load current user from localStorage
  useEffect(() => {
    const username = localStorage.getItem("user-name");
    if (username) {
      setFormData((prev) => ({ ...prev, formFilledBy: username }));
    }
  }, []);

  // ── Data queries ──────────────────────────────────────────────
  const { data: usersData = [], isLoading: isLoadingUsers } =
    useActiveUserNamesQuery();
  const { data: machinesData = [], isLoading: isLoadingMachines } =
    useActiveMachinesQuery();

  const machines = machinesData.map((m) => m.machine_name);

  // ── Mutation ──────────────────────────────────────────────────
  const createMutation = useCreateRepairRequestMutation();

  // ── Overall loading ───────────────────────────────────────────
  const isLoading = isLoadingUsers && isLoadingMachines;
  const isSubmitting = createMutation.isPending;

  // ── Handlers ──────────────────────────────────────────────────
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;

      if (name === "machineName") {
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

  const handleReset = useCallback(() => {
    setFormData((prev) => ({
      ...initialFormData,
      formFilledBy: prev.formFilledBy,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (!formData.assignedTo || !formData.issueDetail) {
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
          machineName,
          issueDetail: formData.issueDetail,
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
    users: usersData,
    machines,
    // Loading
    isLoading,
    isSubmitting,
    // Handlers
    handleChange,
    handleSubmit,
    handleReset,
  };
}
