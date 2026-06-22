"use client";

import { useState, useEffect, useMemo } from "react";
import posthog from "posthog-js";
import {
  CheckCircle2,
  X,
  Search,
  Edit,
  Save,
  XCircle,
  Loader2,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useChecklistApproval,
  useDelegationApproval,
  useUpdateAdminStatus,
  useMarkMultipleDone,
} from "../server/tanstackQuery/useApproval";
import { ApprovalTask, ConfirmationModalProps } from "../types/types";

// Image Preview Modal Component
function ImagePreviewModal({
  isOpen,
  imageUrl,
  onClose,
}: {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-end p-2 border-b border-gray-100 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Task Attachment Full Size"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmationModal({
  isOpen,
  itemCount,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-full p-3 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Mark Items as Admin Done
          </h2>
        </div>

        <p className="text-foreground-secondary dark:text-gray-300 text-center mb-6">
          Are you sure you want to mark {itemCount}{" "}
          {itemCount === 1 ? "item" : "items"} as Admin Done?
        </p>

        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 text-foreground dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to check if value is empty
const isEmpty = (value: string | null | undefined): boolean => {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
};

// Helper function to parse date from DD/MM/YYYY format
const parseDateFromDDMMYYYY = (dateStr: string | null): Date | null => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const datePart = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr;
  const parts = datePart.split("/");
  if (parts.length !== 3) return null;
  return new Date(
    parseInt(parts[2]),
    parseInt(parts[1]) - 1,
    parseInt(parts[0]),
  );
};

const ITEMS_PER_PAGE = 50;

export default function MainApproval() {
  const [activeTab, setActiveTab] = useState<"checklist" | "delegation">(
    "checklist",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [selectedHistoryItems, setSelectedHistoryItems] = useState<
    ApprovalTask[]
  >([]);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    itemCount: 0,
  });

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editedAdminStatus, setEditedAdminStatus] = useState<
    Record<string, string>
  >({});

  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "";
  });
  const [username, setUsername] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user-name") || "";
  });

  // Re-sync if localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setUserRole(localStorage.getItem("role") || "");
      setUsername(localStorage.getItem("user-name") || "");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const isAdmin = userRole === "admin";

  // Queries
  const {
    data: checklistData,
    isLoading: isLoadingChecklist,
    refetch: refetchChecklist,
  } = useChecklistApproval(userRole, username);

  const {
    data: delegationData,
    isLoading: isLoadingDelegation,
    refetch: refetchDelegation,
  } = useDelegationApproval(userRole, username);

  // Mutations
  const updateStatusMutation = useUpdateAdminStatus();
  const markMultipleDoneMutation = useMarkMultipleDone();

  const isLoading = isLoadingChecklist || isLoadingDelegation;

  // Get current data based on active tab
  const currentData =
    activeTab === "checklist"
      ? checklistData?.data || []
      : delegationData?.data || [];

  // Combine members from both sources
  const membersList = useMemo(() => {
    const checklistMembers = checklistData?.members || [];
    const delegationMembers = delegationData?.members || [];
    return [...new Set([...checklistMembers, ...delegationMembers])].sort();
  }, [checklistData, delegationData]);

  // Filter data
  const filteredData = useMemo(() => {
    return currentData
      .filter((item) => {
        const matchesSearch = searchTerm
          ? Object.values(item).some(
              (value) =>
                value &&
                value
                  .toString()
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()),
            )
          : true;

        const matchesMember =
          selectedMembers.length > 0
            ? selectedMembers.includes(item.name || "")
            : true;

        let matchesDateRange = true;
        if (startDate || endDate) {
          const itemDate = parseDateFromDDMMYYYY(item.submission_date);
          if (!itemDate) return false;
          if (startDate) {
            const startDateObj = new Date(startDate);
            startDateObj.setHours(0, 0, 0, 0);
            if (itemDate < startDateObj) matchesDateRange = false;
          }
          if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            if (itemDate > endDateObj) matchesDateRange = false;
          }
        }

        return matchesSearch && matchesMember && matchesDateRange;
      })
      .sort((a, b) => {
        const dateA = parseDateFromDDMMYYYY(a.submission_date);
        const dateB = parseDateFromDDMMYYYY(b.submission_date);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      });
  }, [currentData, searchTerm, selectedMembers, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const showingStart =
    filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredData.length,
  );

  // Get unprocessed items (items that can be selected)
  const unprocessedItems = useMemo(() => {
    return filteredData.filter((item) => {
      return (
        isEmpty(item.admin_done) ||
        (item.admin_done?.trim() !== "Done" &&
          item.admin_done?.trim() !== "Not Done")
      );
    });
  }, [filteredData]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalCompleted: currentData.length,
      filteredTotal: filteredData.length,
      memberStats: selectedMembers.reduce(
        (acc, member) => {
          acc[member] = currentData.filter((t) => t.name === member).length;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }, [currentData, filteredData, selectedMembers]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMembers([]);
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handleMemberSelection = (member: string) => {
    setSelectedMembers((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member],
    );
  };

  const handleEditClick = (item: ApprovalTask) => {
    setEditingRows((prev) => new Set([...prev, item._id]));
    setEditedAdminStatus((prev) => ({
      ...prev,
      [item._id]: item.admin_done || "",
    }));
  };

  const handleCancelEdit = (rowId: string) => {
    setEditingRows((prev) => {
      const newSet = new Set(prev);
      newSet.delete(rowId);
      return newSet;
    });
    setEditedAdminStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[rowId];
      return newStatus;
    });
  };

  const handleSaveEdit = async (item: ApprovalTask) => {
    const newStatus = editedAdminStatus[item._id];

    await updateStatusMutation.mutateAsync({
      taskId: item._taskId || item.task_id,
      status: newStatus === "" ? "" : newStatus,
      sheetType: item._sheetType,
    });

    setEditingRows((prev) => {
      const newSet = new Set(prev);
      newSet.delete(item._id);
      return newSet;
    });
    setEditedAdminStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[item._id];
      return newStatus;
    });
  };

  const handleMarkMultipleDone = () => {
    if (selectedHistoryItems.length === 0) return;
    setConfirmationModal({
      isOpen: true,
      itemCount: selectedHistoryItems.length,
    });
  };

  const confirmMarkDone = async () => {
    setConfirmationModal({ isOpen: false, itemCount: 0 });

    const checklistItems = selectedHistoryItems.filter(
      (item) => item._sheetType === "checklist",
    );
    const delegationItems = selectedHistoryItems.filter(
      (item) => item._sheetType === "delegation",
    );

    try {
      await markMultipleDoneMutation.mutateAsync({
        checklistTaskIds: checklistItems.map(
          (item) => item._taskId || item.task_id,
        ),
        delegationTaskIds: delegationItems.map(
          (item) => item._taskId || item.task_id,
        ),
      });
      posthog.capture("approval_tasks_marked_done", {
        checklist_count: checklistItems.length,
        delegation_count: delegationItems.length,
        total_count: selectedHistoryItems.length,
        $session_id: posthog.get_session_id(),
        session_replay_url: posthog.get_session_replay_url({ withTimestamp: true }),
      });
    } catch (err) {
      posthog.captureException(err);
    }

    setSelectedHistoryItems([]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHistoryItems(unprocessedItems);
    } else {
      setSelectedHistoryItems([]);
    }
  };

  const handleRefresh = () => {
    refetchChecklist();
    refetchDelegation();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMemberDropdown &&
        !(event.target as Element).closest(".member-dropdown")
      ) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMemberDropdown]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Approval Pending Tasks
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Read-only view of completed tasks with submission history
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab("checklist");
            setSelectedHistoryItems([]);
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "checklist"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
          }`}
        >
          Checklist Tasks
        </button>
        <button
          onClick={() => {
            setActiveTab("delegation");
            setSelectedHistoryItems([]);
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "delegation"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
          }`}
        >
          Delegation Tasks
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Member Filter */}
          {isAdmin && membersList.length > 0 && (
            <div className="member-dropdown relative min-w-50">
              <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                Filter by Member
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  onFocus={() => setShowMemberDropdown(true)}
                  className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              {showMemberDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {membersList
                    .filter((m) =>
                      m.toLowerCase().includes(memberSearchTerm.toLowerCase()),
                    )
                    .map((member) => (
                      <div
                        key={member}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
                        onClick={() => handleMemberSelection(member)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member)}
                          readOnly
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-foreground dark:text-gray-300">
                          {member}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              {selectedMembers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedMembers.map((member) => (
                    <span
                      key={member}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs"
                    >
                      {member}
                      <button
                        onClick={() => handleMemberSelection(member)}
                        className="ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date Filters */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-white"
            />
          </div>

          {/* Clear Filters */}
          {(selectedMembers.length > 0 ||
            startDate ||
            endDate ||
            searchTerm) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              Clear Filters
            </button>
          )}

          {/* Bulk Action */}
          {isAdmin && selectedHistoryItems.length > 0 && (
            <button
              onClick={handleMarkMultipleDone}
              disabled={markMultipleDoneMutation.isPending}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {markMultipleDoneMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Mark {selectedHistoryItems.length} as Done
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
          Task Completion Statistics
        </h3>
        <div className="flex flex-wrap gap-4">
          <div className="px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
            <span className="text-xs text-muted-foreground dark:text-muted-foreground">
              Total Completed
            </span>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {stats.totalCompleted}
            </div>
          </div>
          {(selectedMembers.length > 0 ||
            startDate ||
            endDate ||
            searchTerm) && (
            <div className="px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                Filtered Results
              </span>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {stats.filteredTotal}
              </div>
            </div>
          )}
          {selectedMembers.map((member) => (
            <div
              key={member}
              className="px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg shadow-sm"
            >
              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                {member}
              </span>
              <div className="text-lg font-semibold text-primary dark:text-muted-foreground">
                {stats.memberStats[member]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-20" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-32" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded flex-1" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-16" />
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>
              {searchTerm || selectedMembers.length > 0 || startDate || endDate
                ? "No records matching your filters"
                : `No completed ${activeTab} records found`}
            </p>
          </div>
        ) : (
          <div
            className="overflow-auto"
            style={{ maxHeight: "calc(100vh - 250px)" }}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-900/50 sticky top-0 z-10">
                <tr>
                  {isAdmin && (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-30">
                        Admin Done
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase w-24">
                        <div className="flex flex-col items-center">
                          <input
                            type="checkbox"
                            checked={
                              unprocessedItems.length > 0 &&
                              selectedHistoryItems.length ===
                                unprocessedItems.length
                            }
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600"
                          />
                          <span className="text-xs mt-1">Select</span>
                        </div>
                      </th>
                    </>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-30">
                    Sub Category
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-50">
                    Task Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-yellow-50 dark:bg-yellow-900/20 min-w-35">
                    Task End Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-20">
                    Frequency
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-25">
                    Attach Req
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-green-50 dark:bg-green-900/20 min-w-35">
                    Actual Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase bg-blue-50 dark:bg-blue-900/20 min-w-20">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-20">
                    Attachment
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase min-w-37.5">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {paginatedData.map((item) => {
                  const isInEditMode = editingRows.has(item._id);
                  const isSaving = updateStatusMutation.isPending;
                  const isProcessed =
                    !isEmpty(item.admin_done) &&
                    (item.admin_done?.trim() === "Done" ||
                      item.admin_done?.trim() === "Not Done");

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                    >
                      {/* Admin Done Column */}
                      {isAdmin && (
                        <td className="px-3 py-3 bg-gray-50 dark:bg-neutral-900/30 min-w-30">
                          {isInEditMode ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={
                                  editedAdminStatus[item._id] || "Not Done"
                                }
                                onChange={(e) =>
                                  setEditedAdminStatus((prev) => ({
                                    ...prev,
                                    [item._id]: e.target.value,
                                  }))
                                }
                                className="text-sm border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                                disabled={isSaving}
                              >
                                <option value="Not Done">Not Done</option>
                                <option value="Done">Done</option>
                              </select>
                              <button
                                onClick={() => handleSaveEdit(item)}
                                disabled={isSaving}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelEdit(item._id)}
                                disabled={isSaving}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                {item.admin_done?.trim() === "Done" ? (
                                  <div className="flex items-center text-green-600">
                                    <span className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2 text-xs">
                                      ✓
                                    </span>
                                    <span className="text-sm font-medium">
                                      Done
                                    </span>
                                  </div>
                                ) : item.admin_done?.trim() === "Not Done" ? (
                                  <div className="flex items-center text-red-600">
                                    <span className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-2 text-xs">
                                      ✗
                                    </span>
                                    <span className="text-sm font-medium">
                                      Not Done
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-muted-foreground">
                                    <span className="w-4 h-4 rounded border border-gray-300 mr-2" />
                                    <span className="text-sm">Pending</span>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleEditClick(item)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Select Checkbox */}
                      {isAdmin && (
                        <td className="px-3 py-3 w-24">
                          {isProcessed ? (
                            <div className="flex flex-col items-center">
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                                  item.admin_done?.trim() === "Done"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {item.admin_done?.trim() === "Done" ? "✓" : "✗"}
                              </span>
                              <span
                                className={`text-xs mt-1 font-medium ${
                                  item.admin_done?.trim() === "Done"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {item.admin_done?.trim()}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <input
                                type="checkbox"
                                checked={selectedHistoryItems.some(
                                  (i) => i._id === item._id,
                                )}
                                onChange={() => {
                                  setSelectedHistoryItems((prev) =>
                                    prev.some((i) => i._id === item._id)
                                      ? prev.filter((i) => i._id !== item._id)
                                      : [...prev, item],
                                  );
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-green-600"
                              />
                              <span className="text-[10px] text-muted-foreground mt-1 uppercase font-semibold text-center">
                                Mark
                                <br />
                                Done
                              </span>
                            </div>
                          )}
                        </td>
                      )}

                      {/* Data Columns */}
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium min-w-30">
                        {item.department || "—"}
                      </td>
                      <td
                        className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-50"
                        title={item.task_description || ""}
                      >
                        {item.task_description || "—"}
                      </td>
                      <td className="px-3 py-3 bg-yellow-50 dark:bg-yellow-900/10 min-w-35">
                        {item.task_start_date ? (
                          <div>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {item.task_start_date.includes(" ")
                                ? item.task_start_date.split(" ")[0]
                                : item.task_start_date}
                            </div>
                            {item.task_start_date.includes(" ") && (
                              <div className="text-xs text-muted-foreground">
                                {item.task_start_date.split(" ")[1]}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-20">
                        {item.frequency || "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-25">
                        {item.require_attachment || "—"}
                      </td>
                      <td className="px-3 py-3 bg-green-50 dark:bg-green-900/10 min-w-35">
                        {item.submission_date ? (
                          <div>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {item.submission_date.includes(" ")
                                ? item.submission_date.split(" ")[0]
                                : item.submission_date}
                            </div>
                            {item.submission_date.includes(" ") && (
                              <div className="text-xs text-muted-foreground">
                                {item.submission_date.split(" ")[1]}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 bg-blue-50 dark:bg-blue-900/10 min-w-20">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status?.toLowerCase() === "yes"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : item.status?.toLowerCase() === "no"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {item.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-20">
                        {item.image ? (
                          <div
                            className="w-10 h-10 rounded border border-gray-300 dark:border-neutral-600 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() =>
                              setImagePreviewUrl(item.image as string)
                            }
                          >
                            <img
                              src={item.image}
                              alt="Attachment Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td
                        className="px-3 py-3 text-sm text-foreground dark:text-gray-300 min-w-37.5"
                        title={item.remark || ""}
                      >
                        {item.remark || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-neutral-700">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Showing {showingStart}-{showingEnd} of {filteredData.length} •
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-neutral-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-gray-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-neutral-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        itemCount={confirmationModal.itemCount}
        onConfirm={confirmMarkDone}
        onCancel={() => setConfirmationModal({ isOpen: false, itemCount: 0 })}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!imagePreviewUrl}
        imageUrl={imagePreviewUrl}
        onClose={() => setImagePreviewUrl(null)}
      />
    </div>
  );
}
