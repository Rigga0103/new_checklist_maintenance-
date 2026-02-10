"use client";

interface QuickTaskSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number;
}

/**
 * Skeleton loading component for QuickTask table rows
 * Displays animated pulse effect matching table structure
 */
export function QuickTaskSkeleton({ rows = 10 }: QuickTaskSkeletonProps) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800"
        >
          {/* Checkbox placeholder */}
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Department */}
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Given By */}
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Name */}
          <div className="w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Task Description */}
          <div className="flex-1 min-w-48">
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>

          {/* Start Date */}
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* End Date */}
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Frequency */}
          <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />

          {/* Reminders */}
          <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Attachment */}
          <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded" />

          {/* Actions */}
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for loading more rows during pagination
 */
export function QuickTaskLoadMoreSkeleton() {
  return <QuickTaskSkeleton rows={3} />;
}
