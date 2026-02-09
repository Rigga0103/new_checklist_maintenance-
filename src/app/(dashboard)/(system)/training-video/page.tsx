"use client";

import { Video } from "lucide-react";

export default function TrainingVideoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Training Videos
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Watch training videos to learn how to use the system
        </p>
      </div>

      <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700 text-center">
        <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Training Videos Coming Soon
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          This feature is being migrated from the legacy codebase.
        </p>
      </div>
    </div>
  );
}
