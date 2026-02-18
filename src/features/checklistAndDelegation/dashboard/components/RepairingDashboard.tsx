"use client";

import { useState, useMemo } from "react";

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
    machineDropdownRef,
    machinesList,
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
    resetFilters,
  } = useRepairingDashboard();

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
            Repair & Maintenance Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete overview of repair requests and scheduled maintenance
            activities
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

          {/* Machine Multi-select */}
          <div
            ref={machineDropdownRef}
            className="flex flex-col min-w-50 relative"
          >
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Wrench size={14} className="inline mr-1" />
              Machine
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
                <div className="sticky top-0 p-2 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMachineSelection("");
                      resetFilters();
                    }}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    Clear Selection
                  </button>
                </div>
                {machinesList.map((machine) => (
                  <div
                    key={machine}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMachineSelection(machine);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-orange-50 dark:hover:bg-neutral-700 flex items-center gap-2 ${
                      selectedMachines.includes(machine)
                        ? "bg-orange-100 dark:bg-orange-900/20"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMachines.includes(machine)}
                      onChange={() => {}}
                      className="w-4 h-4 text-orange-600 border-gray-300 dark:border-neutral-600 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
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
          <div className="flex flex-col min-w-37.5">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Assigned To
            </label>
            <select
              value={selectedAssignedTo}
              onChange={(e) => setSelectedAssignedTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Assignees</option>
              {assignedToList.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div className="flex flex-col min-w-37.5">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Vendor
            </label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Vendors</option>
              {vendorsList.map((vendor) => (
                <option key={vendor} value={vendor}>
                  {vendor}
                </option>
              ))}
            </select>
          </div>

          {/* Part Replaced */}
          <div className="flex flex-col min-w-37.5">
            <label className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Part Replaced
            </label>
            <select
              value={selectedPart}
              onChange={(e) => setSelectedPart(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Parts</option>
              {partsList.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
            </select>
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
        </div>

        {/* Selected Machine Tags */}
        {selectedMachines.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-neutral-700">
            <span className="self-center text-xs text-muted-foreground">
              Selected Machines:
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
                  "Machine",
                  "Issue",
                  "Part Replaced",
                  "Assigned To",
                  "Vendor",
                  "Bill Amount",
                  "Bill Copy",
                  "Photo",
                  "Status",
                ].map((header, i) => (
                  <th
                    key={header}
                    className={`px-5 py-4 text-xs font-semibold tracking-wider text-muted-foreground dark:text-gray-300 uppercase ${
                      i === 7 || i === 8 ? "text-center" : "text-left"
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
                    key={row.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white align-middle whitespace-nowrap">
                      {row.task_id || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 align-middle whitespace-nowrap">
                      {formatDate(row.created_at)}
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={11}
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
                key={row.id}
                className="p-4 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {row.task_id} &bull; {formatDate(row.created_at)}
                    </p>
                    <p className="font-semibold text-orange-700 dark:text-orange-400">
                      {row.machine_name || "—"}
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
                  <span className="font-bold text-gray-900 dark:text-white">
                    {row.bill_amount ? formatCurrency(row.bill_amount) : "—"}
                  </span>
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
                  formatter={(value: number | string | undefined) => [
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
                    value: number | string | undefined,
                    _name: string | undefined,
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
                  formatter={(value: number | string | undefined) => [
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
