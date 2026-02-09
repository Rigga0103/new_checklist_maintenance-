"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  IndianRupee,
} from "lucide-react";
import { fetchAllRepairs } from "../server/api/repairingApi";
import type { MachineRepair } from "../../types/types";

export default function MainRepairingDashboard() {
  const [repairs, setRepairs] = useState<MachineRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllRepairs();
      setRepairs(data);
    } catch (error) {
      console.error("Error loading repairs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate stats
  const totalRepairs = repairs.length;
  const pendingRepairs = repairs.filter((r) => r.status === "pending").length;
  const inProgressRepairs = repairs.filter(
    (r) => r.status === "in_progress",
  ).length;
  const completedRepairs = repairs.filter(
    (r) => r.status === "completed",
  ).length;
  const totalCost = repairs.reduce((sum, r) => sum + (r.bill_amount || 0), 0);

  // Get repairs from this month
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyRepairs = repairs.filter((r) => {
    const date = new Date(r.created_at);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });
  const monthlyCost = monthlyRepairs.reduce(
    (sum, r) => sum + (r.bill_amount || 0),
    0,
  );

  // Get top machines by repair count
  const machineRepairCount = repairs.reduce(
    (acc, r) => {
      if (r.machine_name) {
        acc[r.machine_name] = (acc[r.machine_name] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const topMachines = Object.entries(machineRepairCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Recent repairs
  const recentRepairs = repairs.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            {status || "Unknown"}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Repairing Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of machine repair activities
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Repairs</p>
              <p className="text-2xl font-bold text-foreground">
                {totalRepairs}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">
                {pendingRepairs}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-foreground">
                {completedRepairs}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <IndianRupee className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(monthlyCost)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Machines by Repairs */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Top Machines by Repairs
            </h2>
          </div>
          {topMachines.length > 0 ? (
            <div className="space-y-3">
              {topMachines.map(([machine, count], index) => (
                <div
                  key={machine}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-neutral-100 dark:bg-neutral-700 rounded-full">
                      {index + 1}
                    </span>
                    <span className="text-sm text-foreground">{machine}</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                    {count} repairs
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No repair data available
            </p>
          )}
        </div>

        {/* Recent Repairs */}
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Recent Repairs
            </h2>
          </div>
          {recentRepairs.length > 0 ? (
            <div className="space-y-3">
              {recentRepairs.map((repair) => (
                <div
                  key={repair.task_id}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {repair.machine_name || "Unknown Machine"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {repair.issue_detail || "No issue details"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(repair.created_at)}
                    </p>
                  </div>
                  <div className="ml-4">{getStatusBadge(repair.status)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent repairs</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-linear-to-r from-blue-500 to-blue-600 rounded-xl text-white">
          <p className="text-sm opacity-90">In Progress</p>
          <p className="text-3xl font-bold">{inProgressRepairs}</p>
          <p className="text-xs opacity-75 mt-1">Currently being worked on</p>
        </div>

        <div className="p-4 bg-linear-to-r from-green-500 to-green-600 rounded-xl text-white">
          <p className="text-sm opacity-90">Total Cost (All Time)</p>
          <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
          <p className="text-xs opacity-75 mt-1">Repair expenses</p>
        </div>

        <div className="p-4 bg-linear-to-r from-purple-500 to-purple-600 rounded-xl text-white">
          <p className="text-sm opacity-90">This Month</p>
          <p className="text-3xl font-bold">{monthlyRepairs.length}</p>
          <p className="text-xs opacity-75 mt-1">Repairs processed</p>
        </div>
      </div>
    </div>
  );
}
