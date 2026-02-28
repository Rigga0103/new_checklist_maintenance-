import { useState, useEffect, useCallback, useMemo } from "react";
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
  motorName: string;
  customMachine: string;
  issueDetail: string;
}

const initialFormData: RepairRequestFormState = {
  formFilledBy: "",
  assignedTo: "",
  machineName: "",
  motorName: "",
  customMachine: "",
  issueDetail: "",
};

// Machine to Motor Mapping
const MACHINE_MOTORS: Record<string, string[]> = {
  "65/18": [
    "Pipe65/18 vaccum 3 (3hp)",
    "61/18 vaccum motor (3hp)",
    "68/18 vaccum motor (3hp)",
    "65/18 fedder motor (5hp)",
    "65/18 Water motor (7.5hp)",
    "65/18 cutter motor (1.5hp)",
    "65/18 mixer motor (50/65 HZ)",
    "65/18 mixer coller motor (5hp)",
    "65/18 oil pump (3hp)",
  ],
  "52/18": [
    "52/18 vaccum motor (3/hp)",
    "52/18 vaccum motor (3hp)",
    "52/18 water motor (7.5hp)",
    "52/18 cutter motor (1.5hp)",
    "52/18 main motor (50/55 HZ)",
    "52/18 oil pump (3hp)",
    "52/18 exuder motor (45/50 hz)", // Inferred from C/c having similar names, assuming user data snippet implied context
  ],
  "C/C": [
    "C/c exuder motor (45/50 hz)",
    "Cc vaccum motor (1.5 hp)",
    "C/c cutter motor (1.5hp)",
  ],
  Polvizer: [
    "Polvizer main motor (75hp)",
    "Polvizer blower motor (15hp)",
    "Polvizer feeder motor (2hp)",
    "Polvizer air lock motor (1hp)",
  ],
  A: ["Main motor (11.5 kw)"],
  B: ["Main motor (11.5 kw)"],
  C: ["Main motor (20hp)"],
  D: ["Main motor (11.5kw)"],
  E: ["Main motor (12hp)"],
  F: ["Oil motor (3 hp)", "Main motor (10kw)"],
  G: ["Oil motor (3hp)", "Main motor (10kw)"],
  H: ["Oil motor (3hp)", "Main motor (10Hp)"],
  I: ["Oil motor (3hp)", "Main motor (10kw)"],
  Imm: ["Colling tower motor (3hp)", "Water motor (7.5hp)"],
  Pipe: ["Colling tower motor (3hp)", "Main motor (7.5hp)"],
  "Mixer 200kg": ["Mixer 200kg main motor (40hp/30kw)"],
  "Mixer 500kg": [
    "Mixer main motor (60hp)",
    "Mixer coller motor  (5hp)",
    "Mixer screw motor (2hp)",
    "Mixer 500kg new panel (Display)",
    "Mixer 500kg old panel (Display)",
  ],
  "Chiller 1&2": [
    "Chiller 1&2 water pump (5hp)",
    "Chiller 1&2 compressor (20hp)",
  ],
  "Chiller 3": ["Chiller 3 water pump (5hp)", "Chiller 3 compressor (20hp)"],
  "Grinder 1": ["Grinder 1 main motor (15hp)", "Grinder 1 blower motor (3hp)"],
  "Grinder 2": ["Grinder 2 main motor (20hp)", "Grinder 2 blower motor (5hp)"],
  "Cutter 1": ["Cutter 1 main motor (3hp)"],
  "Cutter 2": ["Cutter 2 main motor (5hp)"],
  "Cutter 3": ["Cutter 3 main motor (5hp)"],
  "Compressor 1": ["Compressor 1 main motor (15hp)"],
  "Compressor 2": ["Compressor 2 main motor (15hp)"],
  "Compressor 3": ["Compressor 3 main motor (7.5hp)"],
  "Extruder 1": [
    "Extruder 1 main motor (15hp)",
    "Extruder 1 heater (all)",
    "Extruder 1 blower",
  ],
  "Extruder 2": [
    "Extruder 2 main motor (15hp)",
    "Extruder 2 heater (all)",
    "Extruder 2 blower",
  ],
  "Extruder 3": [
    "Extruder 3 main motor (15hp)",
    "Extruder 3 heater (all)",
    "Extruder 3 blower",
  ],
  Printer: [
    "Printer main motor (2hp)",
    "Printer blower (1hp)",
    "Printer heater",
  ],
  "Hau-off": ["Hau-off main motor (3hp)"],
  "Belling machine": [
    "Belling machine hydrolic pump (2hp) ",
    "Belling machine heater",
  ],
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
  const assignToUsers = ["Pratap Kumar Rout","muzammil"];

  const { isLoading: isUsersLoading } = { isLoading: false };

  const { data: machinesData = [], isLoading: isLoadingMachines } =
    useActiveMachinesQuery();

  const machines = machinesData.map((m) => m.machine_name);

  // ── Mutation ──────────────────────────────────────────────────
  const createMutation = useCreateRepairRequestMutation();

  // ── Overall loading ───────────────────────────────────────────
  const isLoading = isUsersLoading && isLoadingMachines;
  const isSubmitting = createMutation.isPending;

  // ── Derived State ─────────────────────────────────────────────
  const availableMotors = useMemo(() => {
    if (!formData.machineName) return [];
    // Try to match exact machine name, or handle variations if needed
    // For now assuming exact match from dropdown
    const motors = MACHINE_MOTORS[formData.machineName] || [];
    // Also try case-insensitive match just in case
    if (motors.length === 0) {
      const key = Object.keys(MACHINE_MOTORS).find(
        (k) => k.toLowerCase() === formData.machineName.toLowerCase(),
      );
      return key ? MACHINE_MOTORS[key] : [];
    }
    return motors;
  }, [formData.machineName]);

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
          motorName: "", // Reset motor when machine changes
          customMachine: value === "other" ? prev.customMachine : "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    [],
  );

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
          machineName,
          motorName: formData.motorName || undefined,
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
    availableMotors,
    // Data
    requestByUsers,
    assignToUsers,
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
