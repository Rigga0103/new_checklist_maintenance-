"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import {
  fetchHolidaysForYearApi,
  fetchWorkingDayCountForDateApi,
  initializeWorkingCalendarApi,
} from "../server/api/settingApi";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function previewCount(fromDate: string, skipSunday: boolean, holidays: string[]): number {
  const holidaySet = new Set(holidays);
  const [y, m, d] = fromDate.split("-").map(Number);
  let count = 0;
  const cursor = new Date(y, m - 1, d);
  while (cursor.getFullYear() === y) {
    const dow = cursor.getDay();
    if (!(skipSunday && dow === 0)) {
      const iso = cursor.toISOString().split("T")[0];
      if (!holidaySet.has(iso)) count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function countSundaysFromDate(fromDate: string): number {
  const [y, m, d] = fromDate.split("-").map(Number);
  let count = 0;
  const cursor = new Date(y, m - 1, d);
  while (cursor.getFullYear() === y) {
    if (cursor.getDay() === 0) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export default function WorkingDayCalendarSetup() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [fromMonth, setFromMonth] = useState(today.getMonth() + 1);
  const [fromDay, setFromDay] = useState(1);
  const [skipSunday, setSkipSunday] = useState(true);

  const [holidays, setHolidays] = useState<string[]>([]);
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ inserted: 0, total: 0 });
  const [insertedCount, setInsertedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Clamp day when year/month changes
  const maxDay = daysInMonth(selectedYear, fromMonth);
  const safeDay = Math.min(fromDay, maxDay);

  const fromDate = toIso(selectedYear, fromMonth, safeDay);

  // Day options for selected month
  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay],
  );

  const loadMeta = useCallback(async (date: string) => {
    const year = parseInt(date.split("-")[0], 10);
    setLoadingMeta(true);
    setStatus("idle");
    try {
      const [hols, count] = await Promise.all([
        fetchHolidaysForYearApi(year),
        fetchWorkingDayCountForDateApi(date),
      ]);
      setHolidays(hols);
      setExistingCount(count);
    } catch {
      toast.error("Failed to load calendar data.");
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    loadMeta(fromDate);
  }, [fromDate, loadMeta]);

  const holidaysInRange = useMemo(
    () =>
      holidays.filter((h) => {
        const [hy, hm, hd] = h.split("-").map(Number);
        const [fy, fm, fd] = fromDate.split("-").map(Number);
        return new Date(hy, hm - 1, hd) >= new Date(fy, fm - 1, fd);
      }),
    [holidays, fromDate],
  );

  const expectedDays = useMemo(
    () => previewCount(fromDate, skipSunday, holidays),
    [fromDate, skipSunday, holidays],
  );

  const sundaysInRange = useMemo(() => countSundaysFromDate(fromDate), [fromDate]);

  const rangeLabel = useMemo(() => {
    const end = `Dec 31, ${selectedYear}`;
    const start = `${MONTH_NAMES[fromMonth - 1]} ${safeDay}, ${selectedYear}`;
    return `${start} → ${end}`;
  }, [selectedYear, fromMonth, safeDay]);

  const handleInitialize = useCallback(async () => {
    const msg =
      existingCount && existingCount > 0
        ? `This will replace ${existingCount} existing entries from ${rangeLabel} with ${expectedDays} new entries. Continue?`
        : `This will create ${expectedDays} working day entries for ${rangeLabel}. Continue?`;

    if (!confirm(msg)) return;

    setStatus("running");
    setProgress({ inserted: 0, total: expectedDays });
    setErrorMsg("");

    try {
      const inserted = await initializeWorkingCalendarApi(
        fromDate,
        skipSunday,
        (ins, tot) => setProgress({ inserted: ins, total: tot }),
      );
      setInsertedCount(inserted);
      setStatus("done");
      setExistingCount(inserted);
      toast.success(`Successfully created ${inserted} working days.`);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "An unexpected error occurred.");
      toast.error("Failed to initialize calendar.");
    }
  }, [fromDate, skipSunday, expectedDays, existingCount, rangeLabel]);

  const formatDate = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}-${m}`;
  };

  const isRunning = status === "running";

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <Info size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Setup Working Day Calendar</p>
          <p>
            Choose a start date. Working days from that date to December 31 of the selected year
            will be generated. Sundays and holidays are automatically excluded. Any existing entries
            in that range will be replaced.
          </p>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-500" />
          <h2 className="text-lg font-semibold text-foreground">Calendar Configuration</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls Row */}
          <div className="flex flex-wrap items-end gap-4">

            {/* Year */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={isRunning}
                className="px-3 py-2.5 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* From Month */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                From Month
              </label>
              <select
                value={fromMonth}
                onChange={(e) => {
                  setFromMonth(Number(e.target.value));
                  setFromDay(1);
                }}
                disabled={isRunning}
                className="px-3 py-2.5 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            {/* From Day */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                From Day
              </label>
              <select
                value={safeDay}
                onChange={(e) => setFromDay(Number(e.target.value))}
                disabled={isRunning}
                className="px-3 py-2.5 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {dayOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Skip Sunday toggle */}
            <div className="flex items-center gap-3 pb-0.5">
              <div
                onClick={() => !isRunning && setSkipSunday((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors select-none ${
                  skipSunday ? "bg-blue-600" : "bg-gray-300 dark:bg-neutral-600"
                } ${isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    skipSunday ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-foreground select-none">Skip Sundays</span>
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadMeta(fromDate)}
              disabled={loadingMeta || isRunning}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={loadingMeta ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Range label */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays size={14} className="text-blue-500" />
            <span className="text-muted-foreground">Range:</span>
            <span className="font-semibold text-foreground">{rangeLabel}</span>
          </div>

          {/* Stats */}
          {loadingMeta ? (
            <div className="flex items-center gap-3 py-2 text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{expectedDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Working days to generate</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{holidaysInRange.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Holidays excluded</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-500">
                  {skipSunday ? sundaysInRange : 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sundays excluded</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${existingCount ? "text-yellow-600" : "text-gray-400"}`}>
                  {existingCount ?? "–"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Existing entries in range</p>
              </div>
            </div>
          )}

          {/* Holidays in range */}
          {!loadingMeta && holidaysInRange.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Holidays excluded in range ({holidaysInRange.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {holidaysInRange.map((h) => (
                  <span
                    key={h}
                    className="px-2 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded text-xs"
                  >
                    {formatDate(h)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!loadingMeta && holidaysInRange.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No holidays in this range. Add them in the <strong>Holiday List</strong> tab to exclude them.
            </p>
          )}

          {/* Initialize Button */}
          <div className="pt-2 border-t border-gray-100 dark:border-neutral-700">
            <button
              onClick={handleInitialize}
              disabled={isRunning || loadingMeta || expectedDays === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
              {isRunning ? "Initializing…" : `Initialize Calendar`}
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-blue-100 dark:border-blue-900 p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Inserting working days…</span>
            <span className="text-muted-foreground">{progress.inserted} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress.total > 0 ? (progress.inserted / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Success */}
      {status === "done" && (
        <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div className="text-sm text-green-800 dark:text-green-300">
            <p className="font-semibold">Calendar initialized successfully!</p>
            <p className="mt-0.5">
              <strong>{insertedCount}</strong> working days created for{" "}
              <strong>{rangeLabel}</strong>.{" "}
              {skipSunday ? `${sundaysInRange} Sundays` : "No Sundays"} and{" "}
              {holidaysInRange.length} holiday{holidaysInRange.length !== 1 ? "s" : ""} were excluded.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <AlertTriangle size={18} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-300">
            <p className="font-semibold">Initialization failed</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
