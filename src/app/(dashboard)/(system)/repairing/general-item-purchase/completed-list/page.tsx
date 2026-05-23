"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Calendar,
  RefreshCcw,
  User,
  Info,
  Loader2,
  Eye
} from "lucide-react";
import supabase from "@/utils/supabaseClient";
import { toast } from "sonner";

interface PurchaseRequest {
  id: number;
  item_name: string;
  requested_by: string;
  required_for: string;
  status: string;
  created_at: string;
}

export default function CompletedListPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch both completed and approved purchases
  const fetchCompletedAndApprovedRequests = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const { data, error } = await supabase
        .from("General_Item_Purchase")
        .select("*")
        .in("status", ["Completed", "Approved"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      toast.error(err.message || "Failed to load purchase history.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompletedAndApprovedRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
      Completed: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-900/30" },
      Approved: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400", border: "border-green-100 dark:border-green-900/30" },
    };
    const config = statusConfig[status] || statusConfig.Completed;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Loading purchase history...
        </p>
      </div>
    );
  }

  const completedCount = requests.filter(r => r.status === "Completed").length;
  const approvedCount = requests.filter(r => r.status === "Approved").length;

  return (
    <div className="border border-gray-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900/50 overflow-hidden rounded-lg">
      {/* Header */}
      <div className="pb-3 border-b border-gray-100 dark:border-zinc-800/80 px-6 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Completed & Approved Purchases</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View history of all completed and approved general item purchases.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-900/50">
              Completed: {completedCount}
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full border border-green-100 dark:border-green-900/50">
              Approved: {approvedCount}
            </div>
            <button
              onClick={() => fetchCompletedAndApprovedRequests(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-6 px-6 pb-6">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50/50 dark:bg-zinc-950/20 text-center space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full">
              <CheckSquare className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Records Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No completed or approved purchases found in the system.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1.5 rounded-full shadow-sm">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Archiving: Enabled</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-950/50">
                <tr className="border-b border-gray-200 dark:border-zinc-800">
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Item Name</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Requested By</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Required For</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Requested Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-950/30 transition-colors"
                  >
                    <td className="p-3 font-medium">
                      <div className="max-w-[200px] truncate text-gray-900 dark:text-gray-100" title={request.item_name}>
                        {request.item_name}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{request.requested_by}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="max-w-[200px] truncate text-sm text-gray-500 dark:text-gray-400" title={request.required_for}>
                        {request.required_for}
                      </div>
                    </td>
                    <td className="p-3">{getStatusBadge(request.status)}</td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}