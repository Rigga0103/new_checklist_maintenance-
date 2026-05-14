"use client";

import { useState, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Wrench,
  IndianRupee,
  CheckCircle2,
  Clock,
  Search,
  X,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Users,
  Calendar,
  FileText,
  Camera,
  ClipboardList,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Edit,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  useRepairingDashboard,
  formatDate,
  formatCurrency,
  getStatusColor,
} from "../hooks/useRepairingDashboard";
import {
  RepairingDashboardPageSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "./RepairingDashboardSkeleton";

// ============ Sub-Components ============

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  subtext?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 border-l-4 ${color} p-5 hover:shadow-md transition-all duration-300`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtext && (
            <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
        <div
          className={`p-3 rounded-xl ${color.replace("border-", "bg-").replace("-500", "-100")} dark:opacity-80`}
        >
          <Icon className={`w-6 h-6 ${color.replace("border-", "text-")}`} />
        </div>
      </div>
    </div>
  );
}

// ============ Main Component ============

export default function RepairingDashboard() {
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("role") || "user";
  });

  // Searchable dropdown states
  const [machineSearch, setMachineSearch] = useState("");
  const [machineTypeSearch, setMachineTypeSearch] = useState("");
  const [assignedOpen, setAssignedOpen] = useState(false);
  const [assignedSearch, setAssignedSearch] = useState("");
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [partOpen, setPartOpen] = useState(false);
  const [partSearch, setPartSearch] = useState("");

  useEffect(() => {
    const handleStorageChange = () => {
      const role = localStorage.getItem("role") || "user";
      if (role !== userRole) setUserRole(role);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [userRole]);

  const {
    repairLoading,
    repairError,
    refetchRepairs,
    repairData,
    filteredData,
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedMachines,
    selectedMachineTypes,
    selectedStatus,
    setSelectedStatus,
    selectedAssignedTo,
    setSelectedAssignedTo,
    selectedMonth,
    setSelectedMonth,
    selectedVendor,
    setSelectedVendor,
    selectedPart,
    setSelectedPart,
    showMachineDropdown,
    setShowMachineDropdown,
    showMachineTypeDropdown,
    setShowMachineTypeDropdown,
    machineDropdownRef,
    machineTypeDropdownRef,
    machinesList,
    machineTypesList,
    statusList,
    assignedToList,
    vendorsList,
    partsList,
    monthsList,
    hasActiveFilters,
    filteredRepairStats,
    machineChartData,
    statusChartData,
    monthlyTrendData,
    assignedToChartData,
    handleMachineSelection,
    handleMachineTypeSelection,
    resetFilters,
  } = useRepairingDashboard();

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      // Assuming toast is imported or available, otherwise native alert
      alert("No data to export");
      return;
    }

    const headers = [
      "Task ID",
      "Date",
      "Machine Name",
      "Machine Type",
      "Issue Detail",
      "Part Replaced",
      "Assigned To",
      "Vendor",
      "Warranty",
      "Bill Amount",
      "Status",
      "Remarks",
    ];

    const csvRows = [headers.join(",")];

    filteredData.forEach((task) => {
      const row = [
        task.task_id || task.id,
        formatDate(task.created_at),
        `"${task.machine_name || ""}"`,
        `"${task.machine_type || ""}"`,
        `"${(task.issue_detail || "").replace(/"/g, '""')}"`,
        `"${task.part_replaced || ""}"`,
        `"${task.assigned_to || ""}"`,
        `"${task.vendor_name || ""}"`,
        `"${task.warranty_start_date ? `${formatDate(task.warranty_start_date)} to ${formatDate(task.warranty_end_date)}` : ""}"`,
        task.bill_amount || "",
        `"${task.status || ""}"`,
        `"${(task.remarks || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `repairing_dashboard_export_${dateStr}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(14);
    doc.text("Repair Dashboard Report", 14, 15);
    doc.setFontSize(9);
    doc.text(
      `Exported: ${new Date().toLocaleDateString("en-IN")}  |  Total: ${filteredData.length}`,
      14,
      22,
    );

    autoTable(doc, {
      head: [[
        "Task ID", "Date", "Machine Name", "Machine Type",
        "Issue Detail", "Part Replaced", "Assigned To",
        "Vendor", "Warranty", "Bill Amount", "Status", "Remarks",
      ]],
      body: filteredData.map((task) => [
        task.task_id || task.id || "—",
        formatDate(task.created_at),
        task.machine_name || "—",
        task.machine_type || "—",
        task.issue_detail || "—",
        task.part_replaced || "—",
        task.assigned_to || "—",
        task.vendor_name || "—",
        task.warranty_start_date
          ? `${formatDate(task.warranty_start_date)} to ${formatDate(task.warranty_end_date)}`
          : "—",
        task.bill_amount ? `₹${task.bill_amount}` : "—",
        task.status || "—",
        task.remarks || "—",
      ]),
      startY: 27,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 4: { cellWidth: 40 }, 11: { cellWidth: 30 } },
    });

    doc.save(`repair_dashboard_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ---- Initial loading: show full skeleton ----
  if (repairLoading && !repairData.length) {
    return <RepairingDashboardPageSkeleton />;
  }

  // ---- Error state ----
  if (repairError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="mb-4 text-red-600 dark:text-red-400">{repairError}</p>
          <button
            onClick={() => refetchRepairs()}
            className="px-6 py-2 text-white transition-colors bg-orange-600 rounded-lg hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Repair Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete overview of repair requests activities
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search
            className="absolute text-gray-400 dark:text-gray-500 transform -translate-y-1/2 left-3 top-1/2"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by ID, machine, issue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* ===== Filters ===== */}
      <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
        <div className="flex flex-wrap items-end gap-4">
          {/* Month */}
          <div className="flex flex-col min-w-45">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar size={14} className="inline mr-1" />
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Months</option>
              {monthsList.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Machine Type Multi-select */}
          <div
            ref={machineTypeDropdownRef}
            className="flex flex-col min-w-50 relative"
          >
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Filter size={14} className="inline mr-1" />
              Machine Type
            </label>
            <div
              onClick={() => setShowMachineTypeDropdown(!showMachineTypeDropdown)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg cursor-pointer bg-white dark:bg-neutral-700 flex items-center justify-between min-h-10.5"
            >
              <span className="text-gray-700 dark:text-gray-200 truncate">
                {selectedMachineTypes.length > 0
                  ? `${selectedMachineTypes.length} selected`
                  : "All Machine Types"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showMachineTypeDropdown ? "rotate-180" : ""}`}
              />
            </div>
            {showMachineTypeDropdown && (
              <div className="absolute z-20 w-full mt-1 overflow-y-auto bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-60 top-full">
                <div className="sticky top-0 p-2 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search types..."
                      value={machineTypeSearch}
                      onChange={(e) => setMachineTypeSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMachineTypeSelection("");
                    }}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    Clear Selection
                  </button>
                </div>
                {machineTypesList.filter((t) => t.toLowerCase().includes(machineTypeSearch.toLowerCase())).map((machineType) => (
                  <div
                    key={machineType}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMachineTypeSelection(machineType);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-orange-50 dark:hover:bg-neutral-700 flex items-center gap-2 ${selectedMachineTypes.includes(machineType)
                      ? "bg-orange-100 dark:bg-orange-900/20"
                      : ""
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMachineTypes.includes(machineType)}
                      onChange={() => { }}
                      className="w-4 h-4 text-orange-600 border-gray-300 dark:border-neutral-600 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate" title={machineType}>
                      {machineType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Machine Multi-select */}
          <div
            ref={machineDropdownRef}
            className="flex flex-col min-w-50 relative"
          >
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Wrench size={14} className="inline mr-1" />
              Machine Name
            </label>
            <div
              onClick={() => setShowMachineDropdown(!showMachineDropdown)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg cursor-pointer bg-white dark:bg-neutral-700 flex items-center justify-between min-h-10.5"
            >
              <span className="text-gray-700 dark:text-gray-200 truncate">
                {selectedMachines.length > 0
                  ? `${selectedMachines.length} selected`
                  : "All Machines"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showMachineDropdown ? "rotate-180" : ""}`}
              />
            </div>
            {showMachineDropdown && (
              <div className="absolute z-20 w-full mt-1 overflow-y-auto bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-60 top-full">
                <div className="sticky top-0 p-2 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search machines..."
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMachineSelection("");
                    }}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    Clear Selection
                  </button>
                </div>
                {machinesList.filter((m) => m.toLowerCase().includes(machineSearch.toLowerCase())).map((machine) => (
                  <div
                    key={machine}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMachineSelection(machine);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-orange-50 dark:hover:bg-neutral-700 flex items-center gap-2 ${selectedMachines.includes(machine)
                      ? "bg-orange-100 dark:bg-orange-900/20"
                      : ""
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMachines.includes(machine)}
                      onChange={() => { }}
                      className="w-4 h-4 text-orange-600 border-gray-300 dark:border-neutral-600 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate" title={machine}>
                      {machine}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>



          {/* Status */}
          <div className="flex flex-col min-w-37.5">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              {statusList.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To */}
          <div className="flex flex-col min-w-37.5 relative">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Assigned To
            </label>
            <button
              onClick={() => { setAssignedOpen(!assignedOpen); setAssignedSearch(""); setVendorOpen(false); setPartOpen(false); }}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 flex items-center justify-between min-h-10.5 text-left"
            >
              <span className="text-gray-700 dark:text-gray-200 truncate text-sm">
                {selectedAssignedTo === "all" ? "All Assignees" : selectedAssignedTo}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0 transition-transform ${assignedOpen ? "rotate-180" : ""}`} />
            </button>
            {assignedOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAssignedOpen(false)} />
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg top-full overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-neutral-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input autoFocus type="text" placeholder="Search assignees..." value={assignedSearch} onChange={(e) => setAssignedSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    <button onClick={() => { setSelectedAssignedTo("all"); setAssignedOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-orange-50 dark:hover:bg-neutral-700 transition-colors ${selectedAssignedTo === "all" ? "text-orange-600 dark:text-orange-400 font-medium bg-orange-50/50 dark:bg-orange-900/20" : "text-gray-700 dark:text-gray-200"}`}>
                      All Assignees
                    </button>
                    {assignedToList.filter((p) => p.toLowerCase().includes(assignedSearch.toLowerCase())).map((person) => (
                      <button key={person} onClick={() => { setSelectedAssignedTo(person); setAssignedOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-orange-50 dark:hover:bg-neutral-700 transition-colors ${selectedAssignedTo === person ? "text-orange-600 dark:text-orange-400 font-medium bg-orange-50/50 dark:bg-orange-900/20" : "text-gray-700 dark:text-gray-200"}`}>
                        {person}
                      </button>
                    ))}
                    {assignedToList.filter((p) => p.toLowerCase().includes(assignedSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No assignees found</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Vendor */}
          <div className="flex flex-col min-w-37.5 relative">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Vendor
            </label>
            <button
              onClick={() => { setVendorOpen(!vendorOpen); setVendorSearch(""); setAssignedOpen(false); setPartOpen(false); }}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 flex items-center justify-between min-h-10.5 text-left"
            >
              <span className="text-gray-700 dark:text-gray-200 truncate text-sm">
                {selectedVendor === "all" ? "All Vendors" : selectedVendor}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0 transition-transform ${vendorOpen ? "rotate-180" : ""}`} />
            </button>
            {vendorOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setVendorOpen(false)} />
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg top-full overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-neutral-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input autoFocus type="text" placeholder="Search vendors..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    <button onClick={() => { setSelectedVendor("all"); setVendorOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-orange-50 dark:hover:bg-neutral-700 transition-colors ${selectedVendor === "all" ? "text-orange-600 dark:text-orange-400 font-medium bg-orange-50/50 dark:bg-orange-900/20" : "text-gray-700 dark:text-gray-200"}`}>
                      All Vendors
                    </button>
                    {vendorsList.filter((v) => v.toLowerCase().includes(vendorSearch.toLowerCase())).map((vendor) => (
                      <button key={vendor} onClick={() => { setSelectedVendor(vendor); setVendorOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-orange-50 dark:hover:bg-neutral-700 transition-colors ${selectedVendor === vendor ? "text-orange-600 dark:text-orange-400 font-medium bg-orange-50/50 dark:bg-orange-900/20" : "text-gray-700 dark:text-gray-200"}`}>
                        {vendor}
                      </button>
                    ))}
                    {vendorsList.filter((v) => v.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No vendors found</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Part Replaced */}
          <div className="flex flex-col min-w-37.5 relative">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Part Replaced
            </label>
            <button
              onClick={() => { setPartOpen(!partOpen); setPartSearch(""); setAssignedOpen(false); setVendorOpen(false); }}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 flex items-center justify-between min-h-10.5 text-left"
            >
              <span className="text-gray-700 dark:text-gray-200 truncate text-sm">
                {selectedPart === "all" ? "All Parts" : selectedPart}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0 transition-transform ${partOpen ? "rotate-180" : ""}`} />
            </button>
            {partOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPartOpen(false)} />
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg top-full overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-neutral-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input autoFocus type="text" placeholder="Search parts..." value={partSearch} onChange={(e) => setPartSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    <button onClick={() => { setSelectedPart("all"); setPartOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-orange-50 dark:hover:bg-neutral-700 transition-colors ${selectedPart === "all" ? "text-orange-600 dark:text-orange-400 font-medium bg-orange-50/50 dark:bg-orange-900/20" : "text-gray-700 dark:text-gray-200"}`}>
                      All Parts
                    </button>
                    {partsList.filter((p) => p.toLowerCase().includes(partSearch.toLowerCase())).map((part) => (
                      <button key={part} onClick={() => { setSelectedPart(part); setPartOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-orange-50 dark:hover:bg-neutral-700 transition-colors ${selectedPart === part ? "text-orange-600 dark:text-orange-400 font-medium bg-orange-50/50 dark:bg-orange-900/20" : "text-gray-700 dark:text-gray-200"}`}>
                        {part}
                      </button>
                    ))}
                    {partsList.filter((p) => p.toLowerCase().includes(partSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No parts found</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Date Range */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 text-red-700 dark:text-red-400 transition-colors bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              <X size={16} />
              Clear
            </button>
          )}

          {/* Export to CSV */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors ml-auto md:ml-0"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* Export to PDF */}
          <button
            onClick={exportToPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>

        {/* Selected Filter Tags */}
        {(selectedMachines.length > 0 || selectedMachineTypes.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-neutral-700">
            {selectedMachines.length > 0 && (
              <>
                <span className="self-center text-xs text-muted-foreground">
                  Machines:
                </span>
                {selectedMachines.map((machine) => (
                  <span
                    key={machine}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded-full"
                  >
                    {machine.length > 20
                      ? machine.substring(0, 20) + "..."
                      : machine}
                    <button
                      onClick={() => handleMachineSelection(machine)}
                      className="hover:text-orange-900 dark:hover:text-orange-100"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </>
            )}

            {selectedMachineTypes.length > 0 && (
              <>
                <span className="self-center ml-2 text-xs text-muted-foreground">
                  Types:
                </span>
                {selectedMachineTypes.map((machineType) => (
                  <span
                    key={machineType}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded-full"
                  >
                    {machineType.length > 20
                      ? machineType.substring(0, 20) + "..."
                      : machineType}
                    <button
                      onClick={() => handleMachineTypeSelection(machineType)}
                      className="hover:text-orange-900 dark:hover:text-orange-100"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== Repair System Overview ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Wrench
              size={20}
              className="text-orange-600 dark:text-orange-400"
            />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            Repair System Overview
          </h2>
          {hasActiveFilters && (
            <span className="px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              Filtered
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Repair Requests"
            value={filteredRepairStats.totalRepairs.toLocaleString()}
            icon={Wrench}
            color="border-blue-500"
            subtext={
              hasActiveFilters ? "Filtered results" : "All repair requests"
            }
          />
          <StatCard
            title="Total Repair Cost"
            value={formatCurrency(filteredRepairStats.totalCost)}
            icon={IndianRupee}
            color="border-purple-500"
            subtext={`Avg: ${formatCurrency(filteredRepairStats.avgCostPerRepair)}/repair`}
          />
          <StatCard
            title="Repairs Completed"
            value={filteredRepairStats.completedRepairs.toLocaleString()}
            icon={CheckCircle2}
            color="border-green-500"
            subtext={`${((filteredRepairStats.completedRepairs / filteredRepairStats.totalRepairs) * 100 || 0).toFixed(1)}% completion`}
          />
          <StatCard
            title="Repairs Pending"
            value={filteredRepairStats.pendingRepairs.toLocaleString()}
            icon={Clock}
            color="border-amber-500"
            subtext={`${filteredRepairStats.inProgressRepairs} in progress`}
          />
        </div>
      </div>

      {/* ===== Repair Records Table ===== */}
      <div className="overflow-hidden bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Recent Repair Records
            </h3>
            <span className="px-3 py-1 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              {filteredData.length} of {repairData.length}
            </span>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto max-h-125">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-neutral-700">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-neutral-700">
              <tr>
                {[
                  "Task ID",
                  "Date",
                  "Machine Type",
                  "Machine Name",
                  "Issue",
                  "Part Replaced",
                  "Assigned To",
                  "Vendor",
                  "Warranty",
                  "Bill Amount",
                  "Bill Copy",
                  "Photo",
                  "Status",
                  "Action",
                ].map((header, i) => (
                  <th
                    key={header}
                    className={`px-5 py-4 text-xs font-semibold tracking-wider text-muted-foreground dark:text-gray-300 uppercase ${i === 8 || i === 9 || i === 13 ? "text-center" : "text-left"
                      }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
              {filteredData.length > 0 ? (
                filteredData.slice(0, 50).map((row) => (
                  <tr
                    key={row.task_id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white align-middle whitespace-nowrap">
                      {row.task_id || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 align-middle whitespace-nowrap">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 align-middle whitespace-nowrap">
                      {row.machine_type || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-orange-700 dark:text-orange-400 align-middle">
                      {row.machine_name || "—"}
                    </td>
                    <td
                      className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 align-middle max-w-45 truncate"
                      title={row.issue_detail}
                    >
                      {row.issue_detail || "—"}
                    </td>
                    <td
                      className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 align-middle max-w-37.5 truncate"
                      title={row.part_replaced}
                    >
                      {row.part_replaced || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 align-middle">
                      {row.assigned_to || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 align-middle">
                      {row.vendor_name || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 align-middle">
                      {row.warranty_start_date
                        ? `${formatDate(row.warranty_start_date)} to ${formatDate(row.warranty_end_date)}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-gray-900 dark:text-white align-middle">
                      {row.bill_amount ? formatCurrency(row.bill_amount) : "—"}
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      {row.bill_copy_url ? (
                        <a
                          href={row.bill_copy_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                        >
                          <FileText size={14} />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      {row.photo_url ? (
                        <a
                          href={row.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <Camera size={14} />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(row.status)}`}
                      >
                        {row.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center align-middle whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => console.log("Edit", row.task_id)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {userRole === "admin" && (
                          <button
                            onClick={() => console.log("Delete", row.task_id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={14}
                    className="px-5 py-16 text-center text-muted-foreground"
                  >
                    No repair records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4 max-h-125 overflow-y-auto">
          {filteredData.length > 0 ? (
            filteredData.slice(0, 30).map((row) => (
              <div
                key={row.task_id}
                className="p-4 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {row.task_id} &bull; {formatDate(row.created_at)}
                    </p>
                    <p className="font-semibold text-orange-700 dark:text-orange-400">
                      {row.machine_name || "—"}{" "}
                      {row.machine_type && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ({row.machine_type})
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(row.status)}`}
                  >
                    {row.status || "Pending"}
                  </span>
                </div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {row.issue_detail || "No description"}
                </p>
                {row.part_replaced && (
                  <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      Part:
                    </span>{" "}
                    {row.part_replaced}
                  </p>
                )}
                {row.warranty_start_date && (
                  <p className="mb-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Warranty: {formatDate(row.warranty_start_date)} to {formatDate(row.warranty_end_date)}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 text-sm border-t border-gray-200 dark:border-neutral-600">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {row.assigned_to || "Unassigned"}
                    </span>
                    {row.bill_copy_url && (
                      <a
                        href={row.bill_copy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                      >
                        <FileText size={10} />
                        Bill
                      </a>
                    )}
                    {row.photo_url && (
                      <a
                        href={row.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        <Camera size={10} />
                        Photo
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {row.bill_amount ? formatCurrency(row.bill_amount) : "—"}
                    </span>
                    <div className="flex items-center gap-1 border-l pl-3 border-gray-200 dark:border-neutral-600">
                      <button
                        onClick={() => console.log("Edit", row.task_id)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      {userRole === "admin" && (
                        <button
                          onClick={() => console.log("Delete", row.task_id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No repair records found
            </div>
          )}
        </div>
      </div>

      {/* ===== Charts Section ===== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Bar Chart - Repairs by Machine using full width if odd number of charts */}

        {/* Bar Chart - Repairs by Machine */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <Wrench size={20} className="text-orange-500" />
            Top 10 Machines by Repairs
          </h3>
          {machineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={machineChartData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-gray-200, #e5e7eb)"
                />
                <XAxis type="number" fontSize={12} stroke="#888888" />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={11}
                  stroke="#888888"
                  width={120}
                />
                <Tooltip
                  formatter={(value: any) => [
                    value,
                    "Repairs",
                  ]}
                  labelFormatter={(label) =>
                    machineChartData.find((d) => d.name === label)?.fullName ||
                    label
                  }
                  contentStyle={{
                    backgroundColor: "var(--color-bg, #fff)",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="repairs" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-75 text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Pie Chart - Status Distribution */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <TrendingUp size={20} className="text-green-500" />
            Status Distribution
          </h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ percent }) =>
                    `${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(
                    value: any,
                    _name: any,
                    props: any,
                  ) => [value ?? "", props?.payload?.fullName || ""]}
                  contentStyle={{
                    backgroundColor: "var(--color-bg, #fff)",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-75 text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Line Chart - Monthly Trend */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <Calendar size={20} className="text-blue-500" />
            Monthly Repair Trend
          </h3>
          {monthlyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-gray-200, #e5e7eb)"
                />
                <XAxis dataKey="month" fontSize={12} stroke="#888888" />
                <YAxis yAxisId="left" fontSize={12} stroke="#888888" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  fontSize={12}
                  stroke="#888888"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-bg, #fff)",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="repairs"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: "#f97316" }}
                  name="Repairs"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6" }}
                  name="Cost (₹K)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-75 text-muted-foreground">
              No trend data available
            </div>
          )}
        </div>

        {/* Bar Chart - Tasks by Assignee */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
          <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <Users size={20} className="text-indigo-500" />
            Tasks by Assignee
          </h3>
          {assignedToChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assignedToChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-gray-200, #e5e7eb)"
                />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  stroke="#888888"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis fontSize={12} stroke="#888888" />
                <Tooltip
                  formatter={(value: any) => [
                    value,
                    "Tasks",
                  ]}
                  labelFormatter={(label) =>
                    assignedToChartData.find((d) => d.name === label)
                      ?.fullName || label
                  }
                  contentStyle={{
                    backgroundColor: "var(--color-bg, #fff)",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="tasks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-75 text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
