"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  IndianRupee,
  Settings2,
  Wrench,
  Loader2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define type for machine repair records
type MachineRepair = {
  task_id: number;
  created_at: string;
  form_filled_by: string | null;
  assigned_to: string | null;
  machine_name: string | null;
  issue_detail: string | null;
  part_replaced: string | null;
  task_start_date: string | null;
  actual_date: string | null;
  delay: string | null;
  work_done: string | null;
  photo_url: string | null;
  status: string | null;
  vendor_name: string | null;
  bill_copy_url: string | null;
  bill_amount: number | null;
  remarks: string | null;
  motor_name: string | null;
  warranty: string | null;
  machine_type: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  Work_Done_By: string | null;
  Type_of_Work: string | null;
};

export default function AMC() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"vendor" | "machine">("machine");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Year filter state
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [totalAllTimeCost, setTotalAllTimeCost] = useState(0);

  // State for machine repair data
  const [repairs, setRepairs] = useState<MachineRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch machine repair data when the machine tab is active or year changes
  useEffect(() => {
    if (activeTab === "machine") {
      fetchRepairs();
      fetchTotalStats();
    }
    // Reset to first page when tab or year changes
    setCurrentPage(1);
  }, [activeTab, selectedYear]);

  const fetchTotalStats = async () => {
    try {
      const { data, error } = await supabase
        .from("machine_repair")
        .select("bill_amount");

      if (error) throw error;
      const total = (data || []).reduce((sum, item) => sum + (item.bill_amount || 0), 0);
      setTotalAllTimeCost(total);
    } catch (err) {
      console.error("Error fetching total stats:", err);
    }
  };

  const fetchRepairs = async () => {
    setLoading(true);
    setError(null);
    try {
      const startOfYear = `${selectedYear}-01-01T00:00:00Z`;
      const endOfYear = `${selectedYear}-12-31T23:59:59Z`;

      const { data, error } = await supabase
        .from("machine_repair")
        .select("*")
        .gte("created_at", startOfYear)
        .lte("created_at", endOfYear)
        .order("task_id", { ascending: false });

      if (error) throw error;
      setRepairs(data || []);
    } catch (err: any) {
      console.error("Error fetching machine repairs:", err);
      setError(err.message || "Failed to load repair data");
    } finally {
      setLoading(false);
    }
  };

  // Filtered data for machine tab only
  const filteredData = useMemo(() => {
    if (activeTab === "machine") {
      return repairs.filter((item) => {
        const matchesSearch =
          (item.machine_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (item.status?.toLowerCase() === statusFilter.toLowerCase());
        return matchesSearch && matchesStatus;
      });
    }
    return [];
  }, [activeTab, repairs, searchTerm, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Stats for machine tab only
  const stats = useMemo(() => {
    if (activeTab === "machine") {
      const tabData = repairs;
      const total = tabData.length;
      const pending = tabData.filter((x) => x.status === "pending").length;
      const completed = tabData.filter((x) => x.status === "completed").length;
      // Calculate total bill amount sum
      const totalBillAmount = tabData.reduce((sum, item) => {
        return sum + (item.bill_amount || 0);
      }, 0);
      return {
        total,
        pending,
        completed,
        totalBillAmount,
      };
    }
    return { total: 0, pending: 0, completed: 0, totalBillAmount: 0 };
  }, [activeTab, repairs]);

  // Aggregate costs by machine - Group smaller ones for the chart
  const machineCosts = useMemo(() => {
    if (activeTab !== "machine" || repairs.length === 0) return [];

    const costsMap: Record<string, number> = {};
    repairs.forEach((repair) => {
      const name = (repair.machine_name || "Unknown Machine").trim();
      const cost = repair.bill_amount || 0;
      costsMap[name] = (costsMap[name] || 0) + cost;
    });

    const sorted = Object.entries(costsMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // For the chart, we group beyond top 5
    if (sorted.length > 6) {
      const top5 = sorted.slice(0, 5);
      const othersValue = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
      return [...top5, { name: "Others", value: othersValue }];
    }

    return sorted;
  }, [activeTab, repairs]);

  // Full list of machine costs for the table (not grouped)
  const fullMachineCosts = useMemo(() => {
    if (activeTab !== "machine" || repairs.length === 0) return [];
    const costsMap: Record<string, number> = {};
    repairs.forEach((repair) => {
      const name = (repair.machine_name || "Unknown Machine").trim();
      const cost = repair.bill_amount || 0;
      costsMap[name] = (costsMap[name] || 0) + cost;
    });
    return Object.entries(costsMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeTab, repairs]);

  // Colors for the pie chart
  const COLORS = [
    "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1"
  ];

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "pending":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 pt-0 space-y-4 animate-in fade-in duration-500">

      {/* Tabs */}
      <div className="flex p-0.5 bg-neutral-100 dark:bg-neutral-900 rounded-lg max-w-sm mx-auto">
        <button
          onClick={() => {
            setActiveTab("vendor");
            setStatusFilter("all");
            setSearchTerm("");
          }}
          className={`flex-1 py-3 px-10 text-sm font-medium rounded-md transition-all ${activeTab === "vendor"
            ? "bg-green-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
            }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4" />
            Vendor AMC
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("machine");
            setStatusFilter("all");
            setSearchTerm("");
          }}
          className={`flex-1 py-3 px-10 text-sm font-medium rounded-md transition-all ${activeTab === "machine"
            ? "bg-green-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
            }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Settings2 className="w-4 h-4" />
            Machine AMC
          </span>
        </button>
      </div>

      {/* Conditional Content - Show different based on active tab */}
      {activeTab === "machine" ? (
        <>
          {/* Header Section with Left Header and Right Stats Grid - Machine AMC */}
          <div className="grid grid-cols-1 lg:grid-cols-4 items-start mt-6">
            {/* Left Side - Header */}
            <div className="lg:col-span-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Machine Repairs
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 text-xs mt-1">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Track repair tasks and costs
              </p>
            </div>

            {/* Right Side - Stats Grid */}
            <div className="lg:col-span-3">
              <div className="flex gap-3">
                {/* All-Time Total Cost Card */}
                <div className="flex-1 bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded uppercase">
                      All-Time Total
                    </span>
                  </div>
                  <p className="text-base font-bold truncate">
                    {formatCurrency(totalAllTimeCost)}
                  </p>
                </div>

                {/* Annual Cost Card (Selected Year) */}
                <div className="flex-1 bg-white dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm border-l-2 border-l-purple-500">
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                      <IndianRupee className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40 px-2 py-0.5 rounded uppercase">
                      Annual Cost ({selectedYear})
                    </span>
                  </div>
                  <p className="text-base font-bold truncate">
                    {formatCurrency(stats.totalBillAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Summary Section */}
          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

              {/* Individual Machine Cost Table Card */}
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm h-[340px] flex flex-col">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Costs per Machine
                </h3>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-neutral-800 z-10">
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-neutral-100 dark:border-neutral-700">
                        <th className="pb-2">Machine</th>
                        <th className="pb-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                      {fullMachineCosts.length > 0 ? (
                        fullMachineCosts.map((item, index) => (
                          <tr key={item.name} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{item.name}</span>
                              </div>
                            </td>
                            <td className="py-2 text-right">
                              <span className="text-xs font-bold text-foreground">
                                {formatCurrency(item.value)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-muted-foreground text-xs">
                            No data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pie Chart Card */}
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm h-[340px]">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground uppercase tracking-wider">
                  <PieIcon className="w-4 h-4 text-orange-500" />
                  Machine Distribution
                </h3>
                <div className="h-[260px] w-full">
                  {machineCosts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={machineCosts}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {machineCosts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) => formatCurrency(value || 0)}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            borderRadius: "6px  ",
                            border: "none",
                            fontSize: "11px",
                            boxShadow: "0 2px 4px -1px rgb(0 0 0 / 0.1)"
                          }}
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <BarChart3 className="w-10 h-10 mb-2 opacity-10" />
                      <p className="text-xs">No cost data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area for Machine */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm overflow-hidden mt-6">
            {/* Toolbar */}
            <div className="p-2 border-b border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row justify-between gap-3">

              <div className="flex items-center gap-2 overflow-x-auto pl-1">
                {/* Year Selection Tabs */}
                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-md mr-4">
                  {[2024, 2025, 2026].map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedYear === year
                        ? "bg-white dark:bg-neutral-700 shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>

                <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 mx-2" />

                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap ${statusFilter === "all"
                    ? "bg-orange-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap ${statusFilter === "pending"
                    ? "bg-rose-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                    }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter("completed")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap ${statusFilter === "completed"
                    ? "bg-green-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                    }`}
                >
                  Completed
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search machines..."
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Machine Repair Table */}
            <div className="max-h-[450px] overflow-y-auto relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-neutral-800 z-10 shadow-sm">
                  <tr className="bg-neutral-50/50 dark:bg-neutral-900/30 text-muted-foreground text-xs uppercase tracking-widest font-bold border-b border-neutral-200 dark:border-neutral-700">
                    <th className="px-4 py-3">Machine Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Bill Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading repair data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center text-rose-600 dark:text-rose-400">
                          <AlertCircle className="w-12 h-12 mb-4" />
                          <p className="text-lg font-medium">Error loading data</p>
                          <p className="text-sm">{error}</p>
                        </div>
                      </td>
                    </tr>
                  ) : currentData.length > 0 ? (
                    (currentData as MachineRepair[]).map((item) => (
                      <tr
                        key={item.task_id}
                        className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {item.machine_name || "—"}
                              </p>
                              {item.machine_type && (
                                <p className="text-xs text-muted-foreground">
                                  {item.machine_type}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase border ${getStatusStyle(item.status || "pending")}`}
                          >
                            {item.status || "pending"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {item.bill_amount ? (
                            <span className="text-sm font-bold text-foreground">
                              {formatCurrency(item.bill_amount)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-lg font-medium">No repair records found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="p-2.5 bg-neutral-50/50 dark:bg-neutral-900/10 border-t border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`p-1.5 rounded-lg transition-colors ${currentPage === 1
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${currentPage === pageNum
                            ? "bg-orange-600 text-white"
                            : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span className="text-muted-foreground">...</span>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="w-7 h-7 rounded-lg text-xs font-medium text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-1.5 rounded-lg transition-colors ${currentPage === totalPages
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      }`}
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Simple Message for Vendor AMC */
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 shadow-sm">
          <Building2 className="w-20 h-20 text-muted-foreground mb-4 opacity-30" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Vendor AMC Module</h3>
          <p className="text-muted-foreground text-sm">Coming soon...</p>
        </div>
      )}
    </div>
  );
}