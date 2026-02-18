"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchDelegationDataSortByDate,
  fetchDelegationDataForHistory,
  updateDelegationData,
} from "../server/api/delegationApi";
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
  const [filters, setFilters] = useState<DelegationFilters>(initialFilters);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);

  // Task actions state
  const [taskRemarks, setTaskRemarks] = useState<Record<number, string>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<number, string>>({});
  const [taskImages, setTaskImages] = useState<
    Record<number, { file: File; previewUrl: string; uploading?: boolean }>
  >({});
  const [nextTargetDates, setNextTargetDates] = useState<
    Record<number, string>
  >({});

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
      );
      setPendingTasks(result.data);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error loading pending tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters.search, filters.name, roleOverride]);

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

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "pending") {
      loadPendingTasks();
    } else {
      loadHistoryTasks();
    }
  }, [activeTab, loadPendingTasks, loadHistoryTasks]);

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

  // Handle tab change
  const handleTabChange = useCallback((tab: "pending" | "history") => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedTasks(new Set());
  }, []);

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

  // Update task status
  const updateTaskStatus = useCallback((taskId: number, status: string) => {
    setTaskStatuses((prev) => ({ ...prev, [taskId]: status }));
    // Reset next target date if status changes from "Extend date"
    if (status !== "Extend date") {
      setNextTargetDates((prev) => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
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

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Image size must be less than 5MB");
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
      (id) => taskStatuses[id] === "Extend date" && !nextTargetDates[id],
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
          nextExtendDate:
            taskStatuses[taskId] === "Extend date"
              ? nextTargetDates[taskId]
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
    filters,
    activeTab,
    isLoading,
    isSubmitting,
    selectedTasks,
    currentPage,
    totalCount: activeTab === "pending" ? totalCount : historyTotalCount,
    taskRemarks,
    taskStatuses,

    // Actions
    handleSearch,
    handleNameFilter,
    handleTabChange,
    toggleTaskSelection,
    selectAllTasks,
    deselectAllTasks,
    updateTaskRemark,
    updateTaskStatus,
    submitSelectedTasks,
    setCurrentPage,
    refresh: activeTab === "pending" ? loadPendingTasks : loadHistoryTasks,

    // Utilities
    formatDate,
    getStatusColor,
    taskImages,
    nextTargetDates,
    handleImageUpload,
    updateNextTargetDate,
  };
}
