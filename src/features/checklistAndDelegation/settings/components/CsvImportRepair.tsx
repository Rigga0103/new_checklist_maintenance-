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
  "Form Filled By Name"?: string;
  "To Assign Person"?: string;
  "Machine Name"?: string;
  "Issue Detail"?: string;
  "Part Replaced"?: string;
  "Task Start Date"?: string;
  Actual?: string;
  Delay?: string;
  "Work Done"?: string;
  "Photo of Work Done"?: string;
  Status?: string;
  "Vendor Name"?: string;
  "Bill copy"?: string;
  "Bill Amount"?: string;
  Comments?: string;
  Warrenty_start_date?: string;
  Warrenty_end_date?: string;
  work_done_by?: string;
  type_of_work?: string;
  [key: string]: string | undefined;
}

interface ParsedRepairTask {
  rowNum: number;
  csvTaskId: string;
  // DB fields
  createdAt: string;
  formFilledBy: string;
  assignedTo: string;
  machineName: string;
  issueDetail: string;
  partReplaced: string | null;
  taskStartDate: string;
  actualDate: string | null;
  delay: string | null;
  workDone: string | null;
  photoUrl: string | null;
  status: string;
  vendorName: string | null;
  billCopyUrl: string | null;
  billAmount: number | null;
  remarks: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  workDoneBy: string | null;
  typeOfWork: string | null;
  // validation
  isValid: boolean;
  validationErrors: string[];
}

// ────────────────────────────────────────────
// Date helpers — handles all formats seen in CSV
// ────────────────────────────────────────────

/**
 * Parses multiple date formats:
 *  - DD/MM/YYYY HH:MM:SS
 *  - D/M/YYYY, HH:MM:SS  (locale with comma)
 *  - YYYY-MM-DD HH:MM:SS
 *  - YYYY-MM-DDTHH:MM:SS
 *  - DD/MM/YYYY
 *  - YYYY-MM-DD
 */
function parseDateStr(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // D/M/YYYY, HH:MM:SS  or  DD/MM/YYYY, HH:MM:SS  (comma variant)
  const dmyComma = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (dmyComma) {
    const [, d, m, y, hh, mm, ss] = dmyComma;
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

  // YYYY-MM-DD HH:MM:SS or YYYY-MM-DDTHH:MM:SS
  const isoFull = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/,
  );
  if (isoFull) {
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
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "in_progress" || s === "in progress") return "in_progress";
  return "pending";
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function CsvImportRepair() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedTasks, setParsedTasks] = useState<ParsedRepairTask[]>([]);
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setImportResult(null);
      setFileName(file.name);

      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const tasks: ParsedRepairTask[] = results.data.map((row, idx) => {
            const errors: string[] = [];

            // Machine Name (required)
            const machineName = (row["Machine Name"] ?? "").trim();
            if (!machineName) errors.push("Missing Machine Name");

            // Issue Detail (required)
            const issueDetail = (row["Issue Detail"] ?? "").trim();
            if (!issueDetail) errors.push("Missing Issue Detail");

            // Task Start Date (required)
            const rawStart = (row["Task Start Date"] ?? "").trim();
            const taskStartDate = parseDateStr(rawStart);
            if (!rawStart) {
              errors.push("Missing Task Start Date");
            } else if (!taskStartDate) {
              errors.push(`Unrecognised start date: "${rawStart}"`);
            }

            // Created At (Timestamp) — optional, fall back to now
            const rawTs = (row["Timestamp"] ?? "").trim();
            const createdAt = parseDateStr(rawTs) ?? new Date().toISOString();

            // Actual date
            const rawActual = (row["Actual"] ?? "").trim();
            const actualDate = rawActual ? parseDateStr(rawActual) : null;

            // Warranty dates
            const rawWarStart = (row["Warrenty_start_date"] ?? "").trim();
            const warrantyStartDate = rawWarStart
              ? parseDateStr(rawWarStart)
              : null;

            const rawWarEnd = (row["Warrenty_end_date"] ?? "").trim();
            const warrantyEndDate = rawWarEnd
              ? parseDateStr(rawWarEnd)
              : null;

            // Bill Amount
            const rawBill = (row["Bill Amount"] ?? "").trim();
            const billAmount =
              rawBill && !isNaN(Number(rawBill))
                ? parseFloat(rawBill)
                : null;

            return {
              rowNum: idx + 1,
              csvTaskId: (row["Task ID"] ?? "").trim(),
              createdAt,
              formFilledBy: (row["Form Filled By Name"] ?? "").trim(),
              assignedTo: (row["To Assign Person"] ?? "").trim(),
              machineName,
              issueDetail,
              partReplaced: (row["Part Replaced"] ?? "").trim() || null,
              taskStartDate: taskStartDate ?? "",
              actualDate,
              delay: (row["Delay"] ?? "").trim() || null,
              workDone: (row["Work Done"] ?? "").trim() || null,
              photoUrl: (row["Photo of Work Done"] ?? "").trim() || null,
              status: normalizeStatus(row["Status"] ?? ""),
              vendorName: (row["Vendor Name"] ?? "").trim() || null,
              billCopyUrl: (row["Bill copy"] ?? "").trim() || null,
              billAmount,
              remarks: (row["Comments"] ?? "").trim() || null,
              warrantyStartDate,
              warrantyEndDate,
              workDoneBy: (row["work_done_by"] ?? "").trim() || null,
              typeOfWork: (row["type_of_work"] ?? "").trim() || null,
              isValid: errors.length === 0,
              validationErrors: errors,
            };
          });

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
    setProgress({ step: "Preparing rows…", pct: 10 });

    try {
      const rows = valid.map((t) => ({
        created_at: t.createdAt,
        form_filled_by: t.formFilledBy || null,
        assigned_to: t.assignedTo || null,
        machine_name: t.machineName,
        issue_detail: t.issueDetail,
        part_replaced: t.partReplaced,
        task_start_date: t.taskStartDate,
        actual_date: t.actualDate,
        delay: t.delay,
        work_done: t.workDone,
        photo_url: t.photoUrl,
        status: t.status,
        vendor_name: t.vendorName,
        bill_copy_url: t.billCopyUrl,
        bill_amount: t.billAmount,
        remarks: t.remarks,
        warranty_start_date: t.warrantyStartDate,
        warranty_end_date: t.warrantyEndDate,
        Work_Done_By: t.workDoneBy,
        Type_of_Work: t.typeOfWork,
      }));

      const CHUNK = 200;
      let inserted = 0;
      let failed = 0;

      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { error } = await supabase.from("machine_repair").insert(chunk);
        if (error) {
          console.error("Repair insert error:", error);
          failed += chunk.length;
        } else {
          inserted += chunk.length;
        }
        setProgress({
          step: `Inserting… (${inserted + failed} / ${rows.length})`,
          pct: 10 + Math.round(((inserted + failed) / rows.length) * 85),
        });
      }

      setProgress({ step: "Done", pct: 100 });
      setImportResult({ inserted, failed });

      if (failed === 0) {
        toast.success(`Successfully imported ${inserted} repair tasks!`);
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
      "Form Filled By Name",
      "To Assign Person",
      "Machine Name",
      "Issue Detail",
      "Part Replaced",
      "Task Start Date",
      "Actual",
      "Delay",
      "Work Done",
      "Photo of Work Done",
      "Status",
      "Vendor Name",
      "Bill copy",
      "Bill Amount",
      "Comments",
      "Warrenty_start_date",
      "Warrenty_end_date",
      "work_done_by",
      "type_of_work",
    ];
    const sample = [
      "05/01/2025 00:00:00",
      "147",
      "Pratap Kumar Rout",
      "Pratap Kumar Rout",
      "65/18 Extruder Machine",
      "Sudden Stop",
      "4 medal Repair",
      "05/01/2025 00:00:00",
      "2025-01-05 00:00:00",
      "",
      "New change",
      "",
      "completed",
      "",
      "",
      "",
      "",
      "",
      "",
      "Pratap",
      "in_house",
    ];
    const csv = [headers.join(","), sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repair_import_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const validCount = parsedTasks.filter((t) => t.isValid).length;
  const invalidCount = parsedTasks.length - validCount;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      in_progress:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    };
    return (
      <span
        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[status] ?? map.pending}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
          <h2 className="text-lg font-medium text-foreground">
            Import Repair Tasks from CSV
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your Google Sheets repair log CSV. All fields — status,
            vendor, bill amount, warranty dates, and photos — are preserved
            as-is.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Button row */}
          <div className="flex flex-wrap items-center gap-4">
            <label
              className={`flex items-center gap-3 px-6 py-3 rounded-lg cursor-pointer transition-colors border-2 border-dashed ${
                isUploading
                  ? "border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700"
                  : "border-gray-300 dark:border-neutral-600 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10"
              }`}
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin text-rose-500" />
              ) : (
                <Upload size={20} className="text-rose-500" />
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
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
                  className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Result */}
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
                      <strong className="text-foreground">machine_repair</strong>
                      :{" "}
                      <strong className="text-green-700 dark:text-green-400">
                        {importResult.inserted}
                      </strong>
                    </li>
                    {importResult.failed > 0 && (
                      <li className="text-orange-600 dark:text-orange-400">
                        Failed rows: {importResult.failed} (check browser
                        console)
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Column mapping hint */}
          {parsedTasks.length === 0 && !isUploading && (
            <div className="mt-2 p-4 rounded-lg bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800">
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 mb-2">
                Expected CSV columns
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs text-rose-700 dark:text-rose-400">
                {[
                  "Timestamp",
                  "Task ID",
                  "Form Filled By Name",
                  "To Assign Person",
                  "Machine Name ✱",
                  "Issue Detail ✱",
                  "Part Replaced",
                  "Task Start Date ✱",
                  "Actual",
                  "Delay",
                  "Work Done",
                  "Photo of Work Done",
                  "Status",
                  "Vendor Name",
                  "Bill copy",
                  "Bill Amount",
                  "Comments",
                  "Warrenty_start_date",
                  "Warrenty_end_date",
                  "work_done_by",
                  "type_of_work",
                ].map((col) => (
                  <span key={col} className="truncate">
                    • {col}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-rose-600 dark:text-rose-500">
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
                  ? "bg-rose-600 text-white hover:bg-rose-700"
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
                    "Machine Name",
                    "Assigned To",
                    "Issue Detail",
                    "Part Replaced",
                    "Start Date",
                    "Actual Date",
                    "Status",
                    "Vendor",
                    "Bill Amt",
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
                        <CheckCircle2 size={16} className="text-green-500" />
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
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-900 dark:text-white max-w-36 truncate">
                      {task.machineName || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.assignedTo || "—"}
                    </td>
                    <td className="px-4 py-2.5 max-w-44 truncate text-muted-foreground">
                      {task.issueDetail || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-32 truncate text-muted-foreground">
                      {task.partReplaced || "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.taskStartDate
                        ? new Date(task.taskStartDate).toLocaleDateString(
                            "en-IN",
                          )
                        : <span className="text-red-400 italic">Invalid</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.actualDate
                        ? new Date(task.actualDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {statusBadge(task.status)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground max-w-28 truncate">
                      {task.vendorName || "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {task.billAmount != null
                        ? `₹${task.billAmount.toLocaleString("en-IN")}`
                        : "—"}
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
            Upload the repair log CSV exported from Google Sheets. The importer
            supports all date formats used in the export and preserves vendor
            info, bill amounts, warranty dates, work-done-by, and type of work.
          </p>
        </div>
      )}
    </div>
  );
}
