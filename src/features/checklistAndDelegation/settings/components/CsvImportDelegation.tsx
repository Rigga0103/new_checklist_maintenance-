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

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface CsvRow {
  Timestamp?: string;
  "Task ID"?: string;
  Department?: string;
  "Given By"?: string;
  Name?: string;
  "Task Description"?: string;
  "Task Start Date"?: string;
  Freq?: string;
  "Enable Reminders"?: string;
  "Require Attachment"?: string;
  "Planned Date"?: string;
  Actual?: string;
  Delay?: string;
  Status?: string;
  Remarks?: string;
  "Update Date"?: string;
  "Color Code For"?: string;
  [key: string]: string | undefined;
}

interface ParsedDelegationTask {
  rowNum: number;
  // raw CSV task ID for reference only
  csvTaskId: string;
  createdAt: string;
  department: string;
  givenBy: string;
  name: string;
  taskDescription: string;
  taskStartDate: string;
  frequency: string;
  enableReminder: string;
  requireAttachment: string;
  plannedDate: string | null;
  submissionDate: string | null;
  delay: string | null;
  status: string;
  remarks: string | null;
  updatedAt: string | null;
  colorCodeFor: number | null;
  // validation
  isValid: boolean;
  validationErrors: string[];
  // warnings (non-blocking)
  warnings: string[];
}

// ────────────────────────────────────────────
// Date helpers
// ────────────────────────────────────────────

/** Parse DD/MM/YYYY HH:MM:SS, DD/MM/YYYY, or YYYY-MM-DD HH:MM:SS → ISO string */
function parseDateStr(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // DD/MM/YYYY HH:MM:SS
  const dmyTime = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (dmyTime) {
    const [, d, m, y, hh, mm, ss] = dmyTime;
    const dt = new Date(+y, +m - 1, +d, +hh, +mm, +ss);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const dt = new Date(+y, +m - 1, +d);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  // YYYY-MM-DD HH:MM:SS  or  YYYY-MM-DDTHH:MM:SS
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/);
  if (iso) {
    const dt = new Date(s.replace(" ", "T"));
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  // YYYY-MM-DD
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  return null;
}

function normalizeStatus(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === "done") return "done";
  if (s === "extend") return "extend";
  return "pending";
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function CsvImportDelegation() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedTasks, setParsedTasks] = useState<ParsedDelegationTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState({ step: "", pct: 0 });
  const [importResult, setImportResult] = useState<{
    inserted: number;
    failed: number;
  } | null>(null);

  // ────────────────────────────────────────
  // Parse CSV
  // ────────────────────────────────────────
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setImportResult(null);
      setFileName(file.name);

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const tasks: ParsedDelegationTask[] = results.data.map(
            (row, idx) => {
              const errors: string[] = [];
              const warnings: string[] = [];

              // Required: Name
              const name = (row["Name"] ?? "").trim();
              if (!name) errors.push("Missing Name");

              // Required: Task Description
              const taskDescription = (row["Task Description"] ?? "").trim();
              if (!taskDescription) errors.push("Missing Task Description");

              // Required: Task Start Date
              const rawStartDate = (row["Task Start Date"] ?? "").trim();
              const taskStartDate = parseDateStr(rawStartDate);
              if (!rawStartDate) {
                errors.push("Missing Task Start Date");
              } else if (!taskStartDate) {
                errors.push(`Unrecognised date: "${rawStartDate}"`);
              }

              // Optional with fallback: Created At
              const rawTimestamp = (row["Timestamp"] ?? "").trim();
              const createdAt =
                parseDateStr(rawTimestamp) ?? new Date().toISOString();

              // Planned Date (optional)
              const rawPlanned = (row["Planned Date"] ?? "").trim();
              const plannedDate = rawPlanned ? parseDateStr(rawPlanned) : null;
              if (rawPlanned && !plannedDate) {
                warnings.push(`Planned date not parsed: "${rawPlanned}"`);
              }

              // Submission Date / Actual (optional)
              const rawActual = (row["Actual"] ?? "").trim();
              const submissionDate = rawActual ? parseDateStr(rawActual) : null;

              // Updated At (optional)
              const rawUpdated = (row["Update Date"] ?? "").trim();
              const updatedAt = rawUpdated ? parseDateStr(rawUpdated) : null;

              // Color Code For (optional numeric)
              const rawColor = (row["Color Code For"] ?? "").trim();
              const colorCodeFor =
                rawColor && !isNaN(Number(rawColor))
                  ? parseInt(rawColor, 10)
                  : null;

              // Status
              const status = normalizeStatus(row["Status"] ?? "");

              // Delay – keep as-is (string)
              const delay = (row["Delay"] ?? "").trim() || null;

              // Remarks
              const remarks = (row["Remarks"] ?? "").trim() || null;

              return {
                rowNum: idx + 1,
                csvTaskId: (row["Task ID"] ?? "").trim(),
                createdAt,
                department: (row["Department"] ?? "").trim(),
                givenBy: (row["Given By"] ?? "").trim(),
                name,
                taskDescription,
                taskStartDate: taskStartDate ?? "",
                frequency: (row["Freq"] ?? "one-time").trim().toLowerCase() || "one-time",
                enableReminder: (row["Enable Reminders"] ?? "yes")
                  .trim()
                  .toLowerCase() === "yes"
                  ? "yes"
                  : "no",
                requireAttachment:
                  (row["Require Attachment"] ?? "no")
                    .trim()
                    .toLowerCase() === "yes"
                    ? "yes"
                    : "no",
                plannedDate,
                submissionDate,
                delay,
                status,
                remarks,
                updatedAt,
                colorCodeFor,
                isValid: errors.length === 0,
                validationErrors: errors,
                warnings,
              };
            },
          );

          setParsedTasks(tasks);
          setIsUploading(false);

          const validCount = tasks.filter((t) => t.isValid).length;
          toast.success(
            `Parsed ${tasks.length} rows — ${validCount} valid, ${tasks.length - validCount} with errors`,
          );
        },
        error: () => {
          toast.error("Failed to parse CSV");
          setIsUploading(false);
        },
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  // ────────────────────────────────────────
  // Import
  // ────────────────────────────────────────
  const handleImport = useCallback(async () => {
    const valid = parsedTasks.filter((t) => t.isValid);
    if (valid.length === 0) {
      toast.error("No valid tasks to import");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setProgress({ step: "Resolving user IDs…", pct: 10 });

    try {
      // Resolve user IDs for assignee + given_by
      const allNames = [
        ...new Set(
          valid.flatMap((t) =>
            [t.name, t.givenBy].filter(Boolean),
          ) as string[],
        ),
      ];
      const { data: userData } = await supabase
        .from("users")
        .select("id, user_name")
        .in("user_name", allNames);

      const userIdMap = new Map<string, number>(
        (userData ?? []).map((u) => [
          u.user_name.trim().toLowerCase(),
          u.id,
        ]),
      );

      setProgress({ step: "Inserting delegation tasks…", pct: 30 });

      const rows = valid.map((t) => ({
        created_at: t.createdAt,
        department: t.department || null,
        given_by: t.givenBy || null,
        name: t.name,
        task_description: t.taskDescription,
        task_start_date: t.taskStartDate,
        frequency: t.frequency,
        enable_reminder: t.enableReminder,
        require_attachment: t.requireAttachment,
        planned_date: t.plannedDate,
        submission_date: t.submissionDate,
        delay: t.delay,
        status: t.status,
        remarks: t.remarks,
        updated_at: t.updatedAt,
        color_code_for: t.colorCodeFor,
        assignee_user_id:
          userIdMap.get(t.name.trim().toLowerCase()) ?? null,
        created_by_user_id: t.givenBy
          ? (userIdMap.get(t.givenBy.trim().toLowerCase()) ?? null)
          : null,
      }));

      // Batch insert in chunks of 200
      const CHUNK = 200;
      let inserted = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { error } = await supabase.from("delegation").insert(chunk);
        if (error) {
          console.error("Delegation insert error:", error);
          failed += chunk.length;
        } else {
          inserted += chunk.length;
        }
        setProgress({
          step: `Inserting… (${inserted + failed} / ${rows.length})`,
          pct:
            30 +
            Math.round(((inserted + failed) / rows.length) * 65),
        });
      }

      setProgress({ step: "Done", pct: 100 });
      setImportResult({ inserted, failed });

      if (failed === 0) {
        toast.success(
          `Successfully imported ${inserted} delegation tasks!`,
        );
      } else {
        toast.warning(
          `Imported ${inserted} tasks. ${failed} failed — check console.`,
        );
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error((err as Error)?.message ?? "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [parsedTasks]);

  const handleClear = useCallback(() => {
    setParsedTasks([]);
    setFileName("");
    setImportResult(null);
    setProgress({ step: "", pct: 0 });
  }, []);

  const handleDownloadSample = useCallback(() => {
    const headers = [
      "Timestamp",
      "Task ID",
      "Department",
      "Given By",
      "Name",
      "Task Description",
      "Task Start Date",
      "Freq",
      "Enable Reminders",
      "Require Attachment",
      "Planned Date",
      "Actual",
      "Delay",
      "Status",
      "Remarks",
      "Update Date",
      "Color Code For",
    ];
    const sample = [
      "25/10/2025 21:00:00",
      "312",
      "Injection Molding",
      "MD Sir",
      "Pratap Kumar Rout",
      "Die repair wonn knob",
      "25/10/2025 21:00:00",
      "one-time",
      "yes",
      "no",
      "08/04/2026 00:00:00",
      "07/04/2026 12:22:47",
      "163 days 15:22:46",
      "done",
      "",
      "07/04/2026 12:22:47",
      "18",
    ];
    const csv = [headers.join(","), sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delegation_import_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const validCount = parsedTasks.filter((t) => t.isValid).length;
  const invalidCount = parsedTasks.length - validCount;

  const statusBadge = (status: string) => {
    if (status === "done")
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          done
        </span>
      );
    if (status === "extend")
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
          extend
        </span>
      );
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
          <h2 className="text-lg font-medium text-foreground">
            Import Delegation Tasks from CSV
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your Google Sheets CSV export. All fields — including status,
            planned date, and actual completion date — will be preserved exactly
            as exported.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Buttons row */}
          <div className="flex flex-wrap items-center gap-4">
            <label
              className={`flex items-center gap-3 px-6 py-3 rounded-lg cursor-pointer transition-colors border-2 border-dashed ${
                isUploading
                  ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
                  : "border-gray-300 dark:border-neutral-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10"
              }`}
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin text-amber-500" />
              ) : (
                <Upload size={20} className="text-amber-500" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isUploading
                  ? "Processing…"
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
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

          {/* Progress bar */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.step}</span>
                <span>{progress.pct}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div
              className={`p-4 rounded-lg border ${
                importResult.failed === 0
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
              }`}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2
                  size={18}
                  className="text-green-600 mt-0.5 shrink-0"
                />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">
                    Import Complete
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <li>
                      Tasks inserted into{" "}
                      <strong className="text-foreground">delegation</strong>:{" "}
                      <strong className="text-green-700 dark:text-green-400">
                        {importResult.inserted}
                      </strong>
                    </li>
                    {importResult.failed > 0 && (
                      <li className="text-orange-600 dark:text-orange-400">
                        Failed rows: {importResult.failed} (check browser
                        console for details)
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Column mapping info */}
          {parsedTasks.length === 0 && !isUploading && (
            <div className="mt-2 p-4 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
                Expected CSV columns
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs text-amber-700 dark:text-amber-400">
                {[
                  "Timestamp",
                  "Task ID",
                  "Department",
                  "Given By",
                  "Name ✱",
                  "Task Description ✱",
                  "Task Start Date ✱",
                  "Freq",
                  "Enable Reminders",
                  "Require Attachment",
                  "Planned Date",
                  "Actual",
                  "Delay",
                  "Status",
                  "Remarks",
                  "Update Date",
                  "Color Code For",
                ].map((col) => (
                  <span key={col} className="truncate">
                    • {col}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                ✱ Required. All other columns are optional.
              </p>
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
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-gray-300 dark:bg-neutral-600 text-gray-500 dark:text-neutral-400 cursor-not-allowed"
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing…
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
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                <tr>
                  {[
                    "#",
                    "OK",
                    "CSV ID",
                    "Department",
                    "Name",
                    "Task Description",
                    "Start Date",
                    "Planned Date",
                    "Actual Date",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                {parsedTasks.map((task) => (
                  <tr
                    key={task.rowNum}
                    className={`${
                      task.isValid
                        ? "hover:bg-gray-50 dark:hover:bg-neutral-700"
                        : "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                    } transition-colors`}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.rowNum}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {task.isValid ? (
                        <CheckCircle2
                          size={16}
                          className="text-green-500"
                        />
                      ) : (
                        <div className="group relative inline-block">
                          <XCircle
                            size={16}
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
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.csvTaskId || "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {task.department || (
                        <span className="text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {task.name || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-52 truncate text-muted-foreground">
                      {task.taskDescription || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.taskStartDate
                        ? new Date(task.taskStartDate).toLocaleDateString(
                            "en-IN",
                          )
                        : <span className="text-red-400 italic">Invalid</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.plannedDate
                        ? new Date(task.plannedDate).toLocaleDateString(
                            "en-IN",
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.submissionDate
                        ? new Date(task.submissionDate).toLocaleDateString(
                            "en-IN",
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {statusBadge(task.status)}
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
            Upload the CSV exported from Google Sheets. The importer will
            preserve all fields including status (pending / done / extend),
            planned dates, actual completion dates, and delay information.
          </p>
        </div>
      )}
    </div>
  );
}
