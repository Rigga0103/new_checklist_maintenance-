"use client";

/**
 * Repairing Dashboard Skeleton Components
 * Non-blocking UI loading states matching the dashboard layout
 */

/** Skeleton for the header + search bar */
export function HeaderSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="w-72 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="w-56 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="w-full md:w-72 h-11 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}

/** Skeleton for filter bar */
export function FilterBarSkeleton() {
  return (
    <div className="animate-pulse p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
      <div className="flex flex-wrap items-end gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="w-16 h-3.5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-36 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for stat cards */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${count === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse p-5 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for section heading */
export function SectionHeadingSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3">
      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

/** Skeleton for data table */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <div className="animate-pulse px-6 py-4 border-b border-gray-100 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700 flex justify-between items-center">
        <div className="w-40 h-6 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="w-20 h-6 bg-gray-200 dark:bg-gray-600 rounded-full" />
      </div>
      {/* Table rows */}
      <div className="divide-y divide-gray-100 dark:divide-neutral-700">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse flex items-center gap-4 px-5 py-4"
          >
            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for chart cards */
export function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-48 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-full h-[300px] bg-gray-100 dark:bg-neutral-700 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Full repairing dashboard page skeleton */
export function RepairingDashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <FilterBarSkeleton />

      {/* Repair stats section */}
      <div className="space-y-4">
        <SectionHeadingSkeleton />
        <StatCardsSkeleton count={4} />
      </div>

      {/* Maintenance stats section */}
      <div className="space-y-4">
        <SectionHeadingSkeleton />
        <StatCardsSkeleton count={5} />
      </div>

      {/* Table */}
      <TableSkeleton rows={6} />

      {/* Charts */}
      <ChartsSkeleton />
    </div>
  );
}
