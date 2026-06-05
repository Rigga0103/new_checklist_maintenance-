"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Calendar,
  RefreshCcw,
  User,
  Info,
  Loader2,
  Eye,
  Package,
  DollarSign,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Square
} from "lucide-react";
import supabase from "@/utils/supabaseClient";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export default function CompletedListPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

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
      // Clear selections when data changes
      setSelectedRows(new Set());
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

  const exportToPDF = () => {
    try {
      setIsExporting(true);

      const rowsToExport = selectedRows.size > 0
        ? requests.filter(r => selectedRows.has(r.id))
        : requests;

      if (rowsToExport.length === 0) {
        toast.error("No items selected for export.");
        return;
      }

      const doc = new jsPDF({ orientation: "landscape" });

      // Add title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Purchase History Report", 14, 15);

      // Add subtitle with date range and counts
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const completedCount = rowsToExport.filter(r => r.status === "Completed").length;
      const approvedCount = rowsToExport.filter(r => r.status === "Approved").length;
      doc.text(
        `Exported: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} | Total: ${rowsToExport.length} (Completed: ${completedCount}, Approved: ${approvedCount})`,
        14,
        22
      );

      // Prepare table data
      const tableData = rowsToExport.map((request, index) => [
        index + 1,
        request.item_name || "-",
        request.requested_by || "-",
        request.required_for || "-",
        request.quantity || "-",
        request.rate ? `₹${request.rate.toFixed(2)}` : "-",
        request.amount ? `₹${request.amount.toFixed(2)}` : "-",
        request.vendor_name || "-",
        request.purchase_date ? new Date(request.purchase_date).toLocaleDateString() : "-",
        request.status,
        new Date(request.created_at).toLocaleDateString(),
      ]);

      // Generate table
      autoTable(doc, {
        startY: 28,
        head: [[
          "#", "Item Name", "Requested By", "Required For", "Qty",
          "Rate", "Amount", "Vendor", "Purchase Date", "Status", "Requested Date"
        ]],
        body: tableData,
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
          halign: "center"
        },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 20, halign: "right" },
          6: { cellWidth: 25, halign: "right" },
          7: { cellWidth: 25 },
          8: { cellWidth: 20, halign: "center" },
          9: { cellWidth: 20, halign: "center" },
          10: { cellWidth: 20, halign: "center" },
        },
        styles: {
          overflow: "ellipsize",
          cellPadding: 2,
        },
      });

      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated by Purchase Management System - Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      const label = selectedRows.size > 0 ? `purchase_history_selected_${selectedRows.size}` : "purchase_history_all";
      doc.save(`${label}_${new Date().toISOString().slice(0, 10)}.pdf`);

      toast.success(`Exported ${rowsToExport.length} item(s) to PDF successfully!`);
    } catch (err: any) {
      console.error("Error exporting to PDF:", err);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

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
  const selectedCount = selectedRows.size;

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
              View history of all completed and approved general item purchases with complete details.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-900/50">
              Completed: {completedCount}
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full border border-green-100 dark:border-green-900/50">
              Approved: {approvedCount}
            </div>
            {selectedCount > 0 && (
              <div className="text-xs font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/50">
                {selectedCount} Selected
              </div>
            )}

            <button
              onClick={exportToPDF}
              disabled={isExporting || requests.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-md hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isExporting ? "Exporting..." : selectedCount > 0 ? `Export PDF (${selectedCount} Selected)` : "Export PDF (All)"}
            </button>

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
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Purchase Date</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden xl:table-cell">Requested Date</th>
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
                          <span className={`text-sm font-semibold ${request.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {request.amount ? `₹${request.amount.toFixed(2)}` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">{getStatusBadge(request.status)}</td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {request.purchase_date ? new Date(request.purchase_date).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(request.created_at).toLocaleDateString()}
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
                                <p className={`text-sm font-semibold ${request.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-green-600 dark:text-green-400'}`}>
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
                                  <span className="font-medium">Last Status:</span> {request.status}
                                </p>
                                {request.status === "Completed" && (
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    ✓ Purchase completed successfully
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status Timeline */}
                            <div className="space-y-1 md:col-span-2 lg:col-span-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status Timeline
                              </label>
                              <div className="bg-white dark:bg-zinc-900 p-2 rounded border border-gray-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${request.status === 'Approved' || request.status === 'Completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  <span className="text-xs text-gray-600 dark:text-gray-400">Approved</span>
                                  {request.status === 'Completed' && (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
                                    </>
                                  )}
                                </div>
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