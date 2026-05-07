"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Download,
  ListChecks,
  CalendarDays,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import supabase from "@/utils/supabaseClient";
import { fetchWorkingDaysApi } from "../../assignTask/server/api/assignTaskApi";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CsvRow {
  "Created At"?: string;
  "Task ID"?: string;
  Department?: string;
  "Given By"?: string;
  Name?: string;
  "Task Description"?: string;
  "Start Date"?: string;
  "End Date"?: string;
  Frequency?: string;
  Reminder?: string;
  "Attachment Required"?: string;
  Image?: string;
  "Synced On"?: string;
  [key: string]: string | undefined;
}

interface ParsedRow {
  id: number;
  department: string;
  givenBy: string;
  name: string;
  taskDescription: string;
  taskStartDate: string;   // ISO
  taskEndDate: string;     // ISO or ""
  frequency: string;       // normalized
  originalFrequency: string;
  enableReminder: boolean;
  requireAttachment: boolean;
  image: string;
  isValid: boolean;
  validationErrors: string[];
}

type ImportMode = "templates" | "templates_and_tasks";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const FREQUENCY_MAP: Record<string, string> = {
  daily: "daily",
  weekly: "weekly",
  fortnightly: "fortnightly",
  monthly: "monthly",
  quarterly: "quarterly",
  quaterly: "quarterly",
  "half yearly": "half-yearly",
  "half-yearly": "half-yearly",
  yearly: "yearly",
  annually: "yearly",
  "one time": "one-time",
  "one-time": "one-time",
  "end of 1st week": "end-of-1st-week",
  "end-of-1st-week": "end-of-1st-week",
  "end of 2nd week": "end-of-2nd-week",
  "end-of-2nd-week": "end-of-2nd-week",
  "end of 3rd week": "end-of-3rd-week",
  "end-of-3rd-week": "end-of-3rd-week",
  "end of 4th week": "end-of-4th-week",
  "end-of-4th-week": "end-of-4th-week",
  "end of last week": "end-of-last-week",
  "end-of-last-week": "end-of-last-week",
};

function normalizeFrequency(raw: string): string | null {
  return FREQUENCY_MAP[raw.trim().toLowerCase()] ?? null;
}

/** Parses DD/MM/YYYY HH:MM:SS or DD/MM/YYYY or YYYY-MM-DD into ISO */
function parseDateString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
  const slashMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
  );
  if (slashMatch) {
    const [, day, month, year, h, m, s] = slashMatch;
    const d = new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(h ?? "0"), parseInt(m ?? "0"), parseInt(s ?? "0"),
    );
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}

function formatDDMMYYYY(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function addMonths(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}
function addYears(d: Date, n: number): Date {
  const r = new Date(d); r.setFullYear(r.getFullYear() + n); return r;
}

function formatForStorage(date: Date, time = "23:30:00"): string {
  const y  = date.getFullYear();
  const m  = (date.getMonth() + 1).toString().padStart(2, "0");
  const d  = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}T${time}`;
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function CsvImportChecklist() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows]       = useState<ParsedRow[]>([]);
  const [fileName, setFileName]           = useState("");
  const [isUploading, setIsUploading]     = useState(false);
  const [isImporting, setIsImporting]     = useState(false);
  const [importMode, setImportMode]       = useState<ImportMode>("templates_and_tasks");
  const [progress, setProgress]           = useState({ step: "", pct: 0 });
  const [importResult, setImportResult]   = useState<{
    templates: number;
    tasks: number;
    skipped: number;
  } | null>(null);

  // ───────────────────────────────
  // Fetch valid user names
  // ───────────────────────────────
  const fetchValidUsers = useCallback(async (): Promise<Set<string>> => {
    const { data } = await supabase.from("users").select("user_name").not("user_name", "is", null);
    return new Set((data ?? []).map((u) => u.user_name!.trim().toLowerCase()));
  }, []);

  // ───────────────────────────────
  // Parse CSV file
  // ───────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      setImportResult(null);
      setFileName(file.name);

      try {
        const validUsers = await fetchValidUsers();

        Papa.parse<CsvRow>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows: ParsedRow[] = results.data.map((row, idx) => {
              const errors: string[] = [];

              const department      = (row["Department"] ?? "").trim();
              const givenBy         = (row["Given By"] ?? "").trim();
              const name            = (row["Name"] ?? "").trim();
              const taskDescription = (row["Task Description"] ?? "").trim();
              const rawStartDate    = (row["Start Date"] ?? "").trim();
              const rawEndDate      = (row["End Date"] ?? "").trim();
              const rawFrequency    = (row["Frequency"] ?? "").trim();
              const reminder        = (row["Reminder"] ?? "").trim().toLowerCase() === "yes";
              const attachment      = (row["Attachment Required"] ?? "").trim().toLowerCase() === "yes";
              const image           = (row["Image"] ?? "").trim();

              if (!department)      errors.push("Missing department");
              if (!name)            errors.push("Missing assignee name");
              else if (!validUsers.has(name.toLowerCase()))
                errors.push(`User "${name}" not found in system`);
              if (!taskDescription) errors.push("Missing task description");

              const parsedStart = parseDateString(rawStartDate);
              if (!rawStartDate)    errors.push("Missing start date");
              else if (!parsedStart) errors.push(`Invalid start date: "${rawStartDate}"`);

              const parsedEnd = rawEndDate ? parseDateString(rawEndDate) : null;
              if (rawEndDate && !parsedEnd) errors.push(`Invalid end date: "${rawEndDate}"`);

              const normalizedFreq = normalizeFrequency(rawFrequency);
              if (!rawFrequency)    errors.push("Missing frequency");
              else if (!normalizedFreq) errors.push(`Unknown frequency: "${rawFrequency}"`);

              return {
                id: idx + 1,
                department,
                givenBy,
                name,
                taskDescription,
                taskStartDate: parsedStart ?? "",
                taskEndDate:   parsedEnd ?? "",
                frequency:     normalizedFreq ?? rawFrequency.toLowerCase(),
                originalFrequency: rawFrequency,
                enableReminder: reminder,
                requireAttachment: attachment,
                image,
                isValid:           errors.length === 0,
                validationErrors:  errors,
              };
            });

            setParsedRows(rows);
            setIsUploading(false);

            const valid = rows.filter((r) => r.isValid).length;
            toast.success(`Parsed ${rows.length} rows — ${valid} valid, ${rows.length - valid} with errors`);
          },
          error: () => {
            toast.error("Failed to parse CSV file");
            setIsUploading(false);
          },
        });
      } catch {
        toast.error("Error processing file");
        setIsUploading(false);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [fetchValidUsers],
  );

  // ───────────────────────────────
  // Generate recurring tasks for a
  // single template row
  // ───────────────────────────────
  const generateTasks = useCallback(
    (
      row: ParsedRow,
      workingDays: string[],  // DD/MM/YYYY array
      uniqueId: number,
    ): object[] => {
      const tasks: object[] = [];
      const startDate = new Date(row.taskStartDate);
      const endDate   = row.taskEndDate
        ? new Date(row.taskEndDate)
        : addYears(startDate, 1);
      const maxTasks  = 400;

      // Returns the working day on or after `target` (DD/MM/YYYY → Date)
      const nextWorkingDay = (target: Date): Date | null => {
        const targetStr = formatDDMMYYYY(target);
        if (workingDays.includes(targetStr))
          return new Date(targetStr.split("/").reverse().join("-"));
        const future = workingDays.find((wd) => {
          return new Date(wd.split("/").reverse().join("-")) > new Date(targetStr.split("/").reverse().join("-"));
        });
        return future ? new Date(future.split("/").reverse().join("-")) : null;
      };

      // Returns the last working day of week `weekNumber` in the month of `date`.
      // weekNumber: 1–4 = week-of-month (days 1–7, 8–14, 15–21, 22–28); -1 = last week of month.
      const endOfWeekDate = (date: Date, weekNumber: number): Date | null => {
        const month = date.getMonth();   // 0-indexed
        const year  = date.getFullYear();
        const monthDays = workingDays.filter((wd) => {
          const [, mm, yyyy] = wd.split("/").map(Number);
          return yyyy === year && mm === month + 1;
        });
        if (monthDays.length === 0) return null;
        if (weekNumber === -1) {
          const last = monthDays[monthDays.length - 1];
          return new Date(last.split("/").reverse().join("-"));
        }
        const weeks: Record<number, string[]> = {};
        monthDays.forEach((wd) => {
          const day = parseInt(wd.split("/")[0]);
          const wk  = Math.ceil(day / 7);
          if (!weeks[wk]) weeks[wk] = [];
          weeks[wk].push(wd);
        });
        const weekDays = weeks[weekNumber];
        const result   = weekDays
          ? weekDays[weekDays.length - 1]
          : monthDays[monthDays.length - 1];
        return new Date(result.split("/").reverse().join("-"));
      };

      if (row.frequency === "one-time") {
        const d = nextWorkingDay(startDate);
        if (d) tasks.push(makeChecklistRow(row, d, uniqueId));
        return tasks;
      }

      let cur = new Date(startDate);

      while (cur <= endDate && tasks.length < maxTasks) {
        let taskDate: Date | null = null;

        if (
          row.frequency === "end-of-1st-week" ||
          row.frequency === "end-of-2nd-week" ||
          row.frequency === "end-of-3rd-week" ||
          row.frequency === "end-of-4th-week"
        ) {
          const weekNum = parseInt(row.frequency.split("-")[2]);
          taskDate = endOfWeekDate(cur, weekNum);
          if (!taskDate) break;
          cur = addMonths(taskDate, 1);
        } else if (row.frequency === "end-of-last-week") {
          taskDate = endOfWeekDate(cur, -1);
          if (!taskDate) break;
          cur = addMonths(taskDate, 1);
        } else {
          taskDate = nextWorkingDay(cur);
          if (!taskDate) break;
          switch (row.frequency) {
            case "daily":       cur = addDays(taskDate, 1);    break;
            case "weekly":      cur = addDays(taskDate, 7);    break;
            case "fortnightly": cur = addDays(taskDate, 14);   break;
            case "monthly":     cur = addMonths(taskDate, 1);  break;
            case "quarterly":   cur = addMonths(taskDate, 3);  break;
            case "half-yearly": cur = addMonths(taskDate, 6);  break;
            case "yearly":      cur = addYears(taskDate, 1);   break;
            default:            cur = new Date(endDate.getTime() + 1); break;
          }
        }

        if (taskDate > endDate) break;
        tasks.push(makeChecklistRow(row, taskDate, uniqueId));
      }

      return tasks;
    },
    [],
  );

  function makeChecklistRow(row: ParsedRow, date: Date, _uniqueId: number): object {
    return {
      department:         row.department,
      given_by:           row.givenBy,
      name:               row.name,
      task_description:   row.taskDescription,
      task_start_date:    formatForStorage(date, "23:30:00"),
      frequency:          row.frequency,
      enable_reminder:    row.enableReminder ? "yes" : "no",
      require_attachment: row.requireAttachment ? "yes" : "no",
      sample_image:       row.image || null,
      created_at:         new Date().toISOString(),
      // source_unique_id is set by the fn_link_checklist_to_user DB trigger
      // via task_description + name match against unique_checklist
    };
  }

  // ───────────────────────────────
  // Import handler
  // ───────────────────────────────
  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) { toast.error("No valid rows to import"); return; }

    setIsImporting(true);
    setImportResult(null);

    try {
      // ── Step 1: Insert into unique_checklist ──
      setProgress({ step: "Saving templates…", pct: 10 });

      const templateInserts = validRows.map((r) => ({
        name:               r.name,
        department:         r.department,
        given_by:           r.givenBy,
        task_description:   r.taskDescription,
        task_start_date:    r.taskStartDate,
        task_end_date:      r.taskEndDate || null,
        frequency:          r.frequency,
        enable_reminder:    r.enableReminder ? "yes" : "no",
        require_attachment: r.requireAttachment ? "yes" : "no",
        image:              r.image || null,
        created_at:         new Date().toISOString(),
      }));

      const { data: insertedTemplates, error: templateErr } = await supabase
        .from("unique_checklist")
        .insert(templateInserts)
        .select("task_id");

      if (templateErr) {
        if (templateErr.code === "23505") {
          throw new Error("One or more task descriptions already exist in templates. Remove duplicate rows from your CSV and try again.");
        }
        throw new Error(`Template insert failed: ${templateErr.message}`);
      }

      const templateIds = (insertedTemplates ?? []).map((t) => t.task_id as number);
      const templatesCount = templateIds.length;

      // ── Step 2: Generate checklist tasks ──
      let tasksCount = 0;
      let skippedCount = 0;

      if (importMode === "templates_and_tasks") {
        setProgress({ step: "Loading working days…", pct: 30 });
        const workingDays = await fetchWorkingDaysApi();

        if (workingDays.length === 0) {
          toast.warning(`${templatesCount} templates saved, but no working day calendar found — tasks not generated.`);
          setImportResult({ templates: templatesCount, tasks: 0, skipped: 0 });
          setIsImporting(false);
          return;
        }

        setProgress({ step: "Generating tasks…", pct: 50 });
        let allTasks: object[] = [];
        validRows.forEach((row, i) => {
          const uniqueId = templateIds[i] ?? 0;
          const generated = generateTasks(row, workingDays, uniqueId);
          allTasks = allTasks.concat(generated);
        });

        if (allTasks.length === 0) {
          toast.warning(`${templatesCount} templates saved. No tasks fit the working day calendar.`);
          setImportResult({ templates: templatesCount, tasks: 0, skipped: 0 });
          setIsImporting(false);
          return;
        }

        // Batch insert in chunks of 500
        setProgress({ step: `Inserting ${allTasks.length} tasks…`, pct: 65 });
        const CHUNK = 500;
        let inserted = 0;
        let failed   = 0;
        for (let i = 0; i < allTasks.length; i += CHUNK) {
          const chunk = allTasks.slice(i, i + CHUNK);
          const { error } = await supabase.from("checklist").insert(chunk);
          if (error) {
            console.error("Chunk insert error:", error);
            if (error.code === "23505") {
              toast.error("Some tasks already exist (duplicate). Skipping duplicates.");
            }
            failed += chunk.length;
          } else {
            inserted += chunk.length;
          }
          setProgress({
            step:  `Inserting tasks… (${inserted + failed} / ${allTasks.length})`,
            pct:   65 + Math.round(((inserted + failed) / allTasks.length) * 30),
          });
        }
        tasksCount   = inserted;
        skippedCount = failed;
      }

      setProgress({ step: "Done", pct: 100 });
      setImportResult({ templates: templatesCount, tasks: tasksCount, skipped: skippedCount });

      if (skippedCount === 0) {
        toast.success(
          importMode === "templates_and_tasks"
            ? `Imported ${templatesCount} templates and generated ${tasksCount} checklist tasks.`
            : `Saved ${templatesCount} task templates.`,
        );
      } else {
        toast.warning(`Templates: ${templatesCount}, Tasks: ${tasksCount}, Failed: ${skippedCount}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Import failed");
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  }, [parsedRows, importMode, generateTasks]);

  // ───────────────────────────────
  // Clear
  // ───────────────────────────────
  const handleClear = useCallback(() => {
    setParsedRows([]);
    setFileName("");
    setImportResult(null);
    setProgress({ step: "", pct: 0 });
  }, []);

  // ───────────────────────────────
  // Download sample CSV
  // ───────────────────────────────
  const handleDownloadSample = useCallback(() => {
    const headers = [
      "Created At", "Task ID", "Department", "Given By", "Name",
      "Task Description", "Start Date", "End Date", "Frequency",
      "Reminder", "Attachment Required", "Image", "Synced On",
    ];
    const rows = [
      ["21/02/2026 15:36:11", "858", "Security", "MD Sir", "Chandrakant Kurre",
       "Daily morning 6 am light off in factory", "20/02/2026 23:30:00", "", "daily", "no", "no", "", ""],
      ["21/02/2026 14:13:06", "811", "AdminOffice", "MD Sir", "Rakesh Walecha",
       "Tally Data Backup", "20/02/2026 23:30:00", "", "daily", "no", "no", "", ""],
      ["21/02/2026 16:30:15", "1032", "AdminOffice", "MD Sir", "Shivcharan Satnami",
       "File Arrangement on 21st of every month", "21/02/2026 23:30:00", "", "monthly", "no", "no", "", ""],
    ];
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "checklist_import_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ───────────────────────────────
  // Derived counts
  // ───────────────────────────────
  const validCount   = useMemo(() => parsedRows.filter((r) => r.isValid).length, [parsedRows]);
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <Info size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div className="text-sm text-emerald-800 dark:text-emerald-300">
          <p className="font-semibold mb-1">Import Checklist Tasks from Google Sheets</p>
          <p>
            Export your Google Sheet as CSV, then upload here. Each row saves a task template
            in <strong>Unique Checklist</strong> and (optionally) generates recurring tasks in the
            <strong> Checklist</strong> table based on the working day calendar.
          </p>
        </div>
      </div>

      {/* Upload + config card */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
          <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
            <ListChecks size={20} className="text-emerald-500" />
            Import Checklist Tasks
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload CSV exported from Google Sheets. Required columns:
            <span className="font-mono text-xs ml-1">Department, Given By, Name, Task Description, Start Date, Frequency</span>
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Import mode toggle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Import Mode</p>
            <div className="flex gap-3">
              <button
                onClick={() => setImportMode("templates_and_tasks")}
                disabled={isImporting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  importMode === "templates_and_tasks"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 text-foreground hover:bg-emerald-50"
                }`}
              >
                <CalendarDays size={15} />
                Save Templates + Generate Tasks
              </button>
              <button
                onClick={() => setImportMode("templates")}
                disabled={isImporting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  importMode === "templates"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 text-foreground hover:bg-blue-50"
                }`}
              >
                <ListChecks size={15} />
                Templates Only
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {importMode === "templates_and_tasks"
                ? "Saves each row to unique_checklist AND generates recurring tasks in checklist based on the working day calendar."
                : "Only saves templates to unique_checklist. Tasks can be generated later via Assign Task."}
            </p>
          </div>

          {/* File upload + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`flex items-center gap-3 px-5 py-2.5 rounded-lg cursor-pointer transition-colors border-2 border-dashed ${
                isUploading
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-gray-300 dark:border-neutral-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
              }`}
            >
              {isUploading
                ? <Loader2 size={18} className="animate-spin text-emerald-500" />
                : <Upload size={18} className="text-emerald-500" />}
              <span className="text-sm font-medium text-foreground">
                {isUploading ? "Processing…" : fileName || "Choose CSV File"}
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <Download size={15} />
              Sample CSV
            </button>

            {parsedRows.length > 0 && (
              <button
                onClick={handleClear}
                disabled={isImporting}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 size={15} />
                Clear
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.step}</span>
                <span>{progress.pct}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" />
                <div className="text-sm text-green-800 dark:text-green-300">
                  <p className="font-semibold">Import Complete</p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    <li>Templates saved to <strong>unique_checklist</strong>: <strong>{importResult.templates}</strong></li>
                    {importMode === "templates_and_tasks" && (
                      <li>Tasks generated in <strong>checklist</strong>: <strong>{importResult.tasks}</strong></li>
                    )}
                    {importResult.skipped > 0 && (
                      <li className="text-orange-600 dark:text-orange-400">Failed rows: {importResult.skipped}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview table */}
      {parsedRows.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
          <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-foreground">Preview ({parsedRows.length} rows)</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 size={14} /> {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <XCircle size={14} /> {invalidCount} errors
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={validCount === 0 || isImporting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                validCount > 0 && !isImporting
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-300 dark:bg-neutral-600 text-gray-500 dark:text-neutral-400 cursor-not-allowed"
              }`}
            >
              {isImporting
                ? <><Loader2 size={15} className="animate-spin" /> Importing…</>
                : <><Upload size={15} /> Import {validCount} Tasks</>}
            </button>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-420px)]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                <tr>
                  {["#", "Status", "Dept", "Given By", "Assignee", "Description", "Start Date", "Frequency", "Remind", "Attach"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                {parsedRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.isValid
                        ? "hover:bg-gray-50 dark:hover:bg-neutral-700"
                        : "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                    }`}
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{row.id}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {row.isValid ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <div className="group relative inline-block">
                          <XCircle size={16} className="text-red-500 cursor-help" />
                          <div className="absolute z-50 left-6 top-0 hidden group-hover:block w-64 p-2 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg">
                            {row.validationErrors.map((err, i) => (
                              <div key={i} className="flex items-start gap-1 py-0.5 text-xs text-red-600 dark:text-red-400">
                                <AlertCircle size={11} className="mt-0.5 shrink-0" /> {err}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-foreground font-medium">
                      {row.department || <span className="text-red-400 italic text-xs">Missing</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      {row.givenBy || "—"}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap font-medium ${
                      row.validationErrors.some((e) => e.includes("not found"))
                        ? "text-red-500"
                        : "text-foreground"
                    }`}>
                      {row.name || <span className="text-red-400 italic text-xs">Missing</span>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground max-w-45 truncate" title={row.taskDescription}>
                      {row.taskDescription || <span className="text-red-400 italic text-xs">Missing</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                      {row.taskStartDate
                        ? new Date(row.taskStartDate).toLocaleDateString("en-IN")
                        : <span className="text-red-400 italic text-xs">Invalid</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        row.frequency
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {row.frequency || row.originalFrequency || "?"}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <span className={`text-xs font-medium ${row.enableReminder ? "text-emerald-600" : "text-gray-400"}`}>
                        {row.enableReminder ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <span className={`text-xs font-medium ${row.requireAttachment ? "text-emerald-600" : "text-gray-400"}`}>
                        {row.requireAttachment ? "Yes" : "No"}
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
      {parsedRows.length === 0 && !isUploading && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No CSV Uploaded</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Export your Google Sheet as a <strong>.csv</strong> file and upload it here.
            The system will validate each row, save templates to <strong>unique_checklist</strong>,
            and (in "Generate Tasks" mode) create recurring checklist tasks based on the working day calendar.
          </p>
          <div className="mt-6 inline-block text-left bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 text-xs font-mono text-muted-foreground">
            <p className="font-semibold text-foreground mb-1 font-sans text-sm">Required CSV columns:</p>
            Department | Given By | Name | Task Description | Start Date | Frequency
            <p className="font-semibold text-foreground mt-2 mb-1 font-sans">Optional:</p>
            Created At | Task ID | End Date | Reminder | Attachment Required | Image | Synced On
          </div>
        </div>
      )}
    </div>
  );
}
