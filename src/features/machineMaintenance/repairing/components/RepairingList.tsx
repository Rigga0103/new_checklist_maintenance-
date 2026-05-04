"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  X,
  Upload,
  Save,
  Download,
  IndianRupee,
  FileText,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";
import {
  usePendingRepairsQuery,
  useAllOverdueRepairingQuery,
  useRepairHistoryQuery,
  useRepairLast7DaysQuery,
  useProcessRepairMutation,
} from "../server/tanstackQuery/useRepairingQueries";
import type { MachineRepair, RepairProcessFormData } from "../../types/types";
import { useMachineTypesQuery } from "../server/tanstackQuery/useMachineTypes";

// Predefined Work Done options
const WORK_DONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Cleaning", label: "Cleaning / सफाई" },
  { value: "Lubrication", label: "Lubrication / ग्रीसिंग" },
  { value: "Motor Replacement", label: "Motor Replacement / मोटर बदली" },
  { value: "Welding", label: "Welding / वेल्डिंग" },
  {
    value: "Electrical Wiring",
    label: "Electrical Wiring / इलेक्ट्रिकल वायरिंग",
  },
  { value: "PCB Repair", label: "PCB Repair / पीसीबी रिपेयर" },
  { value: "Fuse Change", label: "Fuse Change / फ्यूज बदला" },
  { value: "Bearing Replacement", label: "Bearing Replacement / बेयरिंग बदली" },
  { value: "Alignment", label: "Alignment / एलाइनमेंट" },
  { value: "Inspection", label: "Inspection / निरीक्षण" },
];

interface RepairingListProps {
  initialTab?: "pending" | "history" | "last7days" | "overdue";
  showTabs?: boolean;
}

export default function RepairingList({
  initialTab = "pending",
  showTabs = true,
}: RepairingListProps) {
  const [activeTab, setActiveTab] = useState<
    "pending" | "history" | "last7days" | "overdue"
  >(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modals state
  const [selectedRepair, setSelectedRepair] = useState<MachineRepair | null>(
    null,
  );
  const [viewDetailRepair, setViewDetailRepair] =
    useState<MachineRepair | null>(null);

  // User state
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [viewMyTasksOnly, setViewMyTasksOnly] = useState(false);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
    setUsername(localStorage.getItem("user-name"));
  }, []);

  const effectiveRole = viewMyTasksOnly
    ? "user"
    : role === "admin"
      ? "admin"
      : "user";
  const {
    canRead: canReadPending,
    canEdit: canEditPending,
    isLoading: isRbacPendingLoading,
  } = useRBAC("repairing");
  const { canRead: canReadHistory, isLoading: isRbacHistoryLoading } =
    useRBAC("repair_history");

  // Queries
  const pendingQuery = usePendingRepairsQuery(
    page,
    limit,
    searchTerm,
    effectiveRole,
    username,
    startDate || undefined,
    endDate || undefined,
  );
  const historyQuery = useRepairHistoryQuery(
    page,
    limit,
    searchTerm,
    effectiveRole,
    username,
    startDate || undefined,
    endDate || undefined,
  );
  const last7DaysQuery = useRepairLast7DaysQuery(
    page,
    limit,
    searchTerm,
    effectiveRole,
    username,
    startDate || undefined,
    endDate || undefined,
  );

  const overdueQuery = useAllOverdueRepairingQuery(
    page,
    limit,
    searchTerm,
    effectiveRole,
    username,
  );

  const processMutation = useProcessRepairMutation();

  const getActiveQuery = () => {
    switch (activeTab) {
      case "pending":
        return pendingQuery;
      case "overdue":
        return overdueQuery;
      case "history":
        return historyQuery;
      case "last7days":
        return last7DaysQuery;
    }
  };

  const activeQuery = getActiveQuery();
  let repairs = activeQuery.data?.data || [];

  const { data: dbMachineTypes = [] } = useMachineTypesQuery();

  // Client-side filtering for machineType since it might not be indexed perfectly in all tabs yet
  if (typeFilter) {
    repairs = repairs.filter(
      (r) => r.machine_type?.toLowerCase() === typeFilter.toLowerCase(),
    );
  }

  const totalCount = activeQuery.data?.totalCount || 0;
  const isLoading =
    activeQuery.isLoading || isRbacPendingLoading || isRbacHistoryLoading;
  const totalPages = Math.ceil(totalCount / limit);

  // Process form state
  const [processForm, setProcessForm] = useState<RepairProcessFormData>({
    partReplaced: "",
    workDone: "",
    status: "in_progress",
    vendorName: "",
    billAmount: undefined,
    remarks: "",
    warrantyFromDate: "",
    warrantyToDate: "",
    workDoneBy: "",
    typeOfWork: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [hasWarranty, setHasWarranty] = useState(false);

  const handleTabChange = (
    tab: "pending" | "history" | "last7days" | "overdue",
  ) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const openProcessModal = (repair: MachineRepair) => {
    setSelectedRepair(repair);
    setProcessForm({
      partReplaced: repair.part_replaced || "",
      workDone: repair.work_done || "",
      status: repair.status || "in_progress",
      vendorName: repair.vendor_name || "",
      billAmount: repair.bill_amount || undefined,
      remarks: repair.remarks || "",
      warrantyFromDate: repair.warranty_start_date || "",
      warrantyToDate: repair.warranty_end_date || "",
      workDoneBy: repair.Work_Done_By || "",
      typeOfWork: repair.Type_of_Work || "",
    });
    setPhotoFile(null);
    setBillFile(null);
    setPhotoPreview(repair.photo_url || null);
    setHasWarranty(!!(repair.warranty_start_date || repair.warranty_end_date));
  };

  const closeProcessModal = () => {
    setSelectedRepair(null);
    setPhotoFile(null);
    setBillFile(null);
    setPhotoPreview(null);
    setHasWarranty(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBillFile(file);
    }
  };

  const handleProcessSubmit = async () => {
    if (!selectedRepair) return;
    try {
      await processMutation.mutateAsync({
        taskId: selectedRepair.task_id,
        data: processForm,
        photoFile: photoFile || undefined,
        billFile: billFile || undefined,
      });
      toast.success("Repair processed successfully");
      closeProcessModal();
    } catch (error) {
      console.error("Error processing repair:", error);
      toast.error("Failed to process repair");
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Pending
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            In Progress
          </span>
        );
      case "completed":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const exportToExcel = () => {
    if (repairs.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "Task ID",
      "Machine Type",
      "Machine Name",
      "Issue Detail",
      "Part Repair",
      "Requested By",
      "Assigned To",
      "Vendor",
      "Qty",
      "Rate",
      "Purchase Date",
    ];
    if (activeTab === "pending" || activeTab === "overdue") {
      headers.push("Date", "Status");
    } else if (activeTab === "history") {
      headers.splice(5, 0, "Warranty", "Work Done");
      headers.push("Bill Amount", "Request Date", "Completion Date", "Status");
    } else {
      headers.push("Request Date", "Completion Date", "Status", "Remarks");
    }

    const rows = repairs.map((t) => {
      const base = [
        t.task_id,
        t.machine_type || "",
        t.machine_name || "",
        t.issue_detail || "",
        t.part_replaced || "",
        t.form_filled_by || "",
        t.assigned_to || "",
        t.vendor_name || "",
        t.qty || "",
        t.bill_amount || "",
        formatDate(t.purchase_date),
      ];
      if (activeTab === "pending" || activeTab === "overdue") {
        return [...base, formatDate(t.created_at), t.status || ""];
      } else if (activeTab === "history") {
        return [
          t.task_id,
          t.machine_type || "",
          t.machine_name || "",
          t.issue_detail || "",
          t.part_replaced || "",
          t.warranty_start_date ? `${t.warranty_start_date} to ${t.warranty_end_date || 'N/A'}` : "",
          t.work_done || "",
          t.form_filled_by || "",
          t.assigned_to || "",
          t.vendor_name || "",
          t.qty || "",
          t.bill_amount || "",
          formatDate(t.purchase_date),
          formatDate(t.created_at),
          formatDate(t.actual_date),
          t.status || "",
        ];
      } else {
        return [
          ...base,
          formatDate(t.created_at),
          formatDate(t.actual_date),
          t.status || "",
          t.remarks || "",
        ];
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repairing_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Exported successfully");
  };

  const canRead =
    activeTab === "pending" || activeTab === "overdue"
      ? canReadPending
      : canReadHistory;
  if (!canRead && role) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Access Denied.
      </div>
    );
  }

  return (
    <div className="p-6 pt-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {activeTab === "pending"
              ? "Pending Repairs"
              : activeTab === "overdue"
                ? "All Overdue Repairs"
                : activeTab === "history"
                  ? "Repair History"
                  : "Repairing Last 7 Days"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {viewMyTasksOnly && username
              ? `Showing your tasks only (${username})`
              : "Process and manage repair requests"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800/50 p-1 rounded-xl border border-gray-200 dark:border-neutral-700">
            <button
              onClick={() => setViewMyTasksOnly(false)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!viewMyTasksOnly ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              ✨ All Tasks
            </button>
            <button
              onClick={() => setViewMyTasksOnly(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMyTasksOnly ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              👤 My Tasks
            </button>
          </div>
          <button
            onClick={() => activeQuery.refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${activeQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-neutral-800 p-3 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1 bg-gray-100/80 dark:bg-neutral-900/50 p-1 rounded-lg border border-gray-200/50 dark:border-neutral-700/50">
          <button
            onClick={() => handleTabChange("pending")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "pending" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
          >
            Pending
          </button>
          <button
            onClick={() => handleTabChange("overdue")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "overdue" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
          >
            All Overdue
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "history" ? "bg-gray-700 dark:bg-neutral-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
          >
            History
          </button>
          <button
            onClick={() => handleTabChange("last7days")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === "last7days" ? "bg-gray-600 dark:bg-neutral-500 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
          >
            Last 7 Days
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="min-w-[120px] px-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-foreground"
          >
            <option value="">All Types</option>
            {dbMachineTypes.map((typeObj) => (
              <option key={typeObj.type_name} value={typeObj.type_name}>
                {typeObj.type_name}
              </option>
            ))}
          </select>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search machine, issue..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:outline-none text-foreground"
              title="From Date"
            />
            <span className="text-gray-500 dark:text-gray-400 text-sm">-</span>
            <input
              type="date"
              value={endDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 focus:outline-none text-foreground"
              title="To Date"
            />
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
            <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-4" />
            <p>No {activeTab} repairs found</p>
          </div>
        ) : (
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 320px)" }}
          >
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-900 sticky top-0 z-10">
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Machine Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Machine Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Issue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Part Repair
                  </th>
                  {activeTab === "history" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Work Done
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Requested By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Purchase. Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Request Date
                  </th>
                  {(activeTab === "history" || activeTab === "last7days") && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Completed Date
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                  {activeTab === "last7days" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Remarks
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {repairs.map((repair) => (
                  <tr
                    key={repair.task_id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {repair.task_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.machine_type || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.machine_name || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-foreground max-w-37.5 truncate"
                      title={repair.issue_detail || undefined}
                    >
                      {repair.issue_detail || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.part_replaced || "-"}
                    </td>
                    {activeTab === "history" && (
                      <td className="px-4 py-3 text-sm text-foreground max-w-37.5 truncate">
                        {repair.work_done || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.form_filled_by || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.assigned_to || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground truncate max-w-30">
                      {repair.vendor_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.qty || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {repair.bill_amount ? `₹${repair.bill_amount}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(repair.purchase_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(repair.created_at)}
                    </td>
                    {(activeTab === "history" || activeTab === "last7days") && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(repair.actual_date)}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {getStatusBadge(repair.status)}
                    </td>
                    {activeTab === "last7days" && (
                      <td
                        className="px-4 py-3 text-sm text-muted-foreground max-w-37.5 truncate"
                        title={repair.remarks || ""}
                      >
                        {repair.remarks || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {activeTab === "pending" || activeTab === "overdue" ? (
                        canEditPending ? (
                          <button
                            onClick={() => openProcessModal(repair)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Process
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No Access
                          </span>
                        )
                      ) : (
                        <button
                          onClick={() => setViewDetailRepair(repair)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-neutral-700/50 bg-gray-50/50 dark:bg-neutral-900/20 gap-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="text-gray-900 dark:text-white">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="text-gray-900 dark:text-white">
                {Math.min(page * limit, totalCount)}
              </span>{" "}
              of{" "}
              <span className="text-gray-900 dark:text-white">
                {totalCount}
              </span>{" "}
              entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                <span className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                  {page}
                </span>
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Process Modal (Same as before) */}
      {selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-foreground">
                Process Repair {selectedRepair.task_id}
              </h2>
              <button
                onClick={closeProcessModal}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg space-y-2">
                <p>
                  <span className="text-muted-foreground">Machine:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepair.machine_name}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Issue:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepair.issue_detail}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Requested by:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepair.form_filled_by}
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Qty</p>
                    <p className="text-xs font-bold">{selectedRepair.qty || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Rate</p>
                    <p className="text-xs font-bold text-green-600">
                      {selectedRepair.bill_amount ? `₹${selectedRepair.bill_amount}` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Purchase. Date</p>
                    <p className="text-xs font-bold">{formatDate(selectedRepair.purchase_date)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Status
                </label>
                <select
                  value={processForm.status}
                  onChange={(e) =>
                    setProcessForm((prev) => ({
                      ...prev,
                      status: e.target.value as RepairProcessFormData["status"],
                    }))
                  }
                  className="min-w-32 w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancel</option>
                </select>
              </div>

              {processForm.status === "in_progress" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Remarks
                  </label>
                  <textarea
                    value={processForm.remarks}
                    onChange={(e) =>
                      setProcessForm((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground resize-none"
                  />
                </div>
              )}

              {processForm.status === "completed" && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Work Done By
                      </label>
                      <input
                        type="text"
                        value={processForm.workDoneBy || ""}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            workDoneBy: e.target.value,
                          }))
                        }
                        placeholder="Name of person..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Type of Work
                      </label>
                      <select
                        value={processForm.typeOfWork || ""}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            typeOfWork: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      >
                        <option value="">Select Type</option>
                        <option value="in_house">In House</option>
                        <option value="out_source">Out Source</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Part Replaced
                      </label>
                      <input
                        type="text"
                        value={processForm.partReplaced}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            partReplaced: e.target.value,
                          }))
                        }
                        placeholder="e.g., Motor, Belt"
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 h-5">
                        <input
                          type="checkbox"
                          id="warranty-checkbox-list"
                          checked={hasWarranty}
                          onChange={(e) => {
                            setHasWarranty(e.target.checked);
                            if (!e.target.checked) {
                              setProcessForm((prev) => ({
                                ...prev,
                                warrantyFromDate: "",
                                warrantyToDate: "",
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                        />
                        <label
                          htmlFor="warranty-checkbox-list"
                          className="block text-sm font-medium text-foreground cursor-pointer select-none"
                        >
                          Warranty
                        </label>
                      </div>
                      {hasWarranty && (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase text-muted-foreground mb-1 ml-1">From</label>
                            <input
                              type="date"
                              value={processForm.warrantyFromDate || ""}
                              onChange={(e) =>
                                setProcessForm((prev) => ({
                                  ...prev,
                                  warrantyFromDate: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground text-sm"
                              title="Warranty From"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase text-muted-foreground mb-1 ml-1">To</label>
                            <input
                              type="date"
                              value={processForm.warrantyToDate || ""}
                              onChange={(e) =>
                                setProcessForm((prev) => ({
                                  ...prev,
                                  warrantyToDate: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground text-sm"
                              title="Warranty To"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Work Done
                    </label>
                    <select
                      value={
                        WORK_DONE_OPTIONS.some(
                          (opt) => opt.value === processForm.workDone,
                        )
                          ? processForm.workDone
                          : "other"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setProcessForm((prev) => ({
                          ...prev,
                          workDone: val === "other" ? prev.workDone : val,
                        }));
                      }}
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                    >
                      <option value="">Select work done...</option>
                      {WORK_DONE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                    {!WORK_DONE_OPTIONS.some(
                      (opt) => opt.value === processForm.workDone,
                    ) && (
                        <input
                          type="text"
                          value={processForm.workDone}
                          onChange={(e) =>
                            setProcessForm((prev) => ({
                              ...prev,
                              workDone: e.target.value,
                            }))
                          }
                          placeholder="Describe the work performed..."
                          className="mt-2 w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                        />
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Vendor Name
                      </label>
                      <input
                        type="text"
                        value={processForm.vendorName}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            vendorName: e.target.value,
                          }))
                        }
                        placeholder="Vendor name"
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Bill Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={processForm.billAmount || ""}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            billAmount: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Work Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                      {photoPreview && (
                        <div className="relative w-16 h-16">
                          <Image
                            src={photoPreview}
                            alt="Preview"
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Bill Copy
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg cursor-pointer transition-colors w-fit">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {billFile ? billFile.name : "Upload Bill"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleBillChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Remarks
                    </label>
                    <textarea
                      value={processForm.remarks}
                      onChange={(e) =>
                        setProcessForm((prev) => ({
                          ...prev,
                          remarks: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Additional notes..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground resize-none"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={closeProcessModal}
                className="px-4 py-2 text-sm font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSubmit}
                disabled={processMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {processMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewDetailRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-foreground">
                Repair Details {viewDetailRepair.task_id}
              </h2>
              <button
                onClick={() => setViewDetailRepair(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Machine</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.machine_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(viewDetailRepair.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Issue Detail</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.issue_detail || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Work Done</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.work_done || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Part Replaced</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.part_replaced || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warranty</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {viewDetailRepair.warranty_start_date
                      ? `${formatDate(viewDetailRepair.warranty_start_date)} to ${formatDate(viewDetailRepair.warranty_end_date)}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.vendor_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bill Amount</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(viewDetailRepair.bill_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qty</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.qty || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground"></p>
                  <p className="font-medium text-foreground">
                    {formatDate(viewDetailRepair.purchase_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed On</p>
                  <p className="font-medium text-foreground">
                    {formatDate(viewDetailRepair.actual_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested By</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.form_filled_by || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium text-foreground">
                    {viewDetailRepair.assigned_to || "-"}
                  </p>
                </div>
                {viewDetailRepair.remarks && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Remarks</p>
                    <p className="font-medium text-foreground">
                      {viewDetailRepair.remarks}
                    </p>
                  </div>
                )}
              </div>
              {viewDetailRepair.photo_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Work Photo
                  </p>
                  <div className="relative w-full h-48">
                    <Image
                      src={viewDetailRepair.photo_url}
                      alt="Work photo"
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
              {viewDetailRepair.bill_copy_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Bill Copy
                  </p>
                  <a
                    href={viewDetailRepair.bill_copy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Bill
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setViewDetailRepair(null)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
