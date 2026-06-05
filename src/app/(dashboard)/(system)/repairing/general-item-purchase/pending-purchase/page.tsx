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
  Download,
  CheckSquare,
  Square,
  X,
  Upload
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

interface CompletionFormData {
  vendor_name: string;
  rate: string;
  purchase_date: string;
  amount: string;
  attachment: File | null;
  attachmentPreview: string | null;
}

export default function PendingPurchasePage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Popup state
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [completionData, setCompletionData] = useState<CompletionFormData>({
    vendor_name: "",
    rate: "",
    purchase_date: "",
    amount: "",
    attachment: null,
    attachmentPreview: null
  });

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

  const openCompletionPopup = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setCompletionData({
      vendor_name: request.vendor_name || "",
      rate: request.rate?.toString() || "",
      purchase_date: request.purchase_date || "",
      amount: request.amount?.toString() || "",
      attachment: null,
      attachmentPreview: request.attachment || null
    });
    setShowCompletionPopup(true);
  };

  const handleCompletionFieldChange = (field: keyof CompletionFormData, value: any) => {
    setCompletionData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate amount if quantity and rate are present
      if ((field === 'rate') && selectedRequest?.quantity && value) {
        const qty = parseFloat(selectedRequest.quantity);
        const rte = parseFloat(value);
        if (!isNaN(qty) && !isNaN(rte)) {
          updated.amount = (qty * rte).toFixed(2);
        }
      }

      return updated;
    });
  };

  const handleFileUpload = (file: File | null) => {
    if (file) {
      // Only create preview for display, don't store this URL in database
      const previewUrl = URL.createObjectURL(file);
      handleCompletionFieldChange("attachment", file);
      handleCompletionFieldChange("attachmentPreview", previewUrl);
    } else {
      if (completionData.attachmentPreview && completionData.attachmentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(completionData.attachmentPreview);
      }
      handleCompletionFieldChange("attachment", null);
      handleCompletionFieldChange("attachmentPreview", null);
    }
  };

  // Add this function to upload file to Supabase Storage
  const uploadAttachment = async (file: File, itemName: string): Promise<string | null> => {
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${itemName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
      const filePath = `purchase_attachments/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('purchase-documents') // Make sure this bucket exists
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('purchase-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleCompleteWithDetails = async () => {
    if (!selectedRequest) return;

    // Validate required fields
    if (!completionData.vendor_name.trim()) {
      toast.error("Please enter vendor name.");
      return;
    }
    if (!completionData.purchase_date) {
      toast.error("Please select purchase date.");
      return;
    }

    try {
      setActioningId(selectedRequest.id);
      toast.loading("Uploading attachment and updating purchase details...");

      let attachmentUrl = null;

      // Upload new attachment if provided
      if (completionData.attachment && completionData.attachment instanceof File) {
        const uploadedUrl = await uploadAttachment(completionData.attachment, selectedRequest.item_name);
        if (uploadedUrl) {
          attachmentUrl = uploadedUrl;
          toast.loading("Attachment uploaded successfully!");
        } else {
          toast.warning("Could not upload attachment, but continuing with other details...");
        }
      }

      // Calculate amount if not provided
      let finalAmount = completionData.amount;
      if (!finalAmount && selectedRequest.quantity && completionData.rate) {
        finalAmount = (parseFloat(selectedRequest.quantity) * parseFloat(completionData.rate)).toFixed(2);
      }

      // Prepare update data
      const updateData: any = {
        vendor_name: completionData.vendor_name.trim(),
        rate: completionData.rate ? parseFloat(completionData.rate) : null,
        purchase_date: completionData.purchase_date,
        amount: finalAmount ? parseFloat(finalAmount) : null,
        status: "Completed"
      };

      // Only include attachment if we have a URL
      if (attachmentUrl) {
        updateData.attachment = attachmentUrl;
      }

      const { error } = await supabase
        .from("General_Item_Purchase")
        .update(updateData)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.dismiss();
      toast.success("Purchase completed successfully with all details!");

      // Close popup and refresh list
      setShowCompletionPopup(false);
      setSelectedRequest(null);
      setCompletionData({
        vendor_name: "",
        rate: "",
        purchase_date: "",
        amount: "",
        attachment: null,
        attachmentPreview: null
      });

      await fetchApprovedRequests();

    } catch (err: any) {
      console.error("Error completing purchase:", err);
      toast.dismiss();
      toast.error(err.message || "Failed to complete purchase.");
    } finally {
      setActioningId(null);
    }
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

      doc.setFontSize(14);
      doc.text("Pending Purchases List", 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Exported: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}  |  Total: ${rowsToExport.length} request(s)`,
        14,
        21
      );

      autoTable(doc, {
        startY: 26,
        head: [["#", "Item Name", "Requested By", "Required For", "Qty", "Rate (₹)", "Amount (₹)", "Status", "Requested Date"]],
        body: rowsToExport.map((v, i) => [
          i + 1,
          v.item_name || "-",
          v.requested_by || "-",
          v.required_for || "-",
          v.quantity || "-",
          v.rate ? `₹${v.rate.toFixed(2)}` : "-",
          v.amount ? `₹${v.amount.toFixed(2)}` : "-",
          v.status || "-",
          v.created_at ? new Date(v.created_at).toLocaleDateString() : "-",
        ]),
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        margin: { left: 14, right: 14 },
      });

      const label = selectedRows.size > 0 ? `pending_purchases_selected_${selectedRows.size}` : "pending_purchases_all";
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

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (completionData.attachmentPreview && completionData.attachmentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(completionData.attachmentPreview);
      }
    };
  }, [completionData.attachmentPreview]);

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
    <>
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
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Item Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Requested By</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Quantity</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Requested Date</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-950/30 transition-colors">
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
                              openCompletionPopup(request);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Complete</span>
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

      {/* Completion Popup Modal */}
      {showCompletionPopup && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Complete Purchase
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Item: {selectedRequest.item_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCompletionPopup(false);
                  if (completionData.attachmentPreview && completionData.attachmentPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(completionData.attachmentPreview);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Quantity Display (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Quantity *
                </label>
                <input
                  type="text"
                  value={selectedRequest.quantity || ''}
                  disabled
                  className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 rounded-md cursor-not-allowed"
                />
              </div>

              {/* Vendor Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={completionData.vendor_name}
                  onChange={(e) => handleCompletionFieldChange("vendor_name", e.target.value)}
                  placeholder="Enter vendor name"
                  required
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-foreground border border-gray-200 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                />
              </div>

              {/* Rate and Purchase Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    Rate (per unit) ₹
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={completionData.rate}
                    onChange={(e) => handleCompletionFieldChange("rate", e.target.value)}
                    placeholder="Enter rate"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-foreground border border-gray-200 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={completionData.purchase_date}
                    onChange={(e) => handleCompletionFieldChange("purchase_date", e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-foreground border border-gray-200 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Total Amount ₹
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={completionData.amount}
                  onChange={(e) => handleCompletionFieldChange("amount", e.target.value)}
                  placeholder="Auto-calculated from quantity × rate"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-foreground border border-gray-200 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                />
                {selectedRequest.quantity && completionData.rate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Auto-calculated: ₹{(parseFloat(selectedRequest.quantity) * parseFloat(completionData.rate)).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Attachment Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Attachment (Invoice/Bill)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file size (e.g., 5MB limit)
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("File size should be less than 5MB");
                          return;
                        }
                        handleFileUpload(file);
                      }
                    }}
                    className="text-sm text-gray-500 dark:text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-950/20 dark:file:text-amber-400"
                  />
                  {(completionData.attachmentPreview || selectedRequest?.attachment) && (
                    <button
                      type="button"
                      onClick={() => handleFileUpload(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Show preview */}
                {(completionData.attachmentPreview || selectedRequest?.attachment) && (
                  <div className="mt-3">
                    {completionData.attachment?.type?.startsWith('image/') ||
                      (completionData.attachmentPreview && completionData.attachmentPreview.match(/\.(jpg|jpeg|png|gif)$/i)) ||
                      (selectedRequest?.attachment && selectedRequest.attachment.match(/\.(jpg|jpeg|png|gif)$/i)) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={completionData.attachmentPreview || selectedRequest?.attachment}
                        alt="Preview"
                        className="max-h-32 rounded-md border"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <a
                          href={completionData.attachmentPreview || selectedRequest?.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {completionData.attachment?.name || 'View existing attachment'}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCompletionPopup(false);
                  if (completionData.attachmentPreview && completionData.attachmentPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(completionData.attachmentPreview);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteWithDetails}
                disabled={actioningId !== null}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actioningId === selectedRequest.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                Complete Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}