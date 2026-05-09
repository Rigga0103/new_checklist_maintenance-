"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  ListChecks,
  Wrench,
} from "lucide-react";
import { useAllChecklistTasks } from "../server/tanstackQuery/useApproval";
import { useUniqueMaintenanceTemplates } from "@/features/machineMaintenance/maintenance/server/tanstackQuery/useMaintenanceQueries";
import { ApprovalTask } from "../types/types";
import { MachineMaintenance } from "@/features/machineMaintenance/types/types";

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

// Helper function to parse ISO date string
const parseISO = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

const ITEMS_PER_PAGE = 50;

export default function UniqueApproval() {
  const [activeTab, setActiveTab] = useState<"checklist" | "maintenance">(
    "checklist",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [userRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "";
  });
  const [username] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("user-name") || "";
  });

  const isAdmin = userRole === "admin";

  // Queries
  const {
    data: checklistData,
    isLoading: isLoadingChecklist,
    refetch: refetchChecklist,
  } = useAllChecklistTasks(userRole, username);

  const {
    data: maintenanceData,
    isLoading: isLoadingMaintenance,
    refetch: refetchMaintenance,
  } = useUniqueMaintenanceTemplates();

  const isLoading = isLoadingChecklist || isLoadingMaintenance;

  const handleRefresh = () => {
    refetchChecklist();
    refetchMaintenance();
  };

  // Combine members from both sources
  const membersList = useMemo(() => {
    const checklistMembers = checklistData?.members || [];
    const maintenanceMembers =
      maintenanceData?.map((m) => m.doer_name).filter((n): n is string => !!n) ||
      [];
    return [...new Set([...checklistMembers, ...maintenanceMembers])].sort();
  }, [checklistData, maintenanceData]);

  // Total unique counts for both tabs (always computed, independent of activeTab)
  const uniqueChecklistCount = useMemo(() => {
    return checklistData?.data?.length ?? 0;
  }, [checklistData]);

  const uniqueMaintenanceCount = useMemo(() => {
    return maintenanceData?.length ?? 0;
  }, [maintenanceData]);

  // Transform maintenance data to a common format if needed, but we'll use conditional rendering
  const uniqueTasks = useMemo(() => {
    if (activeTab === "checklist") {
      // unique_checklist is already the template table — no dedup needed.
      // Sort by name then task_description for a predictable display order.
      return [...(checklistData?.data || [])].sort((a, b) => {
        const nameCompare = (a.name || "").localeCompare(b.name || "");
        if (nameCompare !== 0) return nameCompare;
        return (a.task_description || "").localeCompare(b.task_description || "");
      });
    } else {
      return [...(maintenanceData || [])].sort((a, b) =>
        (a.task_description || "").localeCompare(b.task_description || ""),
      );
    }
  }, [activeTab, checklistData, maintenanceData]);

  // Filter data
  const filteredData = useMemo(() => {
    return uniqueTasks.filter((item) => {
      // Common filtering logic
      let itemDescription = "";
      let itemName = "";
      let assignedTo = "";
      let itemDate: Date | null = null;

      if ("task_description" in item) {
        itemDescription = item.task_description || "";
      }

      if (activeTab === "checklist") {
        const ci = item as ApprovalTask;
        itemName = ci.department || "";
        assignedTo = ci.name || "";
        itemDate = parseDateFromDDMMYYYY(ci.submission_date);
      } else {
        const mi = item as MachineMaintenance;
        itemName = mi.machine_name || "";
        assignedTo = mi.doer_name || "";
        itemDate = parseISO(mi.task_start_date);
      }

      const matchesSearch = searchTerm
        ? itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        itemName.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesMember =
        selectedMembers.length > 0
          ? selectedMembers.includes(assignedTo)
          : true;

      let matchesDateRange = true;
      if (startDate || endDate) {
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
    });
  }, [uniqueTasks, searchTerm, selectedMembers, startDate, endDate, activeTab]);

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

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMembers([]);
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    setMemberSearchTerm("");
  };

  const handleMemberSelection = (member: string) => {
    setSelectedMembers((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member],
    );
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
            Unique Tasks
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            View unique {activeTab === "checklist" ? "checklist" : "maintenance"}{" "}
            tasks with no repetitions
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

      {/* Count cards */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onClick={() => { setActiveTab("checklist"); setCurrentPage(1); resetFilters(); }}
          className={`cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all ${
            activeTab === "checklist"
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
              : "bg-white dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 hover:border-blue-200 dark:hover:border-blue-800"
          }`}
        >
          <div className={`p-3 rounded-lg ${activeTab === "checklist" ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-neutral-700"}`}>
            <ListChecks className={`w-6 h-6 ${activeTab === "checklist" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Checklist Tasks</p>
            {isLoadingChecklist ? (
              <div className="h-7 w-16 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{uniqueChecklistCount.toLocaleString()}</p>
            )}
          </div>
        </div>

        <div
          onClick={() => { setActiveTab("maintenance"); setCurrentPage(1); resetFilters(); }}
          className={`cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all ${
            activeTab === "maintenance"
              ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700"
              : "bg-white dark:bg-neutral-800 border-gray-100 dark:border-neutral-700 hover:border-orange-200 dark:hover:border-orange-800"
          }`}
        >
          <div className={`p-3 rounded-lg ${activeTab === "maintenance" ? "bg-orange-100 dark:bg-orange-900/40" : "bg-gray-100 dark:bg-neutral-700"}`}>
            <Wrench className={`w-6 h-6 ${activeTab === "maintenance" ? "text-orange-600 dark:text-orange-400" : "text-gray-500 dark:text-gray-400"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Maintenance Tasks</p>
            {isLoadingMaintenance ? (
              <div className="h-7 w-16 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{uniqueMaintenanceCount.toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab("checklist"); setCurrentPage(1); resetFilters(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "checklist"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
          }`}
        >
          <ListChecks className="w-4 h-4" />
          Checklist Tasks
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
            activeTab === "checklist" ? "bg-white/20 text-white" : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          }`}>
            {isLoadingChecklist ? "…" : uniqueChecklistCount.toLocaleString()}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("maintenance"); setCurrentPage(1); resetFilters(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "maintenance"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 dark:bg-neutral-700 text-foreground dark:text-gray-300"
          }`}
        >
          <Wrench className="w-4 h-4" />
          Maintenance Tasks
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
            activeTab === "maintenance" ? "bg-white/20 text-white" : "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
          }`}>
            {isLoadingMaintenance ? "…" : uniqueMaintenanceCount.toLocaleString()}
          </span>
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

          {/* Search Term */}
          <div className="flex-1 min-w-50">
            <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
              Search Tasks
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded flex-1" />
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p>
              {searchTerm || selectedMembers.length > 0 || startDate || endDate
                ? "No unique tasks matching your filters"
                : `No ${activeTab} tasks found`}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Sub Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Task Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Task End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Attach Req
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Start Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-100 dark:divide-neutral-700">
                {paginatedData.map((item, index) => {
                  let member = "";
                  let subCategory = "";
                  let taskDescription = "";
                  let taskEndDate = "";
                  let frequency = "";
                  let attachReq = "";
                  let actualDate = "";

                  if (activeTab === "checklist") {
                    const ci = item as ApprovalTask;
                    member = ci.name || "—";
                    subCategory = ci.department || "—";
                    taskDescription = ci.task_description || "—";
                    taskEndDate = ci.planned_date || "—";
                    frequency = ci.frequency || "—";
                    attachReq = ci.require_attachment || "No";
                    actualDate = ci.submission_date || "—";
                  } else {
                    const mi = item as MachineMaintenance;
                    member = mi.doer_name || "—";
                    subCategory = mi.machine_name || "—";
                    taskDescription = mi.task_description || "—";
                    // For maintenance, task_start_date is used as planned date in some contexts
                    taskEndDate = mi.task_start_date ? new Date(mi.task_start_date).toLocaleDateString("en-GB") : "—";
                    frequency = mi.frequency || "—";
                    attachReq = mi.require_attachment || "No";
                    actualDate = mi.actual_date ? new Date(mi.actual_date).toLocaleDateString("en-GB") : "—";
                  }

                  return (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {member}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {subCategory}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-75 truncate" title={taskDescription}>
                        {taskDescription}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {taskEndDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {attachReq}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {actualDate}
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
    </div>
  );
}
