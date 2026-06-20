"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  ChevronDown,
  Filter,
  Trash2,
  Edit,
  Save,
  X,
  RefreshCw,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useChecklistTasksQuery,
  useDelegationTasksQuery,
  useUsers,
  useDeleteChecklistTasks,
  useUpdateChecklistTask,
  useDeleteDelegationTasks,
  useUpdateDelegationTask,
  useMaintenanceTasksQuery,
  useDeleteMaintenanceTasks,
  useUpdateMaintenanceTask,
} from "../server/tanstackQuery/useQuickTask";
import { QuickTaskSkeleton } from "./QuickTaskSkeleton";
import type { ChecklistTask, DelegationTask, MaintenanceTask, MaintenanceUpdatePayload, MaintenanceOriginalMatch } from "../types/types";
import { uploadChecklistImage } from "../../checklist/server/api/checklistUploadApi";
import supabase from "@/utils/supabaseClient";
import { fetchWorkingDaysApi } from "../../assignTask/server/api/assignTaskApi";

// Date and recurrence helpers for checklist generation
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

const formatDateTimeForStorage = (date: Date, time: string) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const timeWithSeconds = time + ":00";
  return `${year}-${month}-${day}T${timeWithSeconds}`;
};

const findNextWorkingDay = (targetDate: Date, workingDays: string[]): string | null => {
  const targetDateStr = formatDateToDDMMYYYY(targetDate);
  if (workingDays.includes(targetDateStr)) {
    return targetDateStr;
  }
  if (workingDays.length === 0) return null;
  const targetDateObj = new Date(targetDateStr.split("/").reverse().join("-"));
  const nextWorkingDay = workingDays.find((day) => {
    const dayObj = new Date(day.split("/").reverse().join("-"));
    return dayObj > targetDateObj;
  });
  return nextWorkingDay || null;
};

const findEndOfWeekDate = (date: Date, weekNumber: number, workingDays: string[]): string | null => {
  const [targetDay, targetMonth, targetYear] = formatDateToDDMMYYYY(date)
    .split("/")
    .map(Number);
  const monthDays = workingDays.filter((day) => {
    const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
    return dayYear === targetYear && dayMonth === targetMonth;
  });
  if (monthDays.length === 0) return null;
  if (weekNumber === -1) {
    return monthDays[monthDays.length - 1];
  }
  const weeks: Record<number, string[]> = {};
  monthDays.forEach((day) => {
    const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
    const weekNum = Math.ceil(dayDay / 7);
    if (!weeks[weekNum]) weeks[weekNum] = [];
    weeks[weekNum].push(day);
  });
  const weekDays = weeks[weekNumber];
  return weekDays ? weekDays[weekDays.length - 1] : monthDays[monthDays.length - 1];
};

const generateTasksForDb = (
  originalTask: ChecklistTask,
  editFormData: Partial<ChecklistTask>,
  startDate: Date,
  endDate: Date,
  taskTime: string,
  workingDays: string[],
  assigneeUserId: number | null,
  createdByUserId: number | null
) => {
  // Prefer editFormData.frequency so frequency changes are reflected in new tasks
  const frequency = editFormData.frequency ?? originalTask.frequency ?? "one-time";
  const tasksToInsert: any[] = [];

  const department = editFormData.department !== undefined ? editFormData.department : originalTask.department;
  const given_by = editFormData.given_by !== undefined ? editFormData.given_by : originalTask.given_by;
  const name = editFormData.name !== undefined ? editFormData.name : originalTask.name;
  const task_description = editFormData.task_description !== undefined ? editFormData.task_description : originalTask.task_description;
  const enable_reminder = editFormData.enable_reminder !== undefined ? editFormData.enable_reminder : originalTask.enable_reminder;
  const require_attachment = editFormData.require_attachment !== undefined ? editFormData.require_attachment : originalTask.require_attachment;
  const remark = editFormData.remark !== undefined ? editFormData.remark : originalTask.remark;
  const sample_image = editFormData.image !== undefined ? editFormData.image : (originalTask.sample_image || originalTask.image || null);

  const baseTaskData = {
    source_unique_id: originalTask.task_id,
    department,
    given_by,
    name,
    task_description,
    enable_reminder,
    require_attachment,
    remark,
    sample_image,
    frequency,
    assignee_user_id: assigneeUserId,
    created_by_user_id: createdByUserId,
    created_at: new Date().toISOString(),
  };

  if (frequency === "one-time") {
    const taskDateStr = findNextWorkingDay(startDate, workingDays);
    if (taskDateStr) {
      const taskDateObj = new Date(taskDateStr.split("/").reverse().join("-"));
      const taskDateTimeStr = formatDateTimeForStorage(taskDateObj, taskTime);
      tasksToInsert.push({
        ...baseTaskData,
        task_start_date: taskDateTimeStr,
      });
    }
  } else {
    let currentDate = new Date(startDate);
    let taskCount = 0;
    const maxTasks = 365;

    while (currentDate <= endDate && taskCount < maxTasks) {
      let taskDate: string | null = null;

      switch (frequency) {
        case "daily":
          taskDate = findNextWorkingDay(currentDate, workingDays);
          if (taskDate) {
            currentDate = addDays(new Date(taskDate.split("/").reverse().join("-")), 1);
          }
          break;

        case "weekly":
          taskDate = findNextWorkingDay(currentDate, workingDays);
          if (taskDate) {
            currentDate = addDays(new Date(taskDate.split("/").reverse().join("-")), 7);
          }
          break;

        case "fortnightly":
          taskDate = findNextWorkingDay(currentDate, workingDays);
          if (taskDate) {
            currentDate = addDays(new Date(taskDate.split("/").reverse().join("-")), 14);
          }
          break;

        case "monthly":
          taskDate = findNextWorkingDay(currentDate, workingDays);
          if (taskDate) {
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 1);
          }
          break;

        case "quarterly":
          taskDate = findNextWorkingDay(currentDate, workingDays);
          if (taskDate) {
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 3);
          }
          break;

        case "half-yearly":
          taskDate = findNextWorkingDay(currentDate, workingDays);
          if (taskDate) {
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 6);
          }
          break;

        case "yearly":
          taskDate = findNextWorkingDay(currentDate, workingDays);
          if (taskDate) {
            currentDate = addYears(new Date(taskDate.split("/").reverse().join("-")), 1);
          }
          break;

        case "end-of-1st-week":
        case "end-of-2nd-week":
        case "end-of-3rd-week":
        case "end-of-4th-week":
          const weekNum = parseInt(frequency.split("-")[2]);
          taskDate = findEndOfWeekDate(currentDate, weekNum, workingDays);
          if (taskDate) {
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 1);
          }
          break;

        case "end-of-last-week":
          taskDate = findEndOfWeekDate(currentDate, -1, workingDays);
          if (taskDate) {
            currentDate = addMonths(new Date(taskDate.split("/").reverse().join("-")), 1);
          }
          break;

        default:
          currentDate = endDate;
          break;
      }

      if (!taskDate) {
        break;
      }

      const taskDateObj = new Date(taskDate.split("/").reverse().join("-"));
      const taskDateTimeStr = formatDateTimeForStorage(taskDateObj, taskTime);
      tasksToInsert.push({
        ...baseTaskData,
        task_start_date: taskDateTimeStr,
      });

      taskCount++;
    }
  }

  return tasksToInsert;
};

export default function MainQuickTask() {
  const [activeTab, setActiveTab] = useState<"checklist" | "delegation" | "maintenance">(
    "checklist",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [freqFilter, setFreqFilter] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState({
    name: false,
    frequency: false,
  });
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [selectedTasks, setSelectedTasks] = useState<ChecklistTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ChecklistTask>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedDelegationTasks, setSelectedDelegationTasks] = useState<DelegationTask[]>([]);
  const [delegationEditingId, setDelegationEditingId] = useState<number | null>(null);

  const [selectedMaintenanceTasks, setSelectedMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [maintenanceEditingId, setMaintenanceEditingId] = useState<number | null>(null);
  const [maintenanceEditFormData, setMaintenanceEditFormData] = useState<Partial<MaintenanceTask>>({});
  const [maintenancePage, setMaintenancePage] = useState(0);
  const [delegationEditFormData, setDelegationEditFormData] = useState<
    Partial<DelegationTask>
  >({});

  // Delete Confirmation State
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<
    ChecklistTask | DelegationTask | MaintenanceTask | null
  >(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);

  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "";
  });

  // Pagination State
  const [checklistPage, setChecklistPage] = useState(0);
  const [delegationPage, setDelegationPage] = useState(0);
  const pageSize = 50;

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // TanStack Query hooks (Paginated)
  const { data: checklistResponse, isLoading: checklistLoading } =
    useChecklistTasksQuery(checklistPage, pageSize, nameFilter);

  const { data: delegationResponse, isLoading: delegationLoading } =
    useDelegationTasksQuery(delegationPage, pageSize, nameFilter);

  const { data: maintenanceResponse, isLoading: maintenanceLoading } =
    useMaintenanceTasksQuery(maintenancePage, pageSize, nameFilter);

  const { data: usersData } = useUsers();

  // Mutations
  const deleteChecklistMutation = useDeleteChecklistTasks();
  const updateChecklistMutation = useUpdateChecklistTask();
  const deleteDelegationMutation = useDeleteDelegationTasks();
  const updateDelegationMutation = useUpdateDelegationTask();
  const deleteMaintenanceMutation = useDeleteMaintenanceTasks();
  const updateMaintenanceMutation = useUpdateMaintenanceTask();

  // Data
  const checklistTasks = checklistResponse?.data || [];
  const checklistTotal = checklistResponse?.total || 0;

  const delegationTasks = delegationResponse?.data || [];
  const delegationTotal = delegationResponse?.total || 0;

  const maintenanceTasks = maintenanceResponse?.data || [];
  const maintenanceTotal = maintenanceResponse?.total || 0;

  const allNames = usersData?.map((u) => u.user_name) || [];

  // Re-sync if localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setUserRole(localStorage.getItem("role") || "");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const filteredChecklistTasks = useMemo(() => {
    // Unique by task_id (safety check on current page)
    const unique = Array.from(
      new Map(checklistTasks.map((t) => [t.task_id, t])).values(),
    );

    let filtered = unique;
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.task_description?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (freqFilter) {
      filtered = filtered.filter((t) => t.frequency === freqFilter);
    }
    return filtered;
  }, [checklistTasks, searchTerm, freqFilter]);

  const filteredDelegationTasks = useMemo(() => {
    const unique = Array.from(
      new Map(delegationTasks.map((t) => [t.task_id, t])).values(),
    );
    let filtered = unique;
    if (searchTerm) filtered = filtered.filter((t) => t.task_description?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (freqFilter) filtered = filtered.filter((t) => t.frequency === freqFilter);
    return filtered;
  }, [delegationTasks, searchTerm, freqFilter]);

  const filteredMaintenanceTasks = useMemo(() => {
    const unique = Array.from(
      new Map(maintenanceTasks.map((t) => [t.task_id, t])).values(),
    );
    let filtered = unique;
    if (searchTerm) filtered = filtered.filter((t) => t.task_description?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (freqFilter) filtered = filtered.filter((t) => t.frequency === freqFilter);
    return filtered;
  }, [maintenanceTasks, searchTerm, freqFilter]);

  const tasks =
    activeTab === "checklist"
      ? filteredChecklistTasks
      : activeTab === "delegation"
        ? filteredDelegationTasks
        : filteredMaintenanceTasks;

  const isLoading =
    activeTab === "checklist" ? checklistLoading
      : activeTab === "delegation" ? delegationLoading
        : maintenanceLoading;

  // Pagination helpers
  const currentPage =
    activeTab === "checklist" ? checklistPage
      : activeTab === "delegation" ? delegationPage
        : maintenancePage;
  const totalCount =
    activeTab === "checklist" ? checklistTotal
      : activeTab === "delegation" ? delegationTotal
        : maintenanceTotal;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleNextPage = () => {
    if (activeTab === "checklist") setChecklistPage((p) => Math.min(p + 1, totalPages - 1));
    else if (activeTab === "delegation") setDelegationPage((p) => Math.min(p + 1, totalPages - 1));
    else setMaintenancePage((p) => Math.min(p + 1, totalPages - 1));
  };

  const handlePrevPage = () => {
    if (activeTab === "checklist") setChecklistPage((p) => Math.max(0, p - 1));
    else if (activeTab === "delegation") setDelegationPage((p) => Math.max(0, p - 1));
    else setMaintenancePage((p) => Math.max(0, p - 1));
  };

  const allFrequencies = ["daily", "weekly", "monthly", "one-time", "yearly", "quarterly", "fortnightly"];

  // Format date
  const formatDate = (dateStr: string | null) => {
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
  };

  // Checkbox handlers
  const handleCheckboxChange = (task: ChecklistTask | DelegationTask | MaintenanceTask) => {
    if (activeTab === "checklist") {
      const cTask = task as ChecklistTask;
      if (selectedTasks.find((t) => t.task_id === cTask.task_id)) {
        setSelectedTasks(selectedTasks.filter((t) => t.task_id !== cTask.task_id));
      } else {
        setSelectedTasks([...selectedTasks, cTask]);
      }
    } else if (activeTab === "delegation") {
      const dTask = task as DelegationTask;
      if (selectedDelegationTasks.find((t) => t.task_id === dTask.task_id)) {
        setSelectedDelegationTasks(selectedDelegationTasks.filter((t) => t.task_id !== dTask.task_id));
      } else {
        setSelectedDelegationTasks([...selectedDelegationTasks, dTask]);
      }
    } else {
      const mTask = task as MaintenanceTask;
      if (selectedMaintenanceTasks.find((t) => t.task_id === mTask.task_id)) {
        setSelectedMaintenanceTasks(selectedMaintenanceTasks.filter((t) => t.task_id !== mTask.task_id));
      } else {
        setSelectedMaintenanceTasks([...selectedMaintenanceTasks, mTask]);
      }
    }
  };

  const handleSelectAll = () => {
    if (activeTab === "checklist") {
      if (selectedTasks.length === filteredChecklistTasks.length) {
        setSelectedTasks([]);
      } else {
        setSelectedTasks([...filteredChecklistTasks]);
      }
    } else if (activeTab === "delegation") {
      if (selectedDelegationTasks.length === filteredDelegationTasks.length) {
        setSelectedDelegationTasks([]);
      } else {
        setSelectedDelegationTasks([...filteredDelegationTasks]);
      }
    } else {
      if (selectedMaintenanceTasks.length === filteredMaintenanceTasks.length) {
        setSelectedMaintenanceTasks([]);
      } else {
        setSelectedMaintenanceTasks([...filteredMaintenanceTasks]);
      }
    }
  };

  // Delete handlers
  const confirmDeleteTask = (task: ChecklistTask | DelegationTask | MaintenanceTask) => {
    setDeleteConfirmTask(task);
  };

  const confirmBulkDelete = () => {
    if (activeTab === "checklist" && selectedTasks.length === 0) return;
    if (activeTab === "delegation" && selectedDelegationTasks.length === 0) return;
    if (activeTab === "maintenance" && selectedMaintenanceTasks.length === 0) return;
    setIsBulkDeleteConfirm(true);
  };

  const executeDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    try {
      if (activeTab === "checklist") {
        await deleteChecklistMutation.mutateAsync([deleteConfirmTask as ChecklistTask]);
      } else if (activeTab === "delegation") {
        await deleteDelegationMutation.mutateAsync([deleteConfirmTask as DelegationTask]);
      } else {
        await deleteMaintenanceMutation.mutateAsync([deleteConfirmTask as MaintenanceTask]);
      }
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  const executeBulkDelete = async () => {
    try {
      if (activeTab === "checklist") {
        if (selectedTasks.length === 0) return;
        await deleteChecklistMutation.mutateAsync(selectedTasks);
        setSelectedTasks([]);
        toast.success(`Deleted ${selectedTasks.length} tasks`);
      } else if (activeTab === "delegation") {
        if (selectedDelegationTasks.length === 0) return;
        await deleteDelegationMutation.mutateAsync(selectedDelegationTasks);
        setSelectedDelegationTasks([]);
        toast.success(`Deleted ${selectedDelegationTasks.length} tasks`);
      } else {
        if (selectedMaintenanceTasks.length === 0) return;
        await deleteMaintenanceMutation.mutateAsync(selectedMaintenanceTasks);
        setSelectedMaintenanceTasks([]);
        toast.success(`Deleted ${selectedMaintenanceTasks.length} tasks`);
      }
    } catch {
      toast.error("Failed to delete tasks");
    } finally {
      setIsBulkDeleteConfirm(false);
    }
  };

  // Edit handlers
  const handleEditClick = (task: ChecklistTask) => {
    setEditingTaskId(task.task_id);
    setEditFormData({ ...task, image: task.sample_image || task.image });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!editFormData.task_id) return;
    const originalTask = checklistTasks.find(
      (t) => t.task_id === editFormData.task_id,
    );
    if (!originalTask) return;

    // Detect if frequency changed — if so we always wipe and regenerate
    const frequencyChanged =
      editFormData.frequency !== undefined &&
      editFormData.frequency !== originalTask.frequency;

    try {
      const oldDateStr = originalTask.task_start_date ? new Date(originalTask.task_start_date).toISOString().split("T")[0] : null;
      const newDateStr = editFormData.task_start_date ? new Date(editFormData.task_start_date).toISOString().split("T")[0] : null;

      // Only shift dates when frequency has NOT changed (frequency change wipes & regenerates anyway)
      // If start date changed → wipe pending tasks and regenerate using new date
      const startDateChanged =
        oldDateStr &&
        newDateStr &&
        oldDateStr !== newDateStr;

      if (startDateChanged) {
        const { error: deleteError } = await supabase
          .from("checklist")
          .delete()
          .eq("source_unique_id", originalTask.task_id)
          .is("submission_date", null);

        if (deleteError) {
          throw deleteError;
        }
      }

      // Pass frequency to the mutation — API will update the template and wipe pending instances
      await updateChecklistMutation.mutateAsync({
        updatedTask: {
          department: editFormData.department || undefined,
          given_by: editFormData.given_by || undefined,
          name: editFormData.name || undefined,
          task_description: editFormData.task_description || undefined,
          enable_reminder:
            (editFormData.enable_reminder as "yes" | "no" | undefined) ||
            undefined,
          require_attachment:
            (editFormData.require_attachment as "yes" | "no" | undefined) ||
            undefined,
          remark: editFormData.remark || undefined,
          image: editFormData.image || undefined,
          task_start_date: editFormData.task_start_date || undefined,
          // Always pass frequency so the template is kept in sync
          frequency: editFormData.frequency || undefined,
        },
        originalTask: {
          task_id: originalTask.task_id,
          department: originalTask.department || "",
          name: originalTask.name || "",
          task_description: originalTask.task_description || "",
        },
      });

      // When frequency changed the API already wiped pending instances above.
      // We always regenerate tasks from scratch in that case.
      // When frequency did NOT change, only generate if no instances exist yet.
      let shouldGenerate =
        frequencyChanged || startDateChanged;

      if (!shouldGenerate) {
        // Check if any pending instances already exist
        const { data: existingChecklist, error: checkError } = await supabase
          .from("checklist")
          .select("task_id")
          .eq("source_unique_id", originalTask.task_id)
          .limit(1);

        if (checkError) {
          console.error("Error checking checklist:", checkError);
        }

        if (
          !frequencyChanged &&
          !startDateChanged
        ) {
          const { data: existingChecklist } =
            await supabase
              .from("checklist")
              .select("task_id")
              .eq(
                "source_unique_id",
                originalTask.task_id
              )
              .limit(1);

          shouldGenerate =
            !existingChecklist?.length;
        }
      }

      if (shouldGenerate) {
        // Fetch working days calendar
        const workingDays = await fetchWorkingDaysApi();

        // Resolve user ids for assignee and creator
        let assigneeUserId = null;
        let createdByUserId = null;

        const nameToSearch = editFormData.name || originalTask.name;
        const givenByToSearch = editFormData.given_by || originalTask.given_by;

        const usersToSearch = [nameToSearch, givenByToSearch].filter((n): n is string => !!n && n.trim() !== "");
        if (usersToSearch.length > 0) {
          const { data: usersList } = await supabase
            .from("users")
            .select("id, user_name")
            .in("user_name", usersToSearch);

          if (usersList) {
            usersList.forEach((u) => {
              if (u.user_name?.toLowerCase() === nameToSearch?.toLowerCase()) {
                assigneeUserId = u.id;
              }
              if (u.user_name?.toLowerCase() === givenByToSearch?.toLowerCase()) {
                createdByUserId = u.id;
              }
            });
          }
        }

        // Get start and end dates for task generation
        const startDateTimeStr = editFormData.task_start_date || originalTask.task_start_date || new Date().toISOString();
        const startDate = new Date(startDateTimeStr);
        let taskTime = "09:00";
        if (startDateTimeStr.includes("T")) {
          const parts = startDateTimeStr.split("T");
          if (parts[1]) {
            taskTime = parts[1].substring(0, 5); // "09:00"
          }
        }

        // Fetch task_end_date from unique_checklist if available
        const { data: templateData } = await supabase
          .from("unique_checklist")
          .select("task_end_date")
          .eq("task_id", originalTask.task_id)
          .single();

        const endDate = templateData?.task_end_date ? new Date(templateData.task_end_date) : addYears(startDate, 2);

        // Build a merged task object so generateTasksForDb picks up the new frequency
        const mergedTask: ChecklistTask = { ...originalTask, ...editFormData } as ChecklistTask;

        // Generate frequency-wise tasks using the updated frequency
        const tasksToInsert = generateTasksForDb(
          mergedTask,
          editFormData,
          startDate,
          endDate,
          taskTime,
          workingDays,
          assigneeUserId,
          createdByUserId
        );

        if (tasksToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("checklist")
            .insert(tasksToInsert);

          if (insertError) {
            console.error("Error inserting into checklist:", insertError);
            toast.error("Failed to add tasks to checklist table");
          } else {
            const newFreq = editFormData.frequency || originalTask.frequency || "";
            toast.success(
              `Frequency set to "${newFreq}". Generated ${tasksToInsert.length} new recurring tasks.`
            );
          }
        } else {
          toast.warning("No working days found in calendar to generate tasks.");
        }
      }

      setEditingTaskId(null);
      setEditFormData({});
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleInputChange = (field: keyof ChecklistTask, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Delegation edit handlers
  const handleDelegationEditClick = (task: DelegationTask) => {
    setDelegationEditingId(task.task_id);
    setDelegationEditFormData({ ...task });
  };

  const handleDelegationCancelEdit = () => {
    setDelegationEditingId(null);
    setDelegationEditFormData({});
  };

  const handleDelegationFieldChange = (
    field: keyof DelegationTask,
    value: string,
  ) => {
    setDelegationEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDelegationSaveEdit = async () => {
    if (!delegationEditingId) return;

    const originalTask = delegationTasks.find(
      (t) => t.task_id === delegationEditingId,
    );
    if (!originalTask) return;

    try {
      await updateDelegationMutation.mutateAsync({
        updatedTask: {
          department: delegationEditFormData.department || undefined,
          given_by: delegationEditFormData.given_by || undefined,
          name: delegationEditFormData.name || undefined,
          task_description:
            delegationEditFormData.task_description || undefined,
          frequency: delegationEditFormData.frequency || undefined,
          enable_reminder:
            (delegationEditFormData.enable_reminder as
              | "yes"
              | "no"
              | undefined) || undefined,
          require_attachment:
            delegationEditFormData.require_attachment || undefined,
          task_start_date: delegationEditFormData.task_start_date || undefined,
          planned_date: delegationEditFormData.planned_date || undefined,
        },
        originalTask: {
          task_id: originalTask.task_id,
          department: originalTask.department || null,
          name: originalTask.name || null,
          task_description: originalTask.task_description || null,
        },
      });
      toast.success("Delegation task updated");
      setDelegationEditingId(null);
      setDelegationEditFormData({});
    } catch {
      toast.error("Failed to update delegation task");
    }
  };

  // Maintenance edit handlers
  const handleMaintenanceEditClick = (task: MaintenanceTask) => {
    setMaintenanceEditingId(task.task_id);
    setMaintenanceEditFormData({ ...task });
  };

  const handleMaintenanceCancelEdit = () => {
    setMaintenanceEditingId(null);
    setMaintenanceEditFormData({});
  };

  const handleMaintenanceFieldChange = (field: keyof MaintenanceTask, value: string) => {
    setMaintenanceEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMaintenanceSaveEdit = async () => {
    if (!maintenanceEditingId) return;
    const originalTask = maintenanceTasks.find((t) => t.task_id === maintenanceEditingId);
    if (!originalTask) return;

    try {
      const oldDateStr = originalTask.task_start_date ? new Date(originalTask.task_start_date).toISOString().split("T")[0] : null;
      const newDateStr = maintenanceEditFormData.task_start_date ? new Date(maintenanceEditFormData.task_start_date).toISOString().split("T")[0] : null;

      if (oldDateStr && newDateStr && oldDateStr !== newDateStr) {
        const oldD = new Date(oldDateStr);
        const newD = new Date(newDateStr);
        const diffTime = newD.getTime() - oldD.getTime();

        const { data: pendingTasks } = await supabase
          .from("machine_maintenance")
          .select("task_id, task_start_date")
          .eq("source_unique_id", originalTask.task_id)
          .is("submission_date", null);

        if (pendingTasks && pendingTasks.length > 0) {
          for (const pt of pendingTasks) {
            if (pt.task_start_date) {
              const ptDate = new Date(pt.task_start_date);
              const shiftedDate = new Date(ptDate.getTime() + diffTime);

              await supabase
                .from("machine_maintenance")
                .update({ task_start_date: shiftedDate.toISOString() })
                .eq("task_id", pt.task_id);
            }
          }
        }
      }

      await updateMaintenanceMutation.mutateAsync({
        updatedTask: {
          machine_name: maintenanceEditFormData.machine_name || undefined,
          given_by: maintenanceEditFormData.given_by || undefined,
          name: maintenanceEditFormData.name || undefined,
          task_description: maintenanceEditFormData.task_description || undefined,
          frequency: maintenanceEditFormData.frequency || undefined,
          enable_reminder: maintenanceEditFormData.enable_reminder || undefined,
          require_attachment: maintenanceEditFormData.require_attachment || undefined,
          task_start_date: maintenanceEditFormData.task_start_date || undefined,
          task_end_date: maintenanceEditFormData.task_end_date || undefined,
          image: maintenanceEditFormData.image || undefined,
        },
        originalTask: {
          task_id: originalTask.task_id,
          machine_name: originalTask.machine_name,
          name: originalTask.name,
          task_description: originalTask.task_description,
        },
      });
      toast.success("Maintenance task updated");
      setMaintenanceEditingId(null);
      setMaintenanceEditFormData({});
    } catch {
      toast.error("Failed to update maintenance task");
    }
  };

  // Filter handlers
  const handleNameFilterSelect = (name: string) => {
    setNameFilter(name);
    setDropdownOpen({ ...dropdownOpen, name: false });
    // Reset page to 0 when filter changes
    setChecklistPage(0);
    setDelegationPage(0);
  };

  const clearNameFilter = () => {
    setNameFilter("");
    setDropdownOpen({ ...dropdownOpen, name: false });
    setChecklistPage(0);
    setDelegationPage(0);
  };

  const handleExportCSV = () => {
    if (tasks.length === 0) {
      toast.error("No tasks to export");
      return;
    }

    const headers =
      activeTab === "checklist"
        ? ["Task ID", "Department", "Given By", "Name", "Description", "Start Date", "End Date", "Frequency"]
        : activeTab === "delegation"
          ? ["Task ID", "Department", "Given By", "Name", "Description", "Start Date", "Planned Date", "Frequency", "Status"]
          : ["Task ID", "Machine", "Given By", "Doer Name", "Description", "Start Date", "End Date", "Frequency", "Reminder", "Attachment"];

    const csvRows = tasks.map((t) => {
      if (activeTab === "checklist") {
        const task = t as ChecklistTask;
        return [
          task.task_id,
          `"${(task.department || "").replace(/"/g, '""')}"`,
          `"${(task.given_by || "").replace(/"/g, '""')}"`,
          `"${(task.name || "").replace(/"/g, '""')}"`,
          `"${(task.task_description || "").replace(/"/g, '""')}"`,
          task.task_start_date || "",
          (task as any).planned_date || "",
          task.frequency || "",
        ];
      } else if (activeTab === "delegation") {
        const task = t as DelegationTask;
        return [
          task.task_id,
          `"${(task.department || "").replace(/"/g, '""')}"`,
          `"${(task.given_by || "").replace(/"/g, '""')}"`,
          `"${(task.name || "").replace(/"/g, '""')}"`,
          `"${(task.task_description || "").replace(/"/g, '""')}"`,
          task.task_start_date || "",
          task.planned_date || "",
          task.frequency || "",
          task.status || "",
        ];
      } else {
        const task = t as MaintenanceTask;
        return [
          task.task_id,
          `"${(task.machine_name || "").replace(/"/g, '""')}"`,
          `"${(task.given_by || "").replace(/"/g, '""')}"`,
          `"${(task.name || "").replace(/"/g, '""')}"`,
          `"${(task.task_description || "").replace(/"/g, '""')}"`,
          task.task_start_date || "",
          task.task_end_date || "",
          task.frequency || "",
          task.enable_reminder || "",
          task.require_attachment || "",
        ];
      }
    });

    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // ﻿ BOM ensures Excel opens UTF-8 CSV with correct encoding (Hindi/non-ASCII characters)
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${activeTab}_tasks_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully (current page)");
  };

  const handleExportPDF = () => {
    // Determine which rows to export: selected if any, otherwise all filtered tasks
    const exportTasks: (ChecklistTask | DelegationTask | MaintenanceTask)[] =
      activeTab === "checklist"
        ? selectedTasks.length > 0 ? selectedTasks : tasks
        : activeTab === "delegation"
          ? selectedDelegationTasks.length > 0 ? selectedDelegationTasks : tasks
          : selectedMaintenanceTasks.length > 0 ? selectedMaintenanceTasks : tasks;

    if (exportTasks.length === 0) {
      toast.error("No tasks to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });

    const title =
      activeTab === "checklist"
        ? "Checklist Tasks"
        : activeTab === "delegation"
          ? "Delegation Tasks"
          : "Maintenance Tasks";

    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`Exported: ${new Date().toLocaleDateString("en-IN")}  |  Total: ${exportTasks.length}`, 14, 22);

    const columns =
      activeTab === "checklist"
        ? ["Task ID", "Department", "Given By", "Name", "Description", "Start Date", "Frequency"]
        : activeTab === "delegation"
          ? ["Task ID", "Department", "Given By", "Name", "Description", "Start Date", "Planned Date", "Frequency", "Status"]
          : ["Task ID", "Machine", "Given By", "Doer Name", "Description", "Start Date", "End Date", "Frequency", "Reminder", "Attachment"];

    const rows = exportTasks.map((t) => {
      if (activeTab === "checklist") {
        const task = t as ChecklistTask;
        return [
          task.task_id,
          task.department || "—",
          task.given_by || "—",
          task.name || "—",
          task.task_description || "—",
          task.task_start_date ? formatDate(task.task_start_date) : "—",
          task.frequency || "—",
        ];
      } else if (activeTab === "delegation") {
        const task = t as DelegationTask;
        return [
          task.task_id,
          task.department || "—",
          task.given_by || "—",
          task.name || "—",
          task.task_description || "—",
          task.task_start_date ? formatDate(task.task_start_date) : "—",
          task.planned_date ? formatDate(task.planned_date) : "—",
          task.frequency || "—",
          task.status || "—",
        ];
      } else {
        const task = t as MaintenanceTask;
        return [
          task.task_id,
          task.machine_name || "—",
          task.given_by || "—",
          task.name || "—",
          task.task_description || "—",
          task.task_start_date ? formatDate(task.task_start_date) : "—",
          task.task_end_date ? formatDate(task.task_end_date) : "—",
          task.frequency || "—",
          task.enable_reminder || "—",
          task.require_attachment || "—",
        ];
      }
    });

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 27,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 4: { cellWidth: 55 } },
    });

    doc.save(`${activeTab}_tasks_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success(`PDF exported (${exportTasks.length} task${exportTasks.length !== 1 ? "s" : ""})`);
  };

  // Frequency badge
  const getFrequencyBadge = (freq: string) => {
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
  };

  // Row styling
  const getRowClassName = (task: ChecklistTask | any) => {
    const isSelected =
      activeTab === "checklist"
        ? selectedTasks.find((t) => t.task_id === task.task_id)
        : activeTab === "delegation"
          ? selectedDelegationTasks.find((t) => t.task_id === task.task_id)
          : selectedMaintenanceTasks.find((t) => t.task_id === task.task_id);

    if (isSelected)
      return "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30";

    if (activeTab === "delegation") {
      const dTask = task;
      // Completed
      if (dTask.status?.toLowerCase() === "done" || dTask.submission_date) {
        return "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30";
      }
      // Extended ("brown" -> amber/orange)
      if (dTask.status?.toLowerCase() === "extend") {
        return "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30";
      }
      // Overdue
      if (dTask.planned_date) {
        const planDate = new Date(dTask.planned_date);
        const now = new Date();
        if (planDate < now) {
          return "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30";
        }
      }
    }
    return "hover:bg-gray-50 dark:hover:bg-neutral-700/50";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Tasks{" "}
            {totalCount > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                ({totalCount}{" "}
                <span className="text-base font-normal capitalize">
                  {activeTab}
                </span>
                )
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your daily checklist and delegated tasks
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
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => {
              setActiveTab("checklist");
              setChecklistPage(0);
              setSelectedTasks([]);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "checklist"
              ? "bg-white dark:bg-neutral-700 text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
          >
            Checklist
            {checklistTotal > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === "checklist"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                : "bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-gray-300"
                }`}>
                {checklistTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("delegation");
              setDelegationPage(0);
              setSelectedTasks([]);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "delegation"
              ? "bg-white dark:bg-neutral-700 text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
          >
            Delegation
            {delegationTotal > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === "delegation"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                : "bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-gray-300"
                }`}>
                {delegationTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("maintenance");
              setMaintenancePage(0);
              setSelectedMaintenanceTasks([]);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "maintenance"
              ? "bg-white dark:bg-neutral-700 text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
          >
            Maintenance
            {maintenanceTotal > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === "maintenance"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                : "bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-gray-300"
                }`}>
                {maintenanceTotal}
              </span>
            )}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Name Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen({ ...dropdownOpen, name: !dropdownOpen.name });
                setUserSearchQuery("");
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              <Filter className="w-4 h-4" />
              <span className="max-w-25 truncate">
                {nameFilter || "All Users"}
              </span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            {dropdownOpen.name && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen({ ...dropdownOpen, name: false })}
                />
                <div className="absolute z-50 mt-1 w-52 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-neutral-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    <button
                      onClick={clearNameFilter}
                      className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded transition-colors ${!nameFilter ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-200"}`}
                    >
                      All Users
                    </button>
                    {allNames
                      .filter((name) => name.toLowerCase().includes(userSearchQuery.toLowerCase()))
                      .map((name) => (
                        <button
                          key={name}
                          onClick={() => handleNameFilterSelect(name)}
                          className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded transition-colors ${nameFilter === name ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-200"}`}
                        >
                          {name}
                        </button>
                      ))}
                    {allNames.filter((name) => name.toLowerCase().includes(userSearchQuery.toLowerCase())).length === 0 && (
                      <p className="px-2 py-1.5 text-sm text-muted-foreground">No users found</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Frequency Filter */}
          <div className="relative">
            <button
              onClick={() =>
                setDropdownOpen({
                  ...dropdownOpen,
                  frequency: !dropdownOpen.frequency,
                })
              }
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              <Filter className="w-4 h-4" />
              <span>{freqFilter || "All Freq"}</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            {dropdownOpen.frequency && (
              <div className="absolute z-50 mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 p-1">
                <button
                  onClick={() => {
                    setFreqFilter("");
                    setDropdownOpen({ ...dropdownOpen, frequency: false });
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded text-gray-700 dark:text-gray-200"
                >
                  All Frequencies
                </button>
                {allFrequencies.map((freq) => (
                  <button
                    key={freq}
                    onClick={() => {
                      setFreqFilter(freq);
                      setDropdownOpen({ ...dropdownOpen, frequency: false });
                    }}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded text-gray-700 dark:text-gray-200"
                  >
                    {freq}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Delete */}
          {(selectedTasks.length > 0 || selectedDelegationTasks.length > 0 || selectedMaintenanceTasks.length > 0) &&
            userRole === "admin" && (
              <button
                onClick={confirmBulkDelete}
                disabled={
                  activeTab === "checklist"
                    ? deleteChecklistMutation.isPending
                    : activeTab === "delegation"
                      ? deleteDelegationMutation.isPending
                      : deleteMaintenanceMutation.isPending
                }
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors ml-auto"
              >
                {(activeTab === "checklist"
                  ? deleteChecklistMutation.isPending
                  : activeTab === "delegation"
                    ? deleteDelegationMutation.isPending
                    : deleteMaintenanceMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete (
                {activeTab === "checklist"
                  ? selectedTasks.length
                  : activeTab === "delegation"
                    ? selectedDelegationTasks.length
                    : selectedMaintenanceTasks.length}
                )
              </button>
            )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <QuickTaskSkeleton />
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>No tasks found</p>
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                <tr>
                  {userRole === "admin" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase w-10">
                      <input
                        type="checkbox"
                        checked={
                          activeTab === "checklist"
                            ? selectedTasks.length === filteredChecklistTasks.length && filteredChecklistTasks.length > 0
                            : activeTab === "delegation"
                              ? selectedDelegationTasks.length === filteredDelegationTasks.length && filteredDelegationTasks.length > 0
                              : selectedMaintenanceTasks.length === filteredMaintenanceTasks.length && filteredMaintenanceTasks.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                  )}
                  <th className="px-3  py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Task ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    {activeTab === "maintenance" ? "Machine" : "Department"}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Given By
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase min-w-48">
                    Task Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    Start Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20">
                    End Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Frequency
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Reminders
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Attachment
                  </th>
                  {activeTab === "checklist" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Add Image
                    </th>
                  )}
                  {activeTab === "maintenance" && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Image
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {tasks.map((task, index) => {
                  const isDelegationEditing =
                    activeTab === "delegation" &&
                    delegationEditingId === task.task_id;
                  const isChecklistEditing =
                    activeTab === "checklist" && editingTaskId === task.task_id;

                  const isMaintenanceEditing =
                    activeTab === "maintenance" &&
                    maintenanceEditingId === task.task_id;

                  return (
                    <tr
                      key={task.task_id || index}
                      className={getRowClassName(task)}
                    >
                      {userRole === "admin" && (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={
                              activeTab === "checklist"
                                ? !!selectedTasks.find((t) => t.task_id === task.task_id)
                                : activeTab === "delegation"
                                  ? !!selectedDelegationTasks.find((t) => t.task_id === task.task_id)
                                  : !!selectedMaintenanceTasks.find((t) => t.task_id === task.task_id)
                            }
                            onChange={() => handleCheckboxChange(task)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                        </td>
                      )}
                      {/* TASK ID */}
                      <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                        #{task.task_id}
                      </td>
                      {/* DEPARTMENT / MACHINE */}
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {isChecklistEditing ? (
                          <input
                            type="text"
                            value={editFormData.department || ""}
                            onChange={(e) => handleInputChange("department", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isDelegationEditing ? (
                          <input
                            type="text"
                            value={delegationEditFormData.department || ""}
                            onChange={(e) => handleDelegationFieldChange("department", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isMaintenanceEditing ? (
                          <input
                            type="text"
                            value={maintenanceEditFormData.machine_name || ""}
                            onChange={(e) => handleMaintenanceFieldChange("machine_name", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          activeTab === "maintenance"
                            ? (task as MaintenanceTask).machine_name || "—"
                            : (task as ChecklistTask | DelegationTask).department || "—"
                        )}
                      </td>
                      {/* GIVEN BY */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isChecklistEditing ? (
                          <input
                            type="text"
                            value={editFormData.given_by || ""}
                            onChange={(e) => handleInputChange("given_by", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isDelegationEditing ? (
                          <input
                            type="text"
                            value={delegationEditFormData.given_by || ""}
                            onChange={(e) => handleDelegationFieldChange("given_by", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isMaintenanceEditing ? (
                          <input
                            type="text"
                            value={maintenanceEditFormData.given_by || ""}
                            onChange={(e) => handleMaintenanceFieldChange("given_by", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          task.given_by || "—"
                        )}
                      </td>
                      {/* NAME (Assign To / Doer) */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isChecklistEditing ? (
                          <input
                            type="text"
                            value={editFormData.name || ""}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isDelegationEditing ? (
                          <input
                            type="text"
                            value={delegationEditFormData.name || ""}
                            onChange={(e) => handleDelegationFieldChange("name", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isMaintenanceEditing ? (
                          <input
                            type="text"
                            value={maintenanceEditFormData.name || ""}
                            onChange={(e) => handleMaintenanceFieldChange("name", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          task.name || "—"
                        )}
                      </td>
                      {/* TASK DESCRIPTION */}
                      <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-50 max-w-75">
                        {isChecklistEditing ? (
                          <textarea
                            value={editFormData.task_description || ""}
                            onChange={(e) => handleInputChange("task_description", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                            rows={2}
                          />
                        ) : isDelegationEditing ? (
                          <textarea
                            value={delegationEditFormData.task_description || ""}
                            onChange={(e) => handleDelegationFieldChange("task_description", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                            rows={2}
                          />
                        ) : isMaintenanceEditing ? (
                          <textarea
                            value={maintenanceEditFormData.task_description || ""}
                            onChange={(e) => handleMaintenanceFieldChange("task_description", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                            rows={2}
                          />
                        ) : (
                          <div className="whitespace-normal wrap-break-word line-clamp-2">
                            {task.task_description || "—"}
                          </div>
                        )}
                      </td>
                      {/* START DATE */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                        {isChecklistEditing ? (
                          <input
                            type="date"
                            value={editFormData.task_start_date
                              ? new Date(editFormData.task_start_date).toISOString().split("T")[0]
                              : ""}
                            onChange={(e) => handleInputChange("task_start_date", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isDelegationEditing ? (
                          <input
                            type="date"
                            value={delegationEditFormData.task_start_date
                              ? new Date(delegationEditFormData.task_start_date).toISOString().split("T")[0]
                              : ""}
                            onChange={(e) => handleDelegationFieldChange("task_start_date", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isMaintenanceEditing ? (
                          <input
                            type="date"
                            value={maintenanceEditFormData.task_start_date
                              ? new Date(maintenanceEditFormData.task_start_date).toISOString().split("T")[0]
                              : ""}
                            onChange={(e) => handleMaintenanceFieldChange("task_start_date", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : (
                          formatDate(task.task_start_date)
                        )}
                      </td>
                      {/* END DATE (planned_date for delegation, task_end_date for maintenance, submission_date for checklist) */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/10">
                        {isDelegationEditing ? (
                          <input
                            type="date"
                            value={delegationEditFormData.planned_date
                              ? new Date(delegationEditFormData.planned_date).toISOString().split("T")[0]
                              : ""}
                            onChange={(e) => handleDelegationFieldChange("planned_date", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : isMaintenanceEditing ? (
                          <input
                            type="date"
                            value={maintenanceEditFormData.task_end_date
                              ? new Date(maintenanceEditFormData.task_end_date).toISOString().split("T")[0]
                              : ""}
                            onChange={(e) => handleMaintenanceFieldChange("task_end_date", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          />
                        ) : activeTab === "maintenance" ? (
                          formatDate((task as MaintenanceTask).task_end_date)
                        ) : (
                          formatDate((task as ChecklistTask | DelegationTask).submission_date)
                        )}
                      </td>
                      {/* FREQUENCY */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isChecklistEditing ? (
                          <select
                            value={editFormData.frequency || (task as ChecklistTask).frequency || ""}
                            onChange={(e) => handleInputChange("frequency", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="daily">daily</option>
                            <option value="weekly">weekly</option>
                            <option value="fortnightly">fortnightly</option>
                            <option value="monthly">monthly</option>
                            <option value="quarterly">quarterly</option>
                            <option value="half-yearly">half-yearly</option>
                            <option value="yearly">yearly</option>
                          </select>
                        ) : isDelegationEditing ? (
                          <select
                            value={delegationEditFormData.frequency || ""}
                            onChange={(e) => handleDelegationFieldChange("frequency", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="daily">daily</option>
                            <option value="weekly">weekly</option>
                            <option value="fortnightly">fortnightly</option>
                            <option value="monthly">monthly</option>
                            <option value="quarterly">quarterly</option>
                            <option value="half-yearly">half-yearly</option>
                            <option value="yearly">yearly</option>
                            <option value="one-time">one-time</option>
                          </select>
                        ) : isMaintenanceEditing ? (
                          <select
                            value={maintenanceEditFormData.frequency || ""}
                            onChange={(e) => handleMaintenanceFieldChange("frequency", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="daily">daily</option>
                            <option value="weekly">weekly</option>
                            <option value="fortnightly">fortnightly</option>
                            <option value="monthly">monthly</option>
                            <option value="quarterly">quarterly</option>
                            <option value="half-yearly">half-yearly</option>
                            <option value="yearly">yearly</option>
                            <option value="one-time">one-time</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFrequencyBadge(task.frequency || "")}`}>
                            {task.frequency || "—"}
                          </span>
                        )}
                      </td>
                      {/* REMINDERS */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isDelegationEditing ? (
                          <select
                            value={delegationEditFormData.enable_reminder || "no"}
                            onChange={(e) => handleDelegationFieldChange("enable_reminder", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                          </select>
                        ) : isMaintenanceEditing ? (
                          <select
                            value={maintenanceEditFormData.enable_reminder || "no"}
                            onChange={(e) => handleMaintenanceFieldChange("enable_reminder", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                          </select>
                        ) : (
                          task.enable_reminder || "—"
                        )}
                      </td>
                      {/* ATTACHMENT */}
                      <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                        {isChecklistEditing ? (
                          <select
                            value={editFormData.require_attachment || "no"}
                            onChange={(e) => handleInputChange("require_attachment", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white border-gray-200 dark:border-neutral-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        ) : isDelegationEditing ? (
                          <select
                            value={delegationEditFormData.require_attachment || "no"}
                            onChange={(e) => handleDelegationFieldChange("require_attachment", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                          </select>
                        ) : isMaintenanceEditing ? (
                          <select
                            value={maintenanceEditFormData.require_attachment || "no"}
                            onChange={(e) => handleMaintenanceFieldChange("require_attachment", e.target.value)}
                            className="w-full px-2 py-1 text-xs border rounded dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                          >
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                          </select>
                        ) : (
                          task.require_attachment || "—"
                        )}
                      </td>
                      {/* ADD IMAGE (Checklist) */}
                      {activeTab === "checklist" && (
                        <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                          {isChecklistEditing ? (
                            <div className="flex flex-col gap-2 min-w-32">
                              <input
                                type="text"
                                placeholder="Paste Image URL"
                                value={editFormData.image || ""}
                                onChange={(e) => handleInputChange("image", e.target.value)}
                                className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white border-gray-200 dark:border-neutral-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      setIsUploadingImage(true);
                                      const url = await uploadChecklistImage(file, task.task_id);
                                      handleInputChange("image", url);
                                      toast.success("Image uploaded!");
                                    } catch (err: any) {
                                      toast.error(err.message || "Upload failed");
                                    } finally {
                                      setIsUploadingImage(false);
                                    }
                                  }}
                                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {isUploadingImage && (
                                  <Loader2 className="absolute top-1/2 right-2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
                                )}
                              </div>
                              {editFormData.image && (
                                <a href={editFormData.image} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-1">
                                  <img src={editFormData.image} alt="Preview" className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-neutral-600" />
                                  <span className="text-xs text-blue-500 hover:underline">Current</span>
                                </a>
                              )}
                            </div>
                          ) : (() => {
                            const ct = task as ChecklistTask;
                            return (ct.sample_image || ct.image) ? (
                              <a href={ct.sample_image || ct.image || undefined} target="_blank" rel="noreferrer" className="block w-10 h-10 overflow-hidden rounded border border-gray-200 dark:border-neutral-700 hover:opacity-80 transition-opacity">
                                <img src={ct.sample_image || ct.image || undefined} alt="Preview" className="w-full h-full object-cover" />
                              </a>
                            ) : "—";
                          })()}
                        </td>
                      )}
                      {/* IMAGE (Maintenance) */}
                      {activeTab === "maintenance" && (
                        <td className="px-3 py-3 text-sm text-foreground-secondary dark:text-muted-foreground whitespace-nowrap">
                          {isMaintenanceEditing ? (
                            <input
                              type="text"
                              placeholder="Paste Image URL"
                              value={maintenanceEditFormData.image || ""}
                              onChange={(e) => handleMaintenanceFieldChange("image", e.target.value)}
                              className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white border-gray-200 dark:border-neutral-600 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          ) : (task as MaintenanceTask).image ? (
                            <a href={(task as MaintenanceTask).image!} target="_blank" rel="noreferrer" className="block w-10 h-10 overflow-hidden rounded border border-gray-200 dark:border-neutral-700 hover:opacity-80 transition-opacity">
                              <img src={(task as MaintenanceTask).image!} alt="Preview" className="w-full h-full object-cover" />
                            </a>
                          ) : "—"}
                        </td>
                      )}
                      {/* ACTIONS */}
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          {isChecklistEditing || isDelegationEditing || isMaintenanceEditing ? (
                            <>
                              <button
                                onClick={
                                  activeTab === "checklist"
                                    ? handleSaveEdit
                                    : activeTab === "delegation"
                                      ? handleDelegationSaveEdit
                                      : handleMaintenanceSaveEdit
                                }
                                disabled={
                                  activeTab === "checklist"
                                    ? updateChecklistMutation.isPending
                                    : activeTab === "delegation"
                                      ? updateDelegationMutation.isPending
                                      : updateMaintenanceMutation.isPending
                                }
                                className="p-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {(activeTab === "checklist"
                                  ? updateChecklistMutation.isPending
                                  : activeTab === "delegation"
                                    ? updateDelegationMutation.isPending
                                    : updateMaintenanceMutation.isPending) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={
                                  activeTab === "checklist"
                                    ? handleCancelEdit
                                    : activeTab === "delegation"
                                      ? handleDelegationCancelEdit
                                      : handleMaintenanceCancelEdit
                                }
                                className="p-1 rounded bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  activeTab === "checklist"
                                    ? handleEditClick(task as ChecklistTask)
                                    : activeTab === "delegation"
                                      ? handleDelegationEditClick(task as DelegationTask)
                                      : handleMaintenanceEditClick(task as MaintenanceTask)
                                }
                                className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              {userRole === "admin" && (
                                <button
                                  onClick={() => confirmDeleteTask(task)}
                                  disabled={
                                    activeTab === "checklist"
                                      ? deleteChecklistMutation.isPending
                                      : activeTab === "delegation"
                                        ? deleteDelegationMutation.isPending
                                        : deleteMaintenanceMutation.isPending
                                  }
                                  className="p-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 disabled:opacity-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalCount > 0 && !isLoading && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-neutral-900/50 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages || 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {(deleteConfirmTask || isBulkDeleteConfirm) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Deletion
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {isBulkDeleteConfirm
                ? `Are you sure you want to delete ${activeTab === "checklist"
                  ? selectedTasks.length
                  : activeTab === "delegation"
                    ? selectedDelegationTasks.length
                    : selectedMaintenanceTasks.length
                } selected tasks? This action cannot be undone.`
                : `Are you sure you want to delete this task? This action cannot be undone.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmTask(null);
                  setIsBulkDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={isBulkDeleteConfirm ? executeBulkDelete : executeDeleteTask}
                disabled={
                  activeTab === "checklist"
                    ? deleteChecklistMutation.isPending
                    : activeTab === "delegation"
                      ? deleteDelegationMutation.isPending
                      : deleteMaintenanceMutation.isPending
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
              >
                {(activeTab === "checklist"
                  ? deleteChecklistMutation.isPending
                  : activeTab === "delegation"
                    ? deleteDelegationMutation.isPending
                    : deleteMaintenanceMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
