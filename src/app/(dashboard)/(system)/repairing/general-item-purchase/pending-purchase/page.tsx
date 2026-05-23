"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  ShoppingBag,
  Calendar,
  User,
  ShoppingCart,
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

export default function PendingPurchasePage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  // Fetch approved requests (ready for purchase)
  const fetchApprovedRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("General_Item_Purchase")
        .select("*")
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Error fetching approved requests:", err);
      toast.error(err.message || "Failed to load pending purchases.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedRequests();
  }, []);

  const handleComplete = async (id: number) => {
    try {
      setActioningId(id);

      const { error } = await supabase
        .from("General_Item_Purchase")
        .update({ status: "Completed" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Purchase marked as completed successfully!");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error("Error completing purchase:", err);
      toast.error(err.message || "Failed to complete purchase.");
    } finally {
      setActioningId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
      Approved: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400", border: "border-green-100 dark:border-green-900/30" },
    };
    const config = statusConfig[status] || statusConfig.Approved;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Loading approved requests...
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900/50 overflow-hidden rounded-lg">
      {/* Header */}
      <div className="pb-3 border-b border-gray-100 dark:border-zinc-800/80 px-6 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pending Purchase List</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track approved requests that are ready for procurement.
            </p>
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900/50">
            {requests.length} Approved & Ready
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-6 px-6 pb-6">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50/50 dark:bg-zinc-950/20 text-center space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Pending Purchases</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All approved requests have been fully processed. Check back later when new item requests get approved.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1.5 rounded-full shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Updated: Just now</span>
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
                  <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
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
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={actioningId !== null}
                          onClick={() => handleComplete(request.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span className="hidden sm:inline text-sm">Complete Purchase</span>
                        </button>
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