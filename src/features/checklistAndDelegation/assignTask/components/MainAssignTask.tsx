"use client";

import { useAssignTask, SectionType } from "../hooks/useAssignTask";
import {
  Loader2,
  Send,
  RefreshCw,
  ClipboardList,
  Wrench,
  BellRing,
  FileCheck,
  ChevronDown,
  Upload,
  Eye,
  X,
} from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";
import { useState } from "react";
import { uploadSampleImage } from "../server/api/assignTaskImageApi";
import { toast } from "sonner";

const inputClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const selectClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const labelClass =
  "block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1";

export default function MainAssignTask() {
  const {
    departments,
    givenByList,
    doerNames,
    frequencies,
    selectedSection,
    setSelectedSection,
    machineOptions,
    formData,
    selectedDate,
    setSelectedDate,
    selectedEndDate,
    setSelectedEndDate,
    generatedTasks,
    accordionOpen,
    setAccordionOpen,
    isLoading,
    isSubmitting,
    isLoadingDoerNames,
    handleChange,
    handleSwitchChange,
    handleGenerate,
    handleSubmit,
    handleReset,
    taskSuggestions,
  } = useAssignTask();

  const [isUploadingSampleImage, setIsUploadingSampleImage] = useState(false);

  const handleSampleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSampleImage(true);
    try {
      const url = await uploadSampleImage(file);
      handleChange({
        target: { name: "sampleImage", value: url },
      } as React.ChangeEvent<HTMLInputElement>);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploadingSampleImage(false);
    }
  };

  // Convert Date to input format
  const getInputDateValue = () => {
    if (!selectedDate) return "";
    return selectedDate.toISOString().split("T")[0];
  };

  // Handle date input change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
  };

  // Handle end date input change (one-time only)
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedEndDate(new Date(value));
    } else {
      setSelectedEndDate(null);
    }
  };

  // Get end date input value
  const getInputEndDateValue = () => {
    if (!selectedEndDate) return "";
    return selectedEndDate.toISOString().split("T")[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-75">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {selectedSection === "checklist" ? (
            <ClipboardList className="w-5 h-5 text-blue-600" />
          ) : (
            <Wrench className="w-5 h-5 text-orange-600" />
          )}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Assign New Task
          </h1>
        </div>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value as SectionType)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors cursor-pointer ${
            selectedSection === "checklist"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
              : "border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400"
          }`}
        >
          <option value="checklist">Checklist</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 shadow-sm">
          <div className="p-4">
            {/* Row 1: Dept/Machine, Given By, Doer, Frequency, From Date */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-3">
              <div>
                <label className={labelClass}>
                  {selectedSection === "checklist"
                    ? "Department *"
                    : "Machine *"}
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">
                    {selectedSection === "checklist"
                      ? "Select Department"
                      : "Select Machine"}
                  </option>
                  {(selectedSection === "checklist"
                    ? departments
                    : machineOptions
                  ).map((item, idx) => (
                    <option key={idx} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Given By *</label>
                <select
                  name="givenBy"
                  value={formData.givenBy}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  <option value="">Select Person</option>
                  {givenByList.map((person, idx) => (
                    <option key={idx} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Doer Name *</label>
                <select
                  name="assignTo"
                  value={formData.assignTo}
                  onChange={handleChange}
                  required
                  disabled={
                    (selectedSection === "checklist" && !formData.department) ||
                    isLoadingDoerNames
                  }
                  className={selectClass}
                >
                  <option value="">
                    {isLoadingDoerNames ? "Loading..." : "Select Doer"}
                  </option>
                  {doerNames.map((name, idx) => (
                    <option key={idx} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Frequency *</label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  required
                  className={selectClass}
                >
                  {frequencies.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>From Date *</label>
                <input
                  type="date"
                  value={getInputDateValue()}
                  onChange={handleDateChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className={labelClass}>Task Description *</label>
              <AutocompleteInput
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                suggestions={taskSuggestions}
                placeholder="Enter task description..."
                className={inputClass}
              />
            </div>

            {/* Row 3: Sample Image */}
            <div className="mb-3">
              <label className={labelClass}>
                Sample Image {formData.requireAttachment && "*"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="sampleImage"
                  value={formData.sampleImage || ""}
                  onChange={handleChange}
                  placeholder="Paste image URL..."
                  className={inputClass + " flex-1"}
                />
                <label className="cursor-pointer flex items-center justify-center h-9 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSampleImageUpload}
                    className="hidden"
                  />
                  {isUploadingSampleImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1.5" />
                      Upload
                    </>
                  )}
                </label>
              </div>
              {formData.sampleImage && (
                <div className="mt-2 relative w-20 h-20 rounded border border-gray-200 dark:border-neutral-700 overflow-hidden group">
                  <img
                    src={formData.sampleImage}
                    alt="Sample"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/100?text=Invalid+Link";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleChange({
                        target: { name: "sampleImage", value: "" },
                      } as any)
                    }
                    className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Row 3: Time */}
            <div className="grid gap-3 sm:grid-cols-3 mb-3">
              <div>
                <label className={labelClass}>Time *</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* End Date — only for one-time checklist tasks */}
            {formData.frequency === "one-time" &&
              selectedSection === "checklist" && (
                <div className="mb-3">
                  <label className={labelClass}>
                    End Date (Deadline){" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      — task shows as Overdue after this date
                    </span>
                  </label>
                  <input
                    type="date"
                    value={getInputEndDateValue()}
                    onChange={handleEndDateChange}
                    min={getInputDateValue() || undefined}
                    className={inputClass}
                  />
                </div>
              )}

            {/* Row 4: Additional Options (inline) + Generate Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-neutral-700">
              {/* Toggles */}
              <div className="flex items-center gap-6">
                {/* Enable Reminders Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.enableReminders}
                      onChange={(e) =>
                        handleSwitchChange("enableReminders", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-neutral-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <BellRing className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Reminders
                  </span>
                </label>

                {/* Require Attachment Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.requireAttachment}
                      onChange={(e) =>
                        handleSwitchChange(
                          "requireAttachment",
                          e.target.checked,
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-neutral-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <FileCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Attachment Required
                  </span>
                </label>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Preview Task
              </button>
            </div>
          </div>

          {/* Generated Task Preview */}
          {generatedTasks.length > 0 && (
            <div className="border-t border-gray-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setAccordionOpen(!accordionOpen)}
                className="flex items-center justify-between w-full p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✓ {generatedTasks.length} Task Ready to Submit
                  <span className="ml-2 text-xs text-green-600 dark:text-green-500">
                    (
                    {formData.frequency === "one-time"
                      ? "One-time"
                      : "Recurring"}
                    )
                  </span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-green-600 transition-transform ${
                    accordionOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accordionOpen && (
                <div className="p-3 bg-gray-50 dark:bg-neutral-900/50 max-h-32 overflow-y-auto">
                  {generatedTasks.map((task, index) => (
                    <div
                      key={index}
                      className="p-2 mb-2 last:mb-0 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {task.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {task.department} • {task.assignTo} • Start:{" "}
                            {task.dueDate.split("T")[0]}
                            {task.endDate && (
                              <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                                Deadline: {task.endDate.split("T")[0]}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {task.enableReminders && (
                            <span
                              className="p-1 bg-blue-100 dark:bg-blue-900/50 rounded"
                              title="Reminders enabled"
                            >
                              <BellRing className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            </span>
                          )}
                          {task.requireAttachment && (
                            <span
                              className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded"
                              title="Attachment required"
                            >
                              <FileCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-900/30 border-t border-gray-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Assign Task
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
