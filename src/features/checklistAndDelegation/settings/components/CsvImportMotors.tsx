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
  "Machine Name": string;
  "Motor Name": string;
  Load: string;
  "Last Work Date": string;
  Date: string;
  Timestamp: string;
  [key: string]: string;
}

interface ParsedMotor {
  id: number;
  machineName: string;
  motorName: string;
  load: string;
  lastWorkDate: string; // ISO
  entryDate: string; // ISO
  createdAt: string; // ISO
  isValid: boolean;
  validationErrors: string[];
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

/** Parse DD/MM/YYYY or DD/MM/YYYY HH:MM:SS into ISO */
function parseDateString(raw: string): string | null {
  const trimmed = raw.trim();
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

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function CsvImportMotors() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedMotors, setParsedMotors] = useState<ParsedMotor[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  // ────────────────────────────────────────
  // Handle CSV file selection
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
          const motors: ParsedMotor[] = results.data.map((row, index) => {
            const errors: string[] = [];

            const machineName = (row["Machine Name"] ?? "").trim();
            if (!machineName) errors.push("Missing machine name");

            const motorName = (row["Motor Name"] ?? "").trim();
            if (!motorName) errors.push("Missing motor name");

            const load = (row["Load"] ?? "").trim();

            const rawLastWorkDate = (row["Last Work Date"] ?? "").trim();
            const lastWorkDate = parseDateString(rawLastWorkDate);
            if (rawLastWorkDate && !lastWorkDate) {
              errors.push(`Invalid Last Work Date: "${rawLastWorkDate}"`);
            }

            const rawEntryDate = (row["Date"] ?? "").trim();
            const entryDate = parseDateString(rawEntryDate);
            if (rawEntryDate && !entryDate) {
              errors.push(`Invalid Date: "${rawEntryDate}"`);
            }

            const rawTimestamp = (row["Timestamp"] ?? "").trim();
            const createdAt = parseDateString(rawTimestamp);

            return {
              id: index + 1,
              machineName,
              motorName,
              load,
              lastWorkDate: lastWorkDate ?? "",
              entryDate: entryDate ?? "",
              createdAt: createdAt ?? new Date().toISOString(),
              isValid: errors.length === 0,
              validationErrors: errors,
            };
          });

          setParsedMotors(motors);
          setIsUploading(false);

          const validCount = motors.filter((m) => m.isValid).length;
          const invalidCount = motors.length - validCount;
          toast.success(
            `Parsed ${motors.length} rows: ${validCount} valid, ${invalidCount} with errors`,
          );
        },
        error: (error) => {
          console.error("CSV Parse error:", error);
          toast.error("Failed to parse CSV file");
          setIsUploading(false);
        },
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  // ────────────────────────────────────────
  // Import motors into Supabase
  // ────────────────────────────────────────
  const handleImport = useCallback(async () => {
    const validMotors = parsedMotors.filter((m) => m.isValid);
    if (validMotors.length === 0) {
      toast.error("No valid motors to import");
      return;
    }

    setIsImporting(true);

    try {
      const dbRows = validMotors.map((m) => ({
        machine_name: m.machineName,
        motor_name: m.motorName,
        load: m.load || null,
        last_work_date: m.lastWorkDate || null,
        entry_date: m.entryDate || null,
        created_at: m.createdAt,
      }));

      // Batch insert in chunks of 500
      const chunkSize = 500;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < dbRows.length; i += chunkSize) {
        const chunk = dbRows.slice(i, i + chunkSize);
        const { error } = await supabase.from("machine_motors").insert(chunk);

        if (error) {
          console.error("Error inserting chunk:", error);
          failCount += chunk.length;
        } else {
          successCount += chunk.length;
        }
      }

      setImportResult({ success: successCount, failed: failCount });

      if (failCount === 0) {
        toast.success(`Successfully imported ${successCount} motor records!`);
      } else {
        toast.warning(`Imported ${successCount} records, ${failCount} failed.`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import motor data");
    } finally {
      setIsImporting(false);
    }
  }, [parsedMotors]);

  // ────────────────────────────────────────
  // Clear & Sample
  // ────────────────────────────────────────
  const handleClear = useCallback(() => {
    setParsedMotors([]);
    setFileName("");
    setImportResult(null);
  }, []);

  const handleDownloadSample = useCallback(() => {
    const sampleData = [
      [
        "Timestamp",
        "Date",
        "Machine Name",
        "Motor Name",
        "Load",
        "Last Work Date",
      ],
      [
        "04/02/2026 18:27:39",
        "01/02/2026",
        "65/18",
        "Pipe65/18 vaccum 3",
        "3hp",
        "02/02/2026",
      ],
      [
        "05/02/2026 18:33:25",
        "05/02/2026",
        "A",
        "Main motor",
        "11.5 kw",
        "05/02/2026",
      ],
    ];
    const csv = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "motor_import_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ────────────────────────────────────────
  // Stats
  // ────────────────────────────────────────
  const validCount = parsedMotors.filter((m) => m.isValid).length;
  const invalidCount = parsedMotors.length - validCount;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
          <h2 className="text-lg font-medium text-foreground">
            Import Machine Motor Data from CSV
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a CSV exported from Google Sheets containing machine motor
            inventory data
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label
              className={`flex items-center gap-3 px-6 py-3 rounded-lg cursor-pointer transition-colors border-2 border-dashed ${
                isUploading
                  ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700"
                  : "border-gray-300 dark:border-neutral-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10"
              }`}
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin text-purple-500" />
              ) : (
                <Upload size={20} className="text-purple-500" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isUploading
                  ? "Processing..."
                  : fileName
                    ? fileName
                    : "Choose Motor CSV File"}
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <Download size={16} />
              Download Sample CSV
            </button>

            {parsedMotors.length > 0 && (
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
                  Import Complete: {importResult.success} records created
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Table */}
      {parsedMotors.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
          <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-foreground">
                Preview ({parsedMotors.length} rows)
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
                  ? "bg-purple-600 text-white hover:bg-purple-700"
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
                  Import {validCount} Valid Records
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
                    Machine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Motor Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Load
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Work Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Entry Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                {parsedMotors.map((motor) => (
                  <tr
                    key={motor.id}
                    className={`${
                      motor.isValid
                        ? "hover:bg-gray-50 dark:hover:bg-neutral-700"
                        : "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20"
                    } transition-colors`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {motor.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {motor.isValid ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <div className="group relative">
                          <XCircle
                            size={18}
                            className="text-red-500 cursor-help"
                          />
                          <div className="absolute z-50 left-6 top-0 hidden group-hover:block w-64 p-2 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg text-xs">
                            {motor.validationErrors.map((err, i) => (
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
                      {motor.machineName || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground dark:text-gray-300 max-w-[200px] truncate">
                      {motor.motorName || (
                        <span className="text-red-400 italic">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                      {motor.load || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                      {motor.lastWorkDate
                        ? new Date(motor.lastWorkDate).toLocaleDateString(
                            "en-IN",
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                      {motor.entryDate
                        ? new Date(motor.entryDate).toLocaleDateString("en-IN")
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
      {parsedMotors.length === 0 && !isUploading && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 p-12 text-center">
          <FileText
            size={48}
            className="mx-auto text-gray-300 dark:text-neutral-600 mb-4"
          />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Motor CSV Uploaded
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Upload a CSV file containing machine motor data. Each row will be
            imported as a motor record linked to a machine.
          </p>
        </div>
      )}
    </div>
  );
}
