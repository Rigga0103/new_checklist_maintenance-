"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Calendar,
  User,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  DollarSign,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp
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
  quantity: string;
  rate: number;
  vendor_name: string;
  purchase_date: string;
  amount: number;
  attachment: string;
}

export default function ApprovalPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch pending requests
  const fetchPendingRequests = async () => {
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
      console.error("Error fetching pending requests:", err);
      toast.error(err.message || "Failed to load pending approvals.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleAction = async (id: number, newStatus: "Approved" | "Rejected") => {
    try {
      setActioningId(id);

      const { error } = await supabase
        .from("General_Item_Purchase")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Request ${newStatus.toLowerCase()} successfully!`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error(`Error updating request to ${newStatus}:`, err);
      toast.error(err.message || `Failed to update request.`);
    } finally {
      setActioningId(null);
    }
  };

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
      Pending: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", border: "border-amber-100 dark:border-amber-900/30" },
      Approved: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400", border: "border-green-100 dark:border-green-900/30" },
      Rejected: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-400", border: "border-red-100 dark:border-red-900/30" },
      "Pending Purchase": { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400", border: "border-blue-100 dark:border-blue-900/30" },
      Completed: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-900/30" },
    };
    const config = statusConfig[status] || statusConfig.Pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Loading pending requests...
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
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Approval Management</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review, approve, or reject pending item purchase requests with complete details.
            </p>
          </div>
          <div className="text-xs font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/50">
            {requests.length} Requests Pending
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-6 px-6 pb-6">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50/50 dark:bg-zinc-950/20 text-center space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No Pending Approvals</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Hooray! You don't have any purchase requests waiting for your approval at this moment.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1.5 rounded-full shadow-sm">
              <Eye className="w-3.5 h-3.5 text-green-500" />
              <span>Checked: Up to date</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-950/50">
                <tr className="border-b border-gray-200 dark:border-zinc-800">
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-8"></th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Item Name</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Requested By</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Quantity</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Rate</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden xl:table-cell">Total Amount</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Requested Date</th>
                  <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <React.Fragment key={request.id}>
                    <tr
                      className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-950/30 transition-colors cursor-pointer"
                      onClick={() => toggleRowExpansion(request.id)}
                    >
                      <td className="p-3">
                        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                          {expandedRows.has(request.id) ?
                            <ChevronUp className="w-4 h-4" /> :
                            <ChevronDown className="w-4 h-4" />
                          }
                        </button>
                      </td>
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
                        <div className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {request.quantity || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1">

                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {request.rate ? `₹${request.rate.toFixed(2)}` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        <div className="flex items-center gap-1">

                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {request.amount ? `₹${request.amount.toFixed(2)}` : '-'}
                          </span>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(request.id, "Rejected");
                            }}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-300 h-8 px-2 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Reject</span>
                          </button>
                          <button
                            disabled={actioningId !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(request.id, "Approved");
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Approve</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row with Additional Details */}
                    {expandedRows.has(request.id) && (
                      <tr className="bg-gray-50/50 dark:bg-zinc-950/20">
                        <td colSpan={9} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Required For */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Required For
                              </label>
                              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800">
                                {request.required_for}
                              </p>
                            </div>

                            {/* Vendor Name */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                Vendor Name
                              </label>
                              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800">
                                {request.vendor_name || '-'}
                              </p>
                            </div>

                            {/* Purchase Date */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Purchase Date
                              </label>
                              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800">
                                {request.purchase_date ? new Date(request.purchase_date).toLocaleDateString() : '-'}
                              </p>
                            </div>

                            {/* Quantity Details */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Quantity Details
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">Quantity:</span> {request.quantity || '-'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Rate/Unit:</span> {request.rate ? `₹${request.rate.toFixed(2)}` : '-'}
                                </p>
                                <p className="text-sm font-semibold">
                                  <span className="font-medium">Total Amount:</span> {request.amount ? `₹${request.amount.toFixed(2)}` : '-'}
                                </p>
                              </div>
                            </div>

                            {/* Attachment */}
                            <div className="space-y-1 md:col-span-2 lg:col-span-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Attachment
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800">
                                {request.attachment ? (
                                  <div className="space-y-2">
                                    <a
                                      href={request.attachment}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FileText className="w-4 h-4" />
                                      View Attachment
                                    </a>
                                    {request.attachment.match(/\.(jpg|jpeg|png|gif)$/i) && (
                                      <div className="mt-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={request.attachment}
                                          alt="Attachment preview"
                                          className="max-h-32 rounded border"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">No attachment</p>
                                )}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Request Metadata
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800 space-y-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Request ID:</span> #{request.id}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Created:</span> {new Date(request.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}