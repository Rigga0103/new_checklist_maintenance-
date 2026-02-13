"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import supabase from "@/utils/supabaseClient";
import { fetchWorkingDaysApi } from "../../assignTask/server/api/assignTaskApi";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface CsvRow {
  "Machine Name": string;
  "Given By": string;
  Name: string;
  "Task Description": string;
  "Task Start Date": string;
  Freq: string;
  "Enable Reminders": string;
  "Require Attachment": string;
  [key: string]: string;
}

interface ParsedTask {
  id: number;
  machineName: string;
  givenBy: string;
  doerName: string;
  taskDescription: string;
  taskStartDate: string; // ISO format
  frequency: string; // normalized
  originalFrequency: string;
  enableReminders: boolean;
  requireAttachment: boolean;
  // validation
  isValid: boolean;
  validationErrors: string[];
}

interface GeneratedMaintenanceTask {
  machine_name: string;
  doer_name: string;
  task_description: string;
  task_start_date: string;
  frequency: string;
  status: string;
  created_at: string;
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const FREQUENCY_MAP: Record<string, string> = {
  daily: "daily",
  weekly: "weekly",
  fortnightly: "fortnightly",
  monthly: "monthly",
  quarterly: "quarterly",
  quaterly: "quarterly", // common typo
  "half yearly": "half-yearly",
  "half-yearly": "half-yearly",
  yearly: "yearly",
  annualy: "yearly", // common typo
  annually: "yearly",
  "one time": "one-time",
  "one-time": "one-time",
};

function normalizeFrequency(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return FREQUENCY_MAP[key] ?? null;
}

/** Parse DD/MM/YYYY HH:MM:SS or DD/MM/YYYY into ISO timestamp */
function parseDateString(raw: string): string | null {
  const trimmed = raw.trim();
  // DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
  );
  if (!match) return null;

  const [, day, month, year, hour, minute, second] = match;
  const d = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour ?? "0"),
    parseInt(minute ?? "0"),
    parseInt(second ?? "0"),
  );

  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Format date to DD/MM/YYYY for working days comparison */
function formatDateToDDMMYYYY(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function formatDateTimeForStorage(date: Date, time: string): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const timeWithSeconds = time.includes(":") ? time + ":00" : time;
  return `${year}-${month}-${day}T${timeWithSeconds}`;
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function CsvImportMaintenance() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // state
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [validUserNames, setValidUserNames] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  // ────────────────────────────────────────
  // Validate user names against Supabase
  // ────────────────────────────────────────
  const fetchValidUsers = useCallback(async (): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from("users")
      .select("user_name")
      .eq("status", "active");

    if (error) {
      console.error("Error fetching users:", error);
      return new Set();
    }

    return new Set(
      data?.map((u) => u.user_name?.trim().toLowerCase() ?? "") ?? [],
    );
  }, []);

  // ────────────────────────────────────────
  // Handle CSV file selection
  // ────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setImportResult(null);
      setFileName(file.name);

      try {
        // 1. Fetch valid users
        const validUsers = await fetchValidUsers();
        setValidUserNames(validUsers);

        // 2. Parse CSV
        Papa.parse<CsvRow>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const tasks: ParsedTask[] = results.data.map((row, index) => {
              const errors: string[] = [];

              // Machine Name
              const machineName = (row["Machine Name"] ?? "").trim();
              if (!machineName) errors.push("Missing machine name");

              // Doer Name validation
              const doerName = (row["Name"] ?? "").trim();
              if (!doerName) {
                errors.push("Missing doer name");
              } else if (!validUsers.has(doerName.toLowerCase())) {
                errors.push(`User "${doerName}" not found in system`);
              }

              // Task Description
              const taskDescription = (row["Task Description"] ?? "").trim();
              if (!taskDescription) errors.push("Missing task description");

              // Date
              const rawDate = (row["Task Start Date"] ?? "").trim();
              const parsedDate = parseDateString(rawDate);
              if (!rawDate) {
                errors.push("Missing start date");
              } else if (!parsedDate) {
                errors.push(`Invalid date format: "${rawDate}"`);
              }

              // Frequency
              const rawFreq = (row["Freq"] ?? "").trim();
              const normalizedFreq = normalizeFrequency(rawFreq);
              if (!rawFreq) {
                errors.push("Missing frequency");
              } else if (!normalizedFreq) {
                errors.push(`Unknown frequency: "${rawFreq}"`);
              }

              return {
                id: index + 1,
                machineName,
                givenBy: (row["Given By"] ?? "").trim(),
                doerName,
                taskDescription,
                taskStartDate: parsedDate ?? "",
                frequency: normalizedFreq ?? rawFreq.toLowerCase(),
                originalFrequency: rawFreq,
                enableReminders:
                  (row["Enable Reminders"] ?? "").trim().toLowerCase() ===
                  "yes",
                requireAttachment:
                  (row["Require Attachment"] ?? "").trim().toLowerCase() ===
                  "yes",
                isValid: errors.length === 0,
                validationErrors: errors,
              };
            });

            setParsedTasks(tasks);
            setIsUploading(false);

            const validCount = tasks.filter((t) => t.isValid).length;
            const invalidCount = tasks.length - validCount;
            toast.success(
              `Parsed ${tasks.length} rows: ${validCount} valid, ${invalidCount} with errors`,
            );
          },
          error: (error) => {
            console.error("CSV Parse error:", error);
            toast.error("Failed to parse CSV file");
            setIsUploading(false);
          },
        });
      } catch (error) {
        console.error("Error processing CSV:", error);
        toast.error("Failed to process CSV file");
        setIsUploading(false);
      }

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [fetchValidUsers],
  );

  // ────────────────────────────────────────
  // Generate recurring tasks
  // ────────────────────────────────────────
  const generateRecurringTasks = useCallback(
    (task: ParsedTask, workingDays: string[]): GeneratedMaintenanceTask[] => {
      const tasks: GeneratedMaintenanceTask[] = [];
      const startDate = new Date(task.taskStartDate);
      const endDate = addYears(startDate, 2); // generate up to 2 years
      const maxTasks = 365;

      const findNextWorkingDay = (targetDate: Date): string | null => {
        const targetDateStr = formatDateToDDMMYYYY(targetDate);
        if (workingDays.includes(targetDateStr)) return targetDateStr;
        if (workingDays.length === 0) return null;

        const targetDateObj = new Date(
          targetDateStr.split("/").reverse().join("-"),
        );
        const nextWorkingDay = workingDays.find((day) => {
          const dayObj = new Date(day.split("/").reverse().join("-"));
          return dayObj > targetDateObj;
        });
        return nextWorkingDay || null;
      };

      // One-time: just one task
      if (task.frequency === "one-time") {
        const taskDate = findNextWorkingDay(startDate);
        if (taskDate) {
          const taskDateObj = new Date(taskDate.split("/").reverse().join("-"));
          tasks.push({
            machine_name: task.machineName,
            doer_name: task.doerName,
            task_description: task.taskDescription,
            task_start_date: formatDateTimeForStorage(taskDateObj, "09:00"),
            frequency: task.frequency,
            status: "pending",
            created_at: new Date().toISOString(),
          });
        }
        return tasks;
      }

      // Recurring
      let currentDate = new Date(startDate);
      let taskCount = 0;

      while (currentDate <= endDate && taskCount < maxTasks) {
        const taskDate = findNextWorkingDay(currentDate);
        if (!taskDate) break;

        const taskDateObj = new Date(taskDate.split("/").reverse().join("-"));
        tasks.push({
          machine_name: task.machineName,
          doer_name: task.doerName,
          task_description: task.taskDescription,
          task_start_date: formatDateTimeForStorage(taskDateObj, "09:00"),
          frequency: task.frequency,
          status: "pending",
          created_at: new Date().toISOString(),
        });

        taskCount++;

        // Advance to next occurrence
        switch (task.frequency) {
          case "daily":
            currentDate = addDays(taskDateObj, 1);
            break;
          case "weekly":
            currentDate = addDays(taskDateObj, 7);
            break;
          case "fortnightly":
            currentDate = addDays(taskDateObj, 14);
            break;
          case "monthly":
            currentDate = addMonths(taskDateObj, 1);
            break;
          case "quarterly":
            currentDate = addMonths(taskDateObj, 3);
            break;
          case "half-yearly":
            currentDate = addMonths(taskDateObj, 6);
            break;
          case "yearly":
            currentDate = addYears(taskDateObj, 1);
            break;
          default:
            currentDate = endDate; // exit
            break;
        }
      }

      return tasks;
    },
    [],
  );

  // ────────────────────────────────────────
  // Import tasks into Supabase
  // ────────────────────────────────────────
  const handleImport = useCallback(async () => {
    const validTasks = parsedTasks.filter((t) => t.isValid);
    if (validTasks.length === 0) {
      toast.error("No valid tasks to import");
      return;
    }

    setIsImporting(true);

    try {
      // 1. Fetch working days
      const workingDays = await fetchWorkingDaysApi();
      if (workingDays.length === 0) {
        toast.error("Working days calendar not loaded. Cannot generate tasks.");
        setIsImporting(false);
        return;
      }

      // 2. Generate all recurring tasks
      let allGeneratedTasks: GeneratedMaintenanceTask[] = [];
      for (const task of validTasks) {
        const generated = generateRecurringTasks(task, workingDays);
        allGeneratedTasks = allGeneratedTasks.concat(generated);
      }

      if (allGeneratedTasks.length === 0) {
        toast.error(
          "No tasks could be generated from the working day calendar",
        );
        setIsImporting(false);
        return;
      }

      // 3. Fetch current MAX task_id
      const { data: maxIdData, error: maxIdError } = await supabase
        .from("machine_maintenance")
        .select("task_id")
        .order("task_id", { ascending: false })
        .limit(1);

      if (maxIdError) {
        console.error("Error fetching max task_id:", maxIdError);
        toast.error("Failed to generate task IDs");
        setIsImporting(false);
        return;
      }

      const currentMaxId =
        maxIdData && maxIdData.length > 0 ? Number(maxIdData[0].task_id) : 0;

      // 4. Assign sequential task_ids
      const tasksWithIds = allGeneratedTasks.map((task, index) => ({
        task_id: currentMaxId + index + 1,
        ...task,
      }));

      // 5. Batch insert in chunks of 500
      const chunkSize = 500;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < tasksWithIds.length; i += chunkSize) {
        const chunk = tasksWithIds.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("machine_maintenance")
          .insert(chunk);

        if (error) {
          console.error("Error inserting chunk:", error);
          failCount += chunk.length;
        } else {
          successCount += chunk.length;
        }
      }

      setImportResult({ success: successCount, failed: failCount });

      if (failCount === 0) {
        toast.success(
          `Successfully imported ${successCount} maintenance tasks!`,
        );
      } else {
        toast.warning(`Imported ${successCount} tasks, ${failCount} failed.`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import tasks");
    } finally {
      setIsImporting(false);
    }
  }, [parsedTasks, generateRecurringTasks]);

  // ────────────────────────────────────────
  // Clear
  // ────────────────────────────────────────
  const handleClear = useCallback(() => {
    setParsedTasks([]);
    setFileName("");
    setImportResult(null);
  }, []);

  // ────────────────────────────────────────
  // Download sample CSV
  // ────────────────────────────────────────
  const handleDownloadSample = useCallback(() => {
    const sampleData = [
      [
        "Timestamp",
        "Task ID",
        "Machine Name",
        "Given By",
        "Name",
        "Task Description",
        "Task Start Date",
        "Freq",
        "Enable Reminders",
        "Require Attachment",
      ],
      [
        "25/07/2025 00:00:00",
        "1",
        "Machine A",
        "Admin",
        "Pratap Kumar Rout",
        "Machine panel clean",
        "22/11/2025 00:00:00",
        "Weekly",
        "No",
        "No",
      ],
    ];

    const csv = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maintenance_import_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ────────────────────────────────────────
  // Stats
  // ────────────────────────────────────────
  const validCount = parsedTasks.filter((t) => t.isValid).length;
  const invalidCount = parsedTasks.length - validCount;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
          <h2 className="text-lg font-medium text-foreground">
            Import Maintenance Tasks from CSV
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a CSV exported from Google Sheets to generate recurring
            maintenance tasks
          </p>
        </div>

        <div className="p-6">
          {/* Upload area */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label
              className={`flex items-center gap-3 px-6 py-3 rounded-lg cursor-pointer transition-colors border-2 border-dashed ${
                isUploading
                  ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700"
                  : "border-gray-300 dark:border-neutral-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
              }`}
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin text-blue-500" />
              ) : (
                <Upload size={20} className="text-blue-500" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isUploading
                  ? "Processing..."
                  : fileName
                    ? fileName
                    : "Choose CSV File"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading || isImporting}
              />
            </label>

            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Download size={16} />
              Download Sample CSV
            </button>

            {parsedTasks.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 size={16} />
                Clear
              </button>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  Import Complete: {importResult.success} tasks created
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Table */}
      {parsedTasks.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
          <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-foreground">
                Preview ({parsedTasks.length} rows)
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 size={14} />
                  {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <XCircle size={14} />
                    {invalidCount} errors
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={validCount === 0 || isImporting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                validCount > 0 && !isImporting
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 dark:bg-neutral-600 text-gray-500 dark:text-neutral-400 cursor-not-allowed"
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import {validCount} Valid Tasks
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Machine Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Doer Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Task Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Frequency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                {parsedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className={`${
                      task.isValid
                        ? "hover:bg-gray-50 dark:hover:bg-neutral-700"
                        : "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                    } transition-colors`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {task.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {task.isValid ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <div className="group relative">
                          <XCircle
                            size={18}
                            className="text-red-500 cursor-help"
                          />
                          <div className="absolute z-50 left-6 top-0 hidden group-hover:block w-64 p-2 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg text-xs">
                            {task.validationErrors.map((err, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1 py-0.5 text-red-600 dark:text-red-400"
                              >
                                <AlertCircle
                                  size={12}
                                  className="mt-0.5 shrink-0"
                                />
                                {err}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {task.machineName || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                      <span
                        className={
                          !task.isValid &&
                          task.validationErrors.some((e) =>
                            e.includes("not found"),
                          )
                            ? "text-red-500 dark:text-red-400 font-medium"
                            : ""
                        }
                      >
                        {task.doerName || (
                          <span className="text-red-400 italic">Missing</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground dark:text-gray-300 max-w-[200px] truncate">
                      {task.taskDescription || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                      {task.taskStartDate ? (
                        new Date(task.taskStartDate).toLocaleDateString("en-IN")
                      ) : (
                        <span className="text-red-400 italic">Invalid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          task.frequency
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {task.frequency || task.originalFrequency || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {parsedTasks.length === 0 && !isUploading && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 p-12 text-center">
          <FileText
            size={48}
            className="mx-auto text-gray-300 dark:text-neutral-600 mb-4"
          />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No CSV Uploaded
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a CSV file exported from Google Sheets containing maintenance
            task data. The system will validate user names, normalize
            frequencies, and generate recurring tasks automatically.
          </p>
        </div>
      )}
    </div>
  );
}
