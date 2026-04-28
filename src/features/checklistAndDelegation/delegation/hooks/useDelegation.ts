"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchDelegationDataSortByDate,
  fetchDelegationDataForHistory,
  fetchDelegationLast7Days,
  updateDelegationData,
  editDelegationTaskApi,
  deleteDelegationTaskApi,
} from "../server/api/delegationApi";
import { logDelegationAction } from "../server/api/delegationLogApi";
import {
  DelegationTask,
  DelegationFilters,
  DelegationSubmission,
} from "../types/types";

const initialFilters: DelegationFilters = {
  search: "",
  status: "all",
  dateRange: "all",
  name: "",
};

export function useDelegation(roleOverride?: string | null) {
  const [pendingTasks, setPendingTasks] = useState<DelegationTask[]>([]);
  const [historyTasks, setHistoryTasks] = useState<DelegationTask[]>([]);
  const [last7DaysTasks, setLast7DaysTasks] = useState<DelegationTask[]>([]);
  const [filters, setFilters] = useState<DelegationFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<
    "pending" | "history" | "last7days"
  >("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [last7DaysTotalCount, setLast7DaysTotalCount] = useState(0);

  // Task actions state
  const [taskRemarks, setTaskRemarks] = useState<Record<number, string>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<number, string>>({});
  const [taskImages, setTaskImages] = useState<
    Record<number, { file: File; previewUrl: string; uploading?: boolean }>
  >({});
  // Status column date (auto-defaults to today)
  const [nextTargetDates, setNextTargetDates] = useState<
    Record<number, string>
  >({});
  // Close Task column date — completely separate, always starts empty
  const [closeTaskDates, setCloseTaskDates] = useState<Record<number, string>>({});

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<DelegationTask>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Load pending tasks
  const loadPendingTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDelegationDataSortByDate(
        currentPage,
        50,
        filters.search,
        roleOverride,
        filters.name,
        filters.status,
      );
      setPendingTasks(result.data);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error loading pending tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters.search, filters.name, filters.status, roleOverride]);

  // Load history tasks
  const loadHistoryTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDelegationDataForHistory(
        currentPage,
        filters.search,
        roleOverride,
        filters.name,
      );
      setHistoryTasks(result.data);
      setHistoryTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters.search, filters.name, roleOverride]);

  // Load last 7 days tasks
  const loadLast7DaysTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDelegationLast7Days(
        1, // Fetching all effectively due to limit mapping
        1000,
        filters.search,
        roleOverride,
        filters.name,
      );
      setLast7DaysTasks(result.data);
      setLast7DaysTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error loading last 7 days tasks:", error);
      toast.error("Failed to load last 7 days tasks");
    } finally {
      setIsLoading(false);
    }
  }, [filters.search, filters.name, roleOverride]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "pending") {
      loadPendingTasks();
    } else if (activeTab === "history") {
      loadHistoryTasks();
    } else if (activeTab === "last7days") {
      loadLast7DaysTasks();
    }
  }, [activeTab, loadPendingTasks, loadHistoryTasks, loadLast7DaysTasks]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setCurrentPage(1);
  }, []);

  // Handle name filter
  const handleNameFilter = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, name: value }));
    setCurrentPage(1);
  }, []);

  // Handle status filter
  const handleStatusFilter = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setCurrentPage(1);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback(
    (tab: "pending" | "history" | "last7days") => {
      setActiveTab(tab);
      setCurrentPage(1);
      setSelectedTasks(new Set());
    },
    [],
  );

  // Toggle task selection
  const toggleTaskSelection = useCallback((taskId: number) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // Select all tasks
  const selectAllTasks = useCallback(() => {
    const allIds = new Set(pendingTasks.map((t) => t.task_id));
    setSelectedTasks(allIds);
  }, [pendingTasks]);

  // Deselect all tasks
  const deselectAllTasks = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  // Update task remark
  const updateTaskRemark = useCallback((taskId: number, remark: string) => {
    setTaskRemarks((prev) => ({ ...prev, [taskId]: remark }));
  }, []);

  // Update task status — used by BOTH columns.
  // Status column (skipDefaultDate=false): clears nextTargetDates so it starts blank.
  // Close Task column (skipDefaultDate=true): clears closeTaskDates so it starts blank.
  const updateTaskStatus = useCallback(
    (taskId: number, status: string, skipDefaultDate = false) => {
      setTaskStatuses((prev) => ({ ...prev, [taskId]: status }));
      if (status === "Extend date") {
        if (!skipDefaultDate) {
          // Status column: clear its own date so it starts blank
          setNextTargetDates((prev) => {
            const s = { ...prev };
            delete s[taskId];
            return s;
          });
        } else {
          // Close Task column: always clear its own date so it starts blank
          setCloseTaskDates((prev) => {
            const s = { ...prev };
            delete s[taskId];
            return s;
          });
        }
      } else {
        // Any other status — clear both date stores
        setNextTargetDates((prev) => {
          const s = { ...prev };
          delete s[taskId];
          return s;
        });
        setCloseTaskDates((prev) => {
          const s = { ...prev };
          delete s[taskId];
          return s;
        });
      }
    },
    [],
  );

  // Update close-task date (admin "Extend date till" column only)
  const updateCloseTaskDate = useCallback((taskId: number, date: string) => {
    setCloseTaskDates((prev) => ({ ...prev, [taskId]: date }));
  }, []);

  // Handle image upload - upload immediately to Supabase
  const handleImageUpload = useCallback(
    async (taskId: number, event: React.ChangeEvent<HTMLInputElement>) => {
      console.log("Upload triggered for task:", taskId);
      const file = event.target.files?.[0];
      if (!file) {
        console.log("No file selected");
        return;
      }

      console.log("File selected:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid image (JPEG, PNG, or WebP)");
        return;
      }

      // Validate file size (20MB)
      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Image size must be less than 20MB");
        return;
      }

      // Set uploading state
      console.log("Setting uploading state for task:", taskId);
      setTaskImages((prev) => {
        const newState = {
          ...prev,
          [taskId]: { file, previewUrl: "", uploading: true },
        };
        console.log("TaskImages after setting uploading:", newState);
        return newState;
      });

      try {
        console.log("Starting upload to Supabase...");
        // Upload to Supabase
        const { uploadChecklistImage } =
          await import("@/features/checklistAndDelegation/checklist/server/api/checklistUploadApi");
        const uploadedUrl = await uploadChecklistImage(file, taskId);
        console.log("Upload successful! URL:", uploadedUrl);

        // Update state with uploaded URLjjjjj
        setTaskImages((prev) => {
          const newState = {
            ...prev,
            [taskId]: { file, previewUrl: uploadedUrl, uploading: false },
          };
          console.log("TaskImages after upload complete:", newState);
          return newState;
        });

        toast.success("Image uploaded successfully");
      } catch (error) {
        console.error("Image upload error:", error);
        toast.error("Failed to upload image");
        // Remove from state on error
        setTaskImages((prev) => {
          const newState = { ...prev };
          delete newState[taskId];
          console.log("TaskImages after error cleanup:", newState);
          return newState;
        });
      }
    },
    [],
  );

  // Update next target date
  const updateNextTargetDate = useCallback((taskId: number, date: string) => {
    setNextTargetDates((prev) => ({ ...prev, [taskId]: date }));
  }, []);

  // --- Edit handlers ---
  const handleEditClick = useCallback((task: DelegationTask) => {
    setEditingTaskId(task.task_id);
    setEditFormData({ ...task });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditFormData({});
  }, []);

  const handleEditFieldChange = useCallback(
    (field: keyof DelegationTask, value: string) => {
      setEditFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editingTaskId) return;
    setIsSavingEdit(true);
    try {
      const result = await editDelegationTaskApi(editingTaskId, {
        department: editFormData.department || undefined,
        given_by: editFormData.given_by || undefined,
        name: editFormData.name || undefined,
        task_description: editFormData.task_description || undefined,
        frequency: editFormData.frequency || undefined,
        enable_reminder: editFormData.enable_reminder || undefined,
        require_attachment: editFormData.require_attachment || undefined,
        task_start_date: editFormData.task_start_date || undefined,
        planned_date: editFormData.planned_date || undefined,
      });

        if (result.success) {
          // Log the update action
          const userName = localStorage.getItem("user-name") || "Unknown";
          await logDelegationAction({
            task_id: editingTaskId.toString(),
            action: "update",
            action_done_by: userName,
            name: editFormData.name,
            task_description: editFormData.task_description,
            frequency: editFormData.frequency,
          });

          toast.success("Task updated successfully");
        setEditingTaskId(null);
        setEditFormData({});
        // Reload to reflect changes
        if (activeTab === "pending") {
          loadPendingTasks();
        } else {
          loadHistoryTasks();
        }
      } else {
        toast.error(result.message || "Failed to update task");
      }
    } catch (error) {
      console.error("Edit save error:", error);
      toast.error("Failed to update task");
    } finally {
      setIsSavingEdit(false);
    }
  }, [
    editingTaskId,
    editFormData,
    activeTab,
    loadPendingTasks,
    loadHistoryTasks,
  ]);

  const handleDeleteTask = useCallback(async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    // Find task details for logging before it's deleted
    const taskToDelete = pendingTasks.find(t => t.task_id === taskId) 
                     || historyTasks.find(t => t.task_id === taskId)
                     || last7DaysTasks.find(t => t.task_id === taskId);

    try {
      const result = await deleteDelegationTaskApi(taskId);
      if (result.success) {
        // Log the delete action
        const userName = localStorage.getItem("user-name") || "Unknown";
        await logDelegationAction({
          task_id: taskId.toString(),
          action: "delete",
          action_done_by: userName,
          name: taskToDelete?.name,
          task_description: taskToDelete?.task_description,
          frequency: taskToDelete?.frequency,
        });

        toast.success("Task deleted successfully");
        // Reload based on active tab
        if (activeTab === "pending") {
          loadPendingTasks();
        } else if (activeTab === "history") {
          loadHistoryTasks();
        } else {
          loadLast7DaysTasks();
        }
      } else {
        toast.error(result.message || "Failed to delete task");
      }
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error("Failed to delete task");
    }
  }, [activeTab, loadPendingTasks, loadHistoryTasks, loadLast7DaysTasks]);

  // Submit selected tasks
  const submitSelectedTasks = useCallback(async () => {
    if (selectedTasks.size === 0) {
      toast.error("Please select at least one task");
      return;
    }

    // Check if all selected tasks have status
    const missingStatus = Array.from(selectedTasks).some(
      (id) => !taskStatuses[id],
    );
    if (missingStatus) {
      toast.error("Please set status for all selected tasks");
      return;
    }

    // Check if tasks with "Extend date" status have a date selected
    const missingDate = Array.from(selectedTasks).some(
      (id) =>
        taskStatuses[id] === "Extend date" &&
        !nextTargetDates[id] &&
        !closeTaskDates[id],
    );

    if (missingDate) {
      toast.error("Please select a next target date for extended tasks");
      return;
    }

    // Check if tasks requiring attachment have an image uploaded
    const missingImage = Array.from(selectedTasks).some((id) => {
      const task = pendingTasks.find((t) => t.task_id === id);
      if (task?.require_attachment?.toLowerCase() === "yes") {
        // Check if image was uploaded in this session OR already exists in DB
        return !taskImages[id]?.previewUrl && !task.image;
      }
      return false;
    });

    if (missingImage) {
      toast.error("Please upload an image for tasks that require attachment");
      return;
    }

    setIsSubmitting(true);
    try {
      const submissions: DelegationSubmission[] = Array.from(selectedTasks).map(
        (taskId) => ({
          taskId,
          status: taskStatuses[taskId] || "Completed",
          remarks: taskRemarks[taskId] || "",
          // Prefer closeTaskDates (admin "Extend date till") over nextTargetDates (user "Extend date from")
          nextExtendDate:
            taskStatuses[taskId] === "Extend date"
              ? (closeTaskDates[taskId] ?? nextTargetDates[taskId])
              : undefined,
          image: taskImages[taskId]
            ? {
                name: taskImages[taskId].file.name,
                type: taskImages[taskId].file.type,
                previewUrl: taskImages[taskId].previewUrl,
              }
            : undefined,
        }),
      );

      console.log("Delegation submission data:", {
        selectedTasksCount: selectedTasks.size,
        taskImages,
        submissions,
      });

      await updateDelegationData(submissions);
      toast.success(`Successfully submitted ${submissions.length} tasks`);

      // Reset and reload
      setSelectedTasks(new Set());
      setTaskRemarks({});
      setTaskStatuses({});
      setTaskImages({});
      setNextTargetDates({});
      setCloseTaskDates({});
      loadPendingTasks();
    } catch (error) {
      console.error("Error submitting tasks:", error);
      toast.error("Failed to submit tasks");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedTasks,
    taskStatuses,
    taskRemarks,
    taskImages,
    nextTargetDates,
    closeTaskDates,
    pendingTasks,
    loadPendingTasks,
  ]);

  // Format date for display
  const formatDate = useCallback(
    (dateStr: string | null | undefined): string => {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
    [],
  );

  // Get status badge color
  const getStatusColor = useCallback(
    (status: string | null | undefined): string => {
      if (!status)
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      switch (status.toLowerCase()) {
        case "completed":
        case "done":
          return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        case "pending":
          return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
        case "overdue":
          return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
        default:
          return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      }
    },
    [],
  );

  return {
    // Data
    pendingTasks,
    historyTasks,
    last7DaysTasks,
    filters,
    activeTab,
    isLoading,
    isSubmitting,
    selectedTasks,
    currentPage,
    totalCount:
      activeTab === "pending"
        ? totalCount
        : activeTab === "history"
          ? historyTotalCount
          : last7DaysTotalCount,
    taskRemarks,
    taskStatuses,

    // Actions
    handleSearch,
    handleNameFilter,
    handleStatusFilter,
    handleTabChange,
    toggleTaskSelection,
    selectAllTasks,
    deselectAllTasks,
    updateTaskRemark,
    updateTaskStatus,
    submitSelectedTasks,
    setCurrentPage,
    refresh:
      activeTab === "pending"
        ? loadPendingTasks
        : activeTab === "history"
          ? loadHistoryTasks
          : loadLast7DaysTasks,

    // Utilities
    formatDate,
    getStatusColor,
    taskImages,
    nextTargetDates,
    closeTaskDates,
    handleImageUpload,
    updateNextTargetDate,
    updateCloseTaskDate,

    // Edit
    editingTaskId,
    editFormData,
    isSavingEdit,
    handleEditClick,
    handleCancelEdit,
    handleEditFieldChange,
    handleSaveEdit,
    handleDeleteTask,

    loadPendingTasks,
    loadHistoryTasks,
    loadLast7DaysTasks,
  };
}
