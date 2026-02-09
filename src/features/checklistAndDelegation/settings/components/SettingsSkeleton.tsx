"use client";

/**
 * Settings Skeleton Components
 * Non-blocking UI loading states for settings views
 */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Skeleton for user/department table rows
 */
export function SettingsTableSkeleton({
  rows = 10,
  columns = 6,
}: TableSkeletonProps) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="animate-pulse flex gap-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800"
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for form fields
 */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      ))}
      {/* Submit button */}
      <div className="w-32 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg mt-6" />
    </div>
  );
}

/**
 * Skeleton for settings page header
 */
export function SettingsHeaderSkeleton() {
  return (
    <div className="animate-pulse flex justify-between items-center mb-6">
      <div>
        <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="w-28 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  );
}

/**
 * Full settings page skeleton
 */
export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SettingsHeaderSkeleton />

      {/* Tabs skeleton */}
      <div className="animate-pulse flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-24 h-8 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>

      <SettingsTableSkeleton rows={8} columns={5} />
    </div>
  );
}
