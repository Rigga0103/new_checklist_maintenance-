"use client";

/**
 * Skeleton loading component for filter dropdowns
 * Shows while users list is loading
 */
export function FilterSkeleton() {
  return (
    <div className="animate-pulse flex gap-3">
      {/* Search/Name filter skeleton */}
      <div className="relative">
        <div className="w-48 h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
      </div>

      {/* Frequency filter skeleton */}
      <div className="w-40 h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
    </div>
  );
}

/**
 * Skeleton for tab buttons
 */
export function TabsSkeleton() {
  return (
    <div className="animate-pulse flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700" />
      <div className="w-24 h-10 bg-gray-300 dark:bg-gray-600" />
    </div>
  );
}
