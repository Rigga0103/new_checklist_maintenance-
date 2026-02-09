"use client";

interface ChecklistSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number;
}

/**
 * Skeleton loading component for Checklist table rows
 * Displays animated pulse effect with hover state
 */
export function ChecklistSkeleton({ rows = 10 }: ChecklistSkeletonProps) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
        >
          {/* Checkbox */}
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Task Info */}
          <div className="flex-1 space-y-2">
            {/* Task description */}
            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

            {/* Meta info row */}
            <div className="flex gap-4 pt-1">
              <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>

          {/* Status badge */}
          <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />

          {/* Action button */}
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for loading more checklist items
 */
export function ChecklistLoadMoreSkeleton() {
  return <ChecklistSkeleton rows={3} />;
}

/**
 * Full page skeleton for checklist view
 */
export function ChecklistPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="animate-pulse flex justify-between items-center">
        <div>
          <div className="w-40 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="w-32 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="animate-pulse w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />

      {/* Table skeleton */}
      <ChecklistSkeleton rows={10} />
    </div>
  );
}
