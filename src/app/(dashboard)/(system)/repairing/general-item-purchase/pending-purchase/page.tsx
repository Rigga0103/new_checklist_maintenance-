"use client";


import React, { useState, useEffect } from "react";
import {
  Clock,
  ShoppingBag,
  Calendar,
  User,
  ShoppingCart,
  Loader2,
  Eye,
  Package,
  DollarSign,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  CheckSquare,
  Square
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

export default function PendingPurchasePage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Fetch approved requests (ready for purchase)
  const fetchApprovedRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("General_Item_Purchase")
        .select("*")
        .eq("status", "Approved")
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
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err: any) {
      console.error("Error completing purchase:", err);
      toast.error(err.message || "Failed to complete purchase.");
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

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === requests.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(requests.map(r => r.id)));
    }
  };

  const exportToCSV = () => {
    try {
      setIsExporting(true);

      // Determine which rows to export
      const rowsToExport = selectedRows.size > 0
        ? requests.filter(r => selectedRows.has(r.id))
        : requests;

      if (rowsToExport.length === 0) {
        toast.error("No items selected for export.");
        return;
      }

      // Prepare CSV headers
      const headers = [
        "ID",
        "Item Name",
        "Requested By",
        "Required For",
        "Quantity",
        "Rate (₹)",
        "Total Amount (₹)",
        "Vendor Name",
        "Purchase Date",
        "Status",
        "Requested Date",
        "Attachment URL"
      ];

      // Prepare CSV rows
      const csvRows = rowsToExport.map(request => [
        request.id,
        `"${request.item_name.replace(/"/g, '""')}"`, // Escape quotes
        `"${request.requested_by.replace(/"/g, '""')}"`,
        `"${request.required_for.replace(/"/g, '""')}"`,
        request.quantity || "",
        request.rate ? request.rate.toFixed(2) : "",
        request.amount ? request.amount.toFixed(2) : "",
        `"${(request.vendor_name || "").replace(/"/g, '""')}"`,
        request.purchase_date ? new Date(request.purchase_date).toLocaleDateString() : "",
        request.status,
        new Date(request.created_at).toLocaleString(),
        request.attachment || ""
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...csvRows.map(row => row.join(","))
      ].join("\n");

      // Add BOM for UTF-8 encoding to handle special characters
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

      // Create download link
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `pending_purchases_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${rowsToExport.length} item(s) to CSV successfully!`);
    } catch (err: any) {
      console.error("Error exporting to CSV:", err);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
      Approved: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400", border: "border-green-100 dark:border-green-900/30" },
      Completed: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-100 dark:border-emerald-900/30" },
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

  const selectedCount = selectedRows.size;

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
              Track approved requests that are ready for procurement with complete purchase details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900/50">
              {requests.length} Approved & Ready
            </div>
            {selectedCount > 0 && (
              <div className="text-xs font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/50">
                {selectedCount} Selected
              </div>
            )}
            <button
              onClick={exportToCSV}
              disabled={isExporting || requests.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-md hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isExporting ? "Exporting..." : selectedCount > 0 ? `Export ${selectedCount} Selected` : "Export All"}
            </button>
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
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-8">
                    <button
                      onClick={toggleAllSelection}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      {selectedRows.size === requests.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-8"></th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Item Name</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Requested By</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Quantity</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Vendor</th>
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
                      className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-950/30 transition-colors"
                    >
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowSelection(request.id);
                          }}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        >
                          {selectedRows.has(request.id) ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleRowExpansion(request.id)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        >
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
                          <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]" title={request.vendor_name}>
                            {request.vendor_name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
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
                              handleComplete(request.id);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Complete</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row with Additional Details */}
                    {expandedRows.has(request.id) && (
                      <tr className="bg-gray-50/50 dark:bg-zinc-950/20">
                        <td colSpan={10} className="p-4">
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

                            {/* Vendor Details */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                Vendor Information
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">Vendor Name:</span> {request.vendor_name || '-'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Purchase Date:</span> {request.purchase_date ? new Date(request.purchase_date).toLocaleDateString() : '-'}
                                </p>
                              </div>
                            </div>

                            {/* Purchase Details */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Purchase Details
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800 space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium">Quantity:</span> {request.quantity || '-'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Rate/Unit:</span> {request.rate ? `₹${request.rate.toFixed(2)}` : '-'}
                                </p>
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                  <span className="font-medium">Total Amount:</span> {request.amount ? `₹${request.amount.toFixed(2)}` : '-'}
                                </p>
                              </div>
                            </div>

                            {/* Attachment */}
                            <div className="space-y-1 md:col-span-2 lg:col-span-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Invoice / Bill Attachment
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
                                          alt="Invoice preview"
                                          className="max-h-32 rounded border"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">No attachment uploaded</p>
                                )}
                              </div>
                            </div>

                            {/* Request Metadata */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Request Metadata
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800 space-y-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Request ID:</span> #{request.id}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Requested Date:</span> {new Date(request.created_at).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Status:</span> {request.status}
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons in Expanded View */}
                            <div className="space-y-1 md:col-span-2 lg:col-span-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Quick Actions
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800">
                                <button
                                  disabled={actioningId !== null}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleComplete(request.id);
                                  }}
                                  className="w-full bg-amber-500 hover:bg-amber-600 text-white h-9 px-3 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actioningId === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <ShoppingCart className="w-4 h-4" />
                                  )}
                                  <span>Mark as Completed</span>
                                </button>
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