"use client";

import { useRepairRequestForm } from "../hooks/useRepairRequestForm";
import { Loader2, Send, X, Wrench } from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";

const inputClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const selectClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const labelClass =
  "block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1";

export default function MainRepairRequestForm() {
  const {
    formData,
    requestByUsers,
    assignToUsers,
    machines,
    isLoading,
    isSubmitting,
    handleChange,
    handleSubmit,
    handleReset,
    availableMotors,
  } = useRepairRequestForm();

  const {
    canRead,
    canWrite,
    isLoading: isRbacLoading,
  } = useRBAC("repair_request");

  if (isLoading || isRbacLoading) {
    return (
      <div className="flex items-center justify-center min-h-75">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!canRead) {
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
              <div>
                <label className={labelClass}>Machine Name *</label>
                <select
                  name="machineName"
                  value={formData.machineName}
                  onChange={handleChange}
                  required={!formData.customMachine}
                  className={selectClass}
                >
                  <option value="">Select Machine</option>
                  {[...machines]
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

              {/* Conditional: Motor Name (if available) - Visual Grid */}
              {availableMotors.length > 0 &&
                formData.machineName !== "other" && (
                  <div className="sm:col-span-2 mt-1">
                    <label className={labelClass}>
                      Select Motor / Part ({availableMotors.length}) *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1.5 p-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {availableMotors.map((motor) => {
                        const isSelected = formData.motorName === motor;
                        return (
                          <button
                            key={motor}
                            type="button"
                            onClick={() =>
                              handleChange({
                                target: { name: "motorName", value: motor },
                              } as any)
                            }
                            className={`
                            relative text-left px-3 py-2.5 text-xs sm:text-sm rounded-lg border transition-all duration-200
                            flex flex-col gap-0.5
                            ${
                              isSelected
                                ? "bg-orange-50 border-orange-500 text-orange-900 shadow-sm ring-1 ring-orange-500 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-100"
                                : "bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50/50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-gray-300 dark:hover:border-orange-700"
                            }
                          `}
                          >
                            <span className="font-medium line-clamp-2">
                              {motor}
                            </span>
                            {isSelected && (
                              <span className="absolute top-1 right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                disabled={isSubmitting || !canWrite}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !canWrite
                    ? "You do not have permission to submit requests"
                    : ""
                }
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
    </div>
  );
}
