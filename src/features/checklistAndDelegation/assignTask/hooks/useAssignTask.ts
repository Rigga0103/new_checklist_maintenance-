import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchUniqueDepartmentDataApi,
  fetchUniqueGivenByDataApi,
  fetchUniqueDoerNameDataApi,
  fetchWorkingDaysApi,
  pushAssignTaskApi,
} from "../server/api/assignTaskApi";
import { fetchActiveMachines } from "@/features/machineMaintenance/machines/server/api/machinesApi";
import {
  AssignTaskFormData,
  FrequencyOption,
  GeneratedTask,
} from "../types/types";

export type SectionType = "checklist" | "maintenance";

// Frequency options with labels and values
const FREQUENCIES: FrequencyOption[] = [
  { label: "One Time (No Recurrence)", value: "one-time" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Fortnightly", value: "fortnightly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Half Yearly", value: "half-yearly" },
  { label: "Yearly", value: "yearly" },
];

const initialFormData: AssignTaskFormData = {
  department: "",
  givenBy: "",
  assignTo: "",
  description: "",
  startDate: "",
  time: "09:00",
  frequency: "one-time",
  enableReminders: true,
  requireAttachment: false,
  endDate: "",
};

// Get current timestamp in DD/MM/YYYY HH:MM:SS format
const getCurrentTimestamp = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const year = now.getFullYear();
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  const second = now.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

// Format date and time for storage (YYYY-MM-DDTHH:MM:SS) - MATCHING LEGACY FORMAT
const formatDateTimeForStorage = (date: Date, time: string) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const timeWithSeconds = time + ":00";
  return `${year}-${month}-${day}T${timeWithSeconds}`;
};

// Format date to DD/MM/YYYY for working days comparison
const formatDateToDDMMYYYY = (date: Date) => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const addDays = (date: Date, days: number) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const addMonths = (date: Date, months: number) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const addYears = (date: Date, years: number) => {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
};

export interface UseAssignTaskReturn {
  // Data
  departments: string[];
  givenByList: string[];
  doerNames: string[];
  frequencies: FrequencyOption[];

  // Section toggle
  selectedSection: SectionType;
  setSelectedSection: (section: SectionType) => void;
  machineOptions: string[];

  // Form state
  formData: AssignTaskFormData;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedEndDate: Date | null;
  setSelectedEndDate: (date: Date | null) => void;
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;

  // Generated tasks
  generatedTasks: GeneratedTask[];
  accordionOpen: boolean;
  setAccordionOpen: (open: boolean) => void;

  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  isLoadingDoerNames: boolean;

  // Actions
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
  handleGenerate: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleReset: () => void;

  // Helpers
  getFormattedDate: (date: Date) => string;
  getFormattedDateTime: () => string;
}

export function useAssignTask(): UseAssignTaskReturn {
  // Data state
  const [departments, setDepartments] = useState<string[]>([]);
  const [givenByList, setGivenByList] = useState<string[]>([]);
  const [doerNames, setDoerNames] = useState<string[]>([]);
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  // Section toggle
  const [selectedSection, setSelectedSection] =
    useState<SectionType>("checklist");
  const [machineOptions, setMachineOptions] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState<AssignTaskFormData>(initialFormData);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Generated tasks
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [accordionOpen, setAccordionOpen] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDoerNames, setIsLoadingDoerNames] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [depts, givenBy, days] = await Promise.all([
          fetchUniqueDepartmentDataApi(),
          fetchUniqueGivenByDataApi(),
          fetchWorkingDaysApi(),
        ]);
        setDepartments(depts);
        setGivenByList(givenBy);
        setWorkingDays(days);
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Failed to load form data");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load machines when section is "maintenance"
  useEffect(() => {
    const loadMachines = async () => {
      if (selectedSection === "maintenance") {
        try {
          const machines = await fetchActiveMachines();
          setMachineOptions(machines.map((m) => m.machine_name));
        } catch (error) {
          console.error("Error loading machines:", error);
          setMachineOptions([]);
        }
      }
    };
    loadMachines();
  }, [selectedSection]);

  // Update default frequency when section changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      frequency: selectedSection === "checklist" ? "one-time" : "daily",
      department: "",
      endDate: "",
    }));
    setDoerNames([]);
    setGeneratedTasks([]);
    setSelectedDate(new Date()); // auto-fill today's date
    setSelectedEndDate(null);
    setAccordionOpen(false);
  }, [selectedSection]);

  // Load doer names - all users for maintenance, filtered by dept for checklist
  useEffect(() => {
    const loadDoerNames = async () => {
      if (selectedSection === "maintenance") {
        setIsLoadingDoerNames(true);
        try {
          const names = await fetchUniqueDoerNameDataApi("");
          setDoerNames(names);
        } catch (error) {
          console.error("Error loading doer names:", error);
          setDoerNames([]);
        } finally {
          setIsLoadingDoerNames(false);
        }
        return;
      }

      if (!formData.department) {
        setDoerNames([]);
        return;
      }

      setIsLoadingDoerNames(true);
      try {
        const names = await fetchUniqueDoerNameDataApi(formData.department);
        setDoerNames(names);
      } catch (error) {
        console.error("Error loading doer names:", error);
        setDoerNames([]);
      } finally {
        setIsLoadingDoerNames(false);
      }
    };

    loadDoerNames();
  }, [formData.department, selectedSection]);

  // Helpers
  const getFormattedDate = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const getFormattedDateTime = useCallback(() => {
    if (!selectedDate) return "Select date and time";
    const dateStr = getFormattedDate(selectedDate);
    return `${dateStr} at ${formData.time || "09:00"}`;
  }, [selectedDate, formData.time, getFormattedDate]);

  // Handle form changes
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  // Handle switch changes
  const handleSwitchChange = useCallback((name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  }, []);

  // --- Date Logic Helpers from Legacy Code ---

  const findNextWorkingDay = useCallback(
    (targetDate: Date): string | null => {
      const targetDateStr = formatDateToDDMMYYYY(targetDate);

      // If target date is a working day, return it
      if (workingDays.includes(targetDateStr)) {
        return targetDateStr;
      }

      // If no working days data, can't find next working day
      if (workingDays.length === 0) return null;

      // Find the next working day after target date
      const targetDateObj = new Date(
        targetDateStr.split("/").reverse().join("-"),
      );

      // Since workingDays is sorted roughly by date (or should be), we can iterate
      // But find is efficient enough for small datasets
      const nextWorkingDay = workingDays.find((day) => {
        const dayObj = new Date(day.split("/").reverse().join("-"));
        return dayObj > targetDateObj;
      });

      // If we found a next working day, return it.
      // If NOT found (e.g. end of calendar), return NULL to stop generation.
      return nextWorkingDay || null;
    },
    [workingDays],
  );

  const findEndOfWeekDate = useCallback(
    (date: Date, weekNumber: number): string | null => {
      const [targetDay, targetMonth, targetYear] = formatDateToDDMMYYYY(date)
        .split("/")
        .map(Number);

      // Filter working days for the target month
      const monthDays = workingDays.filter((day) => {
        const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
        return dayYear === targetYear && dayMonth === targetMonth;
      });

      if (monthDays.length === 0) return null;

      if (weekNumber === -1) {
        // Last week of month
        return monthDays[monthDays.length - 1];
      }

      // Group by weeks
      const weeks: Record<number, string[]> = {};
      monthDays.forEach((day) => {
        const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
        const weekNum = Math.ceil(dayDay / 7);
        if (!weeks[weekNum]) weeks[weekNum] = [];
        weeks[weekNum].push(day);
      });

      // Get the last day of the requested week
      const weekDays = weeks[weekNumber];
      return weekDays
        ? weekDays[weekDays.length - 1]
        : monthDays[monthDays.length - 1];
    },
    [workingDays],
  );

  // --- Generate Tasks Logic Matching Legacy ---
  const handleGenerate = useCallback(async () => {
    if (
      !selectedDate ||
      !formData.time ||
      !formData.assignTo ||
      !formData.description ||
      !formData.frequency
    ) {
      toast.error(
        "Please fill in all required fields including date and time.",
      );
      return;
    }

    if (workingDays.length === 0) {
      toast.error("Working days data not loaded yet. Please try again.");
      return;
    }

    const tasks: GeneratedTask[] = [];

    // For one-time tasks
    if (formData.frequency === "one-time") {
      const taskDateStr = findNextWorkingDay(selectedDate);

      if (!taskDateStr) {
        toast.error("Selected date is outside the working calendar range.");
        return;
      }

      const taskDateObj = new Date(taskDateStr.split("/").reverse().join("-"));
      const taskDateTimeStr = formatDateTimeForStorage(
        taskDateObj,
        formData.time,
      );

      tasks.push({
        id: 1,
        description: formData.description,
        department: formData.department,
        givenBy: formData.givenBy,
        assignTo: formData.assignTo,
        dueDate: taskDateTimeStr,
        status: "pending",
        frequency: formData.frequency,
        enableReminders: formData.enableReminders,
        requireAttachment: formData.requireAttachment,
        endDate: selectedEndDate
          ? formatDateTimeForStorage(selectedEndDate, formData.time)
          : undefined,
      });
    } else {
      // For recurring tasks
      let currentDate = new Date(selectedDate);
      const endDate = addYears(currentDate, 2); // Generate up to 2 years ahead
      let taskCount = 0;
      const maxTasks = 365; // Safety limit - but loop will break if no working days found

      while (currentDate <= endDate && taskCount < maxTasks) {
        let taskDate: string | null | undefined = null;

        switch (formData.frequency) {
          case "daily":
            taskDate = findNextWorkingDay(currentDate);
            // Don't advance currentDate here if taskDate is null, logic below handles break
            if (taskDate) {
              currentDate = addDays(
                new Date(taskDate.split("/").reverse().join("-")),
                1,
              );
            }
            break;

          case "weekly":
            taskDate = findNextWorkingDay(currentDate);
            if (taskDate) {
              currentDate = addDays(
                new Date(taskDate.split("/").reverse().join("-")),
                7,
              );
            }
            break;

          case "fortnightly":
            taskDate = findNextWorkingDay(currentDate);
            if (taskDate) {
              currentDate = addDays(
                new Date(taskDate.split("/").reverse().join("-")),
                14,
              );
            }
            break;

          case "monthly":
            taskDate = findNextWorkingDay(currentDate);
            if (taskDate) {
              currentDate = addMonths(
                new Date(taskDate.split("/").reverse().join("-")),
                1,
              );
            }
            break;

          case "quarterly":
            taskDate = findNextWorkingDay(currentDate);
            if (taskDate) {
              currentDate = addMonths(
                new Date(taskDate.split("/").reverse().join("-")),
                3,
              );
            }
            break;

          case "half-yearly":
            taskDate = findNextWorkingDay(currentDate);
            if (taskDate) {
              currentDate = addMonths(
                new Date(taskDate.split("/").reverse().join("-")),
                6,
              );
            }
            break;

          case "yearly":
            taskDate = findNextWorkingDay(currentDate);
            if (taskDate) {
              currentDate = addYears(
                new Date(taskDate.split("/").reverse().join("-")),
                1,
              );
            }
            break;

          case "end-of-1st-week":
          case "end-of-2nd-week":
          case "end-of-3rd-week":
          case "end-of-4th-week":
            const weekNum = parseInt(formData.frequency.split("-")[2]);
            taskDate = findEndOfWeekDate(currentDate, weekNum);
            if (taskDate) {
              currentDate = addMonths(
                new Date(taskDate.split("/").reverse().join("-")),
                1,
              );
            }
            break;

          case "end-of-last-week":
            taskDate = findEndOfWeekDate(currentDate, -1);
            if (taskDate) {
              currentDate = addMonths(
                new Date(taskDate.split("/").reverse().join("-")),
                1,
              );
            }
            break;

          default:
            currentDate = endDate; // Exit loop for unknown frequencies
            break;
        }

        // If no valid working day found (end of calendar), STOP generating
        if (!taskDate) {
          break;
        }

        if (taskDate) {
          const taskDateObj = new Date(taskDate.split("/").reverse().join("-"));
          const taskDateTimeStr = formatDateTimeForStorage(
            taskDateObj,
            formData.time,
          );

          tasks.push({
            id: taskCount + 1,
            description: formData.description,
            department: formData.department,
            givenBy: formData.givenBy,
            assignTo: formData.assignTo,
            dueDate: taskDateTimeStr,
            status: "pending",
            frequency: formData.frequency,
            enableReminders: formData.enableReminders,
            requireAttachment: formData.requireAttachment,
          });

          taskCount++;
        }
      }
    }

    setGeneratedTasks(tasks);
    setAccordionOpen(true);
    toast.success(`${tasks.length} task preview(s) generated!`);
  }, [
    selectedDate,
    selectedEndDate,
    formData,
    workingDays,
    findNextWorkingDay,
    findEndOfWeekDate,
  ]);

  // Submit tasks
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        if (generatedTasks.length === 0) {
          toast.error(
            "Please generate tasks first by clicking Preview Generated Tasks",
          );
          return;
        }

        if (!formData.department || formData.department.trim() === "") {
          toast.error("Please select a department before submitting");
          return;
        }

        // Use the original GeneratedTask directly - the API handles mapping
        const result = await pushAssignTaskApi(generatedTasks, selectedSection);

        if (result.success) {
          toast.success(result.message);

          // Reset form
          setFormData({
            ...initialFormData,
            frequency: selectedSection === "checklist" ? "one-time" : "daily",
          });
          setSelectedDate(new Date());
          setGeneratedTasks([]);
          setAccordionOpen(false);
        } else {
          toast.error(result.message || "Failed to submit tasks");
        }
      } catch (error) {
        console.error("Submission error:", error);
        toast.error("Failed to assign tasks. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [generatedTasks, formData.department, selectedSection],
  );

  // Reset form
  const handleReset = useCallback(() => {
    setFormData({
      ...initialFormData,
      frequency: selectedSection === "checklist" ? "one-time" : "daily",
    });
    setSelectedDate(new Date());
    setSelectedEndDate(null);
    setGeneratedTasks([]);
    setAccordionOpen(false);
  }, [selectedSection]);

  return {
    // Data
    departments,
    givenByList,
    doerNames,
    frequencies:
      selectedSection === "checklist"
        ? FREQUENCIES
        : FREQUENCIES.filter((f) => f.value !== "one-time"),

    // Section toggle
    selectedSection,
    setSelectedSection,
    machineOptions,

    // Form state
    formData,
    selectedDate,
    setSelectedDate,
    selectedEndDate,
    setSelectedEndDate,
    showCalendar,
    setShowCalendar,

    // Generated tasks
    generatedTasks,
    accordionOpen,
    setAccordionOpen,

    // Loading states
    isLoading,
    isSubmitting,
    isLoadingDoerNames,

    // Actions
    handleChange,
    handleSwitchChange,
    handleGenerate,
    handleSubmit,
    handleReset,

    // Helpers
    getFormattedDate,
    getFormattedDateTime,
  };
}
