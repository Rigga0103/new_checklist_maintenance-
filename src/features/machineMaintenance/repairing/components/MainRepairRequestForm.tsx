"use client";

import { useState, useEffect } from "react";
import { useRepairRequestForm } from "../hooks/useRepairRequestForm";
import { Loader2, Send, X, Wrench, QrCode, ChevronDown } from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";

const inputClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const selectClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const labelClass =
  "block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1";

export default function MainRepairRequestForm({
  isPublic = false,
}: {
  isPublic?: boolean;
}) {
  const [showQR, setShowQR] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/public/repair-request`);
    }
  }, []);
  const {
    formData,
    requestByUsers,
    assignToUsers,
    machineTypes,
    filteredMachines,
    partsData,
    isLoading,
    isSubmitting,
    handleChange,
    handlePartChange,
    handleSubmit,
    handleReset,
  } = useRepairRequestForm();

  const {
    canRead,
    canWrite,
    isLoading: isRbacLoading,
  } = useRBAC("repair_request");

  const effectiveCanRead = isPublic ? true : canRead;
  const effectiveCanWrite = isPublic ? true : canWrite;

  // We only wait for RBAC if it's not public
  const showLoader = isLoading || (!isPublic && isRbacLoading);

  if (showLoader) {
    return (
      <div className="flex items-center justify-center min-h-75">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!effectiveCanRead) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Access Denied. You do not have permission to view the Repair Request
        form.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            New Repair Request
          </h1>
        </div>
        {!isPublic && (
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Get QR Code</span>
          </button>
        )}
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 shadow-sm">
          <div className="p-4">
            {/* Row 1: Request By, Assign To */}
            <div className="grid gap-3 sm:grid-cols-2 mb-3">
              <div>
                <label className={labelClass}>Request By *</label>
                <select
                  name="formFilledBy"
                  value={formData.formFilledBy}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">Select Person</option>
                  {requestByUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Assign To *</label>
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">Select Person</option>
                  {assignToUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Machine & Motor Selection */}
            <div className="grid gap-3 sm:grid-cols-2 mb-3">
              {/* Custom Machine Type Dropdown */}
              <div>
                <label className={labelClass}>Machine Type *</label>
                <select
                  name="machineType"
                  value={formData.machineType}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">Select Type</option>
                  {machineTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Machine Name Dropdown */}
              <div>
                <label className={labelClass}>Machine Name *</label>
                <select
                  name="machineName"
                  value={formData.machineName}
                  onChange={handleChange}
                  required={!formData.customMachine}
                  disabled={!formData.machineType}
                  className={selectClass}
                >
                  <option value="">
                    {!formData.machineType
                      ? "Select Type First"
                      : "Select Machine"}
                  </option>
                  {[...filteredMachines]
                    .sort((a, b) => {
                      const aIsLetter = a.trim().length === 1;
                      const bIsLetter = b.trim().length === 1;
                      if (aIsLetter && !bIsLetter) return -1;
                      if (!aIsLetter && bIsLetter) return 1;
                      return a.localeCompare(b);
                    })
                    .map((machine) => (
                      <option key={machine} value={machine}>
                        {machine}
                      </option>
                    ))}
                  <option value="other">Other (Enter manually)</option>
                </select>
              </div>
            </div>

            {/* Conditional: Custom Machine Name */}
            {formData.machineName === "other" && (
              <div className="mb-3">
                <label className={labelClass}>Enter Machine Name *</label>
                <input
                  type="text"
                  name="customMachine"
                  value={formData.customMachine}
                  onChange={handleChange}
                  placeholder="Enter machine name or serial number"
                  required
                  className={inputClass}
                />
              </div>
            )}

            {/* Row 3: Issue Details */}
            <div className="mb-3">
              <label className={labelClass}>Issue Details *</label>
              <textarea
                name="issueDetail"
                value={formData.issueDetail}
                onChange={handleChange}
                required
                rows={2}
                placeholder="Describe the issue in detail..."
                className={inputClass + " resize-none"}
              />
            </div>

            {/* Row 3.5: Parts Replaced */}
            <div className="mb-3">
              <label className={labelClass}>Parts to Replace (Select one or more)</label>
              <div className="relative">
                <div
                  className="min-h-10 border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 focus-within:ring-2 focus-within:ring-blue-500 cursor-pointer"
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <div className="flex flex-wrap gap-1 p-2 min-h-[38px] items-center pr-8">
                    {formData.part_replaced?.filter(p => p !== "other").map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium rounded border border-blue-100 dark:border-blue-800" onClick={(e) => e.stopPropagation()}>
                        {p}
                        <button type="button" onClick={() => handlePartChange(p)} className="hover:text-blue-900 dark:hover:text-blue-100">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {/* Live preview of manually typed parts */}
                    {formData.part_replaced?.includes("other") && formData.customPart.trim() && (
                      formData.customPart.split(",").map((p, i) => {
                        const trimmed = p.trim();
                        if (!trimmed) return null;
                        return (
                          <span key={`manual-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium rounded border border-orange-100 dark:border-orange-800" onClick={(e) => e.stopPropagation()}>
                            {trimmed}
                          </span>
                        );
                      })
                    )}
                    {formData.part_replaced?.includes("other") && !formData.customPart.trim() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium rounded border border-orange-100 dark:border-orange-800 italic" onClick={(e) => e.stopPropagation()}>
                        Type below...
                      </span>
                    )}
                    {(!formData.part_replaced || formData.part_replaced.length === 0) && (
                      <span className="text-sm text-muted-foreground px-1 py-0.5">Select parts to replace...</span>
                    )}
                    <ChevronDown className={`absolute right-2.5 top-3 w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </div>

                  {isOpen && (
                    <div
                      className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg p-2 max-h-60 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                        {partsData.filter(p => p["ITEM NAME"]).map((part) => (
                          <label key={part.id} className="flex items-center space-x-2 text-sm text-foreground hover:bg-gray-50 dark:hover:bg-neutral-800 p-1.5 rounded cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.part_replaced?.includes(part["ITEM NAME"] || "")}
                              onChange={() => handlePartChange(part["ITEM NAME"] || "")}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate text-xs flex-1" title={part["ITEM NAME"] || ""}>{part["ITEM NAME"]}</span>
                          </label>
                        ))}
                        <label className="flex items-center space-x-2 text-sm text-foreground hover:bg-gray-50 dark:hover:bg-neutral-800 p-1.5 rounded cursor-pointer transition-colors border-t border-dashed border-gray-100 dark:border-neutral-800 mt-1 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={formData.part_replaced?.includes("other")}
                            onChange={() => handlePartChange("other")}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-semibold text-blue-600">Other (Enter manually)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Conditional: Custom Part Name */}
            {formData.part_replaced?.includes("other") && (
              <div className="mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className={labelClass}>Manual Part Entry *</label>
                <input
                  type="text"
                  name="customPart"
                  value={formData.customPart}
                  onChange={handleChange}
                  placeholder="Type part names separated by commas (e.g. Bearing, Oil Filter)"
                  required
                  className={inputClass}
                />
              </div>
            )}

            {/* Row 4: Task Start Date */}
            <div className="mb-3">
              <label className={labelClass}>Task Start Date *</label>
              <input
                type="date"
                name="task_start_date"
                value={formData.task_start_date}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-neutral-700">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* QR Code Modal for Public Access */}
      {!isPublic && showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-sm w-full mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-500" />
                Public Form Link
              </h2>
              <button
                onClick={() => setShowQR(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Scan this code to fill the repair request on any device without
                logging in.
              </p>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-neutral-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    publicUrl,
                  )}`}
                  alt="Public Request Form QR Code"
                  className="w-48 h-48"
                />
              </div>
              <div className="pt-2 w-full">
                <p className="text-xs font-medium text-foreground mb-1">
                  Direct Link:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="flex-1 w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-foreground focus:outline-none"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).select();
                      navigator.clipboard.writeText(publicUrl);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
              <button
                onClick={() => setShowQR(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
