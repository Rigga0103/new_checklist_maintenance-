"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  X,
  Upload,
  Save,
} from "lucide-react";
import Image from "next/image";
import {
  usePendingRepairsQuery,
  useProcessRepairMutation,
} from "../server/tanstackQuery/useRepairingQueries";
import type { MachineRepair, RepairProcessFormData } from "../../types/types";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";

// Predefined Work Done options (English / Hindi)
const WORK_DONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Cleaning", label: "Cleaning / सफाई" },
  { value: "Lubrication", label: "Lubrication / ग्रीसिंग" },
  { value: "Motor Replacement", label: "Motor Replacement / मोटर बदली" },
  { value: "Welding", label: "Welding / वेल्डिंग" },
  {
    value: "Electrical Wiring",
    label: "Electrical Wiring / इलेक्ट्रिकल वायरिंग",
  },
  { value: "PCB Repair", label: "PCB Repair / पीसीबी रिपेयर" },
  { value: "Fuse Change", label: "Fuse Change / फ्यूज बदला" },
  { value: "Bearing Replacement", label: "Bearing Replacement / बेयरिंग बदली" },
  { value: "Alignment", label: "Alignment / एलाइनमेंट" },
  { value: "Inspection", label: "Inspection / निरीक्षण" },
];

export default function MainRepairingPending() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRepair, setSelectedRepair] = useState<MachineRepair | null>(
    null,
  );

  const limit = 20;

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  const { data, isLoading } = usePendingRepairsQuery(
    page,
    limit,
    searchTerm,
    role,
    username,
  );

  const { canRead, canEdit, isLoading: isRbacLoading } = useRBAC("repairing");

  const repairs = data?.data || [];
  const totalCount = data?.totalCount || 0;

  const processMutation = useProcessRepairMutation();
  const isProcessing = processMutation.isPending;

  // Process form state
  const [processForm, setProcessForm] = useState<RepairProcessFormData>({
    partReplaced: "",
    workDone: "",
    status: "in_progress",
    vendorName: "",
    billAmount: undefined,
    remarks: "",
    warranty: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1);
  };

  const openProcessModal = (repair: MachineRepair) => {
    setSelectedRepair(repair);
    setProcessForm({
      partReplaced: repair.part_replaced || "",
      workDone: repair.work_done || "",
      status: repair.status || "in_progress",
      vendorName: repair.vendor_name || "",
      billAmount: repair.bill_amount || undefined,
      remarks: repair.remarks || "",
      warranty: repair.warranty || "",
    });
    setPhotoFile(null);
    setBillFile(null);
    setPhotoPreview(repair.photo_url || null);
  };

  const closeProcessModal = () => {
    setSelectedRepair(null);
    setPhotoFile(null);
    setBillFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBillFile(file);
    }
  };

  const handleProcessSubmit = async () => {
    if (!selectedRepair) return;

    try {
      await processMutation.mutateAsync({
        taskId: selectedRepair.task_id,
        data: processForm,
        photoFile: photoFile || undefined,
        billFile: billFile || undefined,
      });

      toast.success("Repair processed successfully");
      closeProcessModal();
    } catch (error) {
      console.error("Error processing repair:", error);
      toast.error("Failed to process repair");
    }
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
      case "cancelled":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Cancelled
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

  const totalPages = Math.ceil(totalCount / limit);

  if (isLoading || isRbacLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Access Denied. You do not have permission to view Pending Repairs.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Pending Repairs
          </h1>
          <p className="text-muted-foreground">
            Process and manage repair requests
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by machine, issue, or person..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No pending repairs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Machine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Issue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Requested By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {repairs.map((repair) => (
                  <tr
                    key={repair.task_id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      #{repair.task_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.machine_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                      {repair.issue_detail || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.form_filled_by || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.assigned_to || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {repair.vendor_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(repair.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(repair.status)}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button
                          onClick={() => openProcessModal(repair)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Process
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Process Modal */}
      {selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-foreground">
                Process Repair #{selectedRepair.task_id}
              </h2>
              <button
                onClick={closeProcessModal}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Read-only info */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg space-y-2">
                <p>
                  <span className="text-muted-foreground">Machine:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepair.machine_name}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Issue:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepair.issue_detail}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Requested by:</span>{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepair.form_filled_by}
                  </span>
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Status
                </label>
                <select
                  value={processForm.status}
                  onChange={(e) =>
                    setProcessForm((prev) => ({
                      ...prev,
                      status: e.target.value as RepairProcessFormData["status"],
                    }))
                  }
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancel</option>
                </select>
              </div>

              {/* In Progress: Remarks only */}
              {processForm.status === "in_progress" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Remarks
                  </label>
                  <textarea
                    value={processForm.remarks}
                    onChange={(e) =>
                      setProcessForm((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground resize-none"
                  />
                </div>
              )}

              {/* Completed: All fields */}
              {processForm.status === "completed" && (
                <>
                  {/* Part Replaced */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Part Replaced
                      </label>
                      <input
                        type="text"
                        value={processForm.partReplaced}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            partReplaced: e.target.value,
                          }))
                        }
                        placeholder="e.g., Motor, Belt, Bearing"
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>

                    {/* Warranty */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Warranty Details
                      </label>
                      <input
                        type="text"
                        value={processForm.warranty || ""}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            warranty: e.target.value,
                          }))
                        }
                        placeholder="e.g., 1 Year, 6 Months"
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>
                  </div>

                  {/* Work Done */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Work Done
                    </label>
                    <select
                      value={
                        WORK_DONE_OPTIONS.some(
                          (opt) => opt.value === processForm.workDone,
                        )
                          ? processForm.workDone
                          : "other"
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setProcessForm((prev) => ({
                          ...prev,
                          workDone: val === "other" ? prev.workDone : val,
                        }));
                      }}
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                    >
                      <option value="">Select work done...</option>
                      {WORK_DONE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                    {!WORK_DONE_OPTIONS.some(
                      (opt) => opt.value === processForm.workDone,
                    ) && (
                      <input
                        type="text"
                        value={processForm.workDone}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            workDone: e.target.value,
                          }))
                        }
                        placeholder="Describe the work performed..."
                        className="mt-2 w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    )}
                  </div>

                  {/* Vendor & Cost */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Vendor Name
                      </label>
                      <input
                        type="text"
                        value={processForm.vendorName}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            vendorName: e.target.value,
                          }))
                        }
                        placeholder="Vendor name"
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Bill Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={processForm.billAmount || ""}
                        onChange={(e) =>
                          setProcessForm((prev) => ({
                            ...prev,
                            billAmount: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground"
                      />
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Work Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                      {photoPreview && (
                        <div className="relative w-16 h-16">
                          <Image
                            src={photoPreview}
                            alt="Preview"
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bill Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Bill Copy
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg cursor-pointer transition-colors w-fit">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {billFile ? billFile.name : "Upload Bill"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleBillChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Remarks (completed) */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Remarks
                    </label>
                    <textarea
                      value={processForm.remarks}
                      onChange={(e) =>
                        setProcessForm((prev) => ({
                          ...prev,
                          remarks: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Additional notes..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-foreground resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
              <button
                onClick={closeProcessModal}
                className="px-4 py-2 text-sm font-medium text-foreground bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessSubmit}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
