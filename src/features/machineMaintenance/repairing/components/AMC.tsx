
"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Trash2,
  Edit2,
  FileText,
  AlertTriangle,

  IndianRupee,
  ChevronRight,
  ExternalLink,
  Settings2
} from "lucide-react";

// Mock data for AMC (Annual Maintenance Contract)
// Added 'category' field to distinguish between Vendor and Machine AMC
const mockAMCData = [
  {
    id: 1,
    machine_name: "Excavator CAT-320",
    machine_type: "Heavy Machinery",
    vendor_name: "Caterpillar India",
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    amount: 150000,
    status: "Active",
    visits_done: 2,
    total_visits: 4,
    priority: "High",
    category: "machine",
  },
  {
    id: 2,
    machine_name: "Dump Truck DT-45",
    machine_type: "Vehicle",
    vendor_name: "Tata Motors",
    start_date: "2023-06-15",
    end_date: "2024-06-14",
    amount: 85000,
    status: "Expiring Soon",
    visits_done: 3,
    total_visits: 3,
    priority: "Medium",
    category: "machine",
  },
  {
    id: 3,
    machine_name: "Generator G-100",
    machine_type: "Power",
    vendor_name: "Kirloskar Oil Engines",
    start_date: "2023-01-01",
    end_date: "2023-12-31",
    amount: 45000,
    status: "Expired",
    visits_done: 4,
    total_visits: 4,
    priority: "Low",
    category: "vendor", // Vendor AMC
  },
  {
    id: 4,
    machine_name: "Forklift FL-12",
    machine_type: "Logistics",
    vendor_name: "Godrej Material Handling",
    start_date: "2024-03-01",
    end_date: "2025-02-28",
    amount: 62000,
    status: "Active",
    visits_done: 0,
    total_visits: 2,
    priority: "High",
    category: "machine",
  },
  {
    id: 5,
    machine_name: "HVAC System",
    machine_type: "Facility",
    vendor_name: "Blue Star Ltd",
    start_date: "2024-02-01",
    end_date: "2025-01-31",
    amount: 120000,
    status: "Active",
    visits_done: 1,
    total_visits: 4,
    priority: "Medium",
    category: "vendor", // Vendor AMC
  },
];

export default function AMC() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"vendor" | "machine">("machine");

  const filteredData = useMemo(() => {
    return mockAMCData.filter((item) => {
      const matchesSearch =
        item.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        item.status.toLowerCase() === statusFilter.toLowerCase();

      // Filter based on active tab
      const matchesTab = item.category === activeTab;

      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [searchTerm, statusFilter, activeTab]);

  // Calculate stats based on the active tab data
  const stats = useMemo(() => {
    const tabData = mockAMCData.filter((x) => x.category === activeTab);
    const total = tabData.length;
    const active = tabData.filter((x) => x.status === "Active").length;
    const expiring = tabData.filter(
      (x) => x.status === "Expiring Soon",
    ).length;
    const expired = tabData.filter((x) => x.status === "Expired").length;
    const totalValue = tabData.reduce((sum, x) => sum + x.amount, 0);

    return { total, active, expiring, expired, totalValue };
  }, [activeTab]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "Expiring Soon":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "Expired":
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
    <div className="p-2 space-y-2 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Demo AMC data
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Track Annual Maintenance Contracts and vendor commitments
          </p>
        </div>

      </div>

      {/* Full Width Tabs */}
      {/* Full Width Tabs */}
      <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl mb-10">
        <button
          onClick={() => {
            setActiveTab("vendor");
            setStatusFilter("all"); // Reset filter on tab switch
            setSearchTerm("");
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all relative overflow-hidden ${activeTab === "vendor"
            ? "bg-green-600 text-white shadow-md shadow-green-600/20"
            : "text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
            }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4" />
            Vendor AMC
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("machine");
            setStatusFilter("all"); // Reset filter on tab switch
            setSearchTerm("");
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all relative overflow-hidden ${activeTab === "machine"
            ? "bg-green-600 text-white shadow-md shadow-green-600/20"
            : "text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"
            }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Settings2 className="w-4 h-4" />
            Machine AMC
          </span>
        </button>
      </div>



      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-xs group hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-1 rounded-lg">
              Total
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Contracts</p>
          <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-xs group hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/40 px-2 py-1 rounded-lg">
              Active
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Running</p>
          <h3 className="text-3xl font-bold mt-1">{stats.active}</h3>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-xs group hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2 py-1 rounded-lg">
              Warning
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Expiring</p>
          <h3 className="text-3xl font-bold mt-1">{stats.expiring}</h3>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-xs group hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <IndianRupee className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40 px-2 py-1 rounded-lg">
              Value
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
          <h3 className="text-3xl font-bold mt-1">
            {formatCurrency(stats.totalValue)}
          </h3>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-700 flex flex-col sm:row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search machine or vendor..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${statusFilter === "all" ? "bg-orange-600 text-white shadow-md shadow-orange-500/20" : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("Active")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${statusFilter === "Active" ? "bg-green-600 text-white shadow-md shadow-green-500/20" : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("Expiring Soon")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${statusFilter === "Expiring Soon" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"}`}
            >
              Expiring
            </button>
            <button
              onClick={() => setStatusFilter("Expired")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${statusFilter === "Expired" ? "bg-rose-600 text-white shadow-md shadow-rose-500/20" : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"}`}
            >
              Expired
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-900/30 text-muted-foreground text-xs uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Machine & Type</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Validity</th>
                <th className="px-6 py-4">Contract Value</th>
                <th className="px-6 py-4">Visits</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg group-hover:bg-white dark:group-hover:bg-neutral-600 transition-colors">
                          <Settings2 className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {item.machine_name}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5 tracking-wider">
                            {item.machine_type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {item.vendor_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{item.start_date}</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                          <span>{item.end_date}</span>
                        </div>
                        {item.status === "Expiring Soon" && (
                          <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Renewal Required
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-20 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{
                              width: `${(item.visits_done / item.total_visits) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                          {item.visits_done}/{item.total_visits}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg text-muted-foreground hover:text-blue-600 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg text-muted-foreground hover:text-orange-600 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg text-muted-foreground hover:text-rose-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">No results found</p>
                      <p className="text-sm">Try adjusting your filters or switch tabs</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-neutral-50/50 dark:bg-neutral-900/10 border-t border-neutral-100 dark:border-neutral-700 flex flex-col sm:row items-center justify-between gap-4 text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
          <p>Showing {filteredData.length} records</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Active Contracts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>Near Expiry</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}