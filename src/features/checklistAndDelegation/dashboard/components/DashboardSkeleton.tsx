"use client";

/**
 * Dashboard Skeleton Components
 * Non-blocking UI loading states for dashboard views
 */

interface StatCardSkeletonProps {
  count?: number;
}

/**
 * Skeleton for stat cards (total, completed, pending, overdue)
 */
export function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for task list table
 */
export function TaskListSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
        >
          {/* Task info */}
          <div className="flex-1 space-y-2">
            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex gap-3">
              <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          {/* Status badge */}
          <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for staff performance table
 */
export function StaffTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex gap-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
        >
          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex-1">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for filter dropdowns
 */
export function FiltersSkeleton() {
  return (
    <div className="animate-pulse flex flex-wrap gap-3">
      <div className="w-40 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="w-36 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="w-44 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  );
}

/**
 * Full dashboard page skeleton
 */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse flex justify-between items-center">
        <div>
          <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <FiltersSkeleton />
      </div>

      {/* Stats */}
      <StatCardSkeleton />

      {/* Task list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
        <div className="animate-pulse w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <TaskListSkeleton rows={8} />
      </div>
    </div>
  );
}
