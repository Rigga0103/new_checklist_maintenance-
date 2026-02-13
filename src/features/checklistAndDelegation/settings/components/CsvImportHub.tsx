"use client";

import { useState } from "react";
import { Wrench, Cog, ClipboardList, FileCheck, ArrowLeft } from "lucide-react";
import CsvImportMaintenance from "./CsvImportMaintenance";
import CsvImportMotors from "./CsvImportMotors";

// ────────────────────────────────────────────
// Import categories config — add new ones here
// ────────────────────────────────────────────

type ImportCategory = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string; // tailwind bg class
  hoverColor: string;
  borderColor: string;
  iconBg: string;
  component: React.ReactNode;
};

const IMPORT_CATEGORIES: ImportCategory[] = [
  {
    id: "maintenance",
    label: "Maintenance Tasks",
    description: "Import recurring maintenance tasks from CSV",
    icon: <Wrench size={28} />,
    color: "bg-blue-50 dark:bg-blue-900/20",
    hoverColor:
      "hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    component: <CsvImportMaintenance />,
  },
  {
    id: "motors",
    label: "Machine Motors",
    description: "Import machine motor inventory data from CSV",
    icon: <Cog size={28} />,
    color: "bg-purple-50 dark:bg-purple-900/20",
    hoverColor:
      "hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:border-purple-400",
    borderColor: "border-purple-200 dark:border-purple-800",
    iconBg:
      "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
    component: <CsvImportMotors />,
  },
  {
    id: "delegation",
    label: "Delegation Tasks",
    description: "Coming soon — Import delegation tasks from CSV",
    icon: <ClipboardList size={28} />,
    color: "bg-amber-50 dark:bg-amber-900/20",
    hoverColor:
      "hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800",
    iconBg:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
    component: null, // not yet implemented
  },
  {
    id: "checklist",
    label: "Checklist Tasks",
    description: "Coming soon — Import checklist tasks from CSV",
    icon: <FileCheck size={28} />,
    color: "bg-emerald-50 dark:bg-emerald-900/20",
    hoverColor:
      "hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    iconBg:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
    component: null, // not yet implemented
  },
];

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export default function CsvImportHub() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const activeImport = IMPORT_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      {!activeCategory && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
          <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">
              CSV Data Import
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select the type of data you want to import from a CSV file
            </p>
          </div>

          {/* Category Cards Grid */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {IMPORT_CATEGORIES.map((category) => {
              const isAvailable = category.component !== null;

              return (
                <button
                  key={category.id}
                  onClick={() => isAvailable && setActiveCategory(category.id)}
                  disabled={!isAvailable}
                  className={`
                    relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 text-center
                    ${category.color} ${category.borderColor}
                    ${
                      isAvailable
                        ? `${category.hoverColor} cursor-pointer hover:shadow-md hover:-translate-y-0.5`
                        : "opacity-60 cursor-not-allowed"
                    }
                  `}
                >
                  {/* Coming soon badge */}
                  {!isAvailable && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-200 dark:bg-neutral-600 text-gray-600 dark:text-neutral-300">
                      SOON
                    </span>
                  )}

                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${category.iconBg}`}
                  >
                    {category.icon}
                  </div>

                  {/* Label */}
                  <h3 className="text-sm font-semibold text-foreground">
                    {category.label}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Import Section */}
      {activeCategory && activeImport && (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={() => setActiveCategory(null)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Import Options
          </button>

          {/* Render the selected importer */}
          {activeImport.component}
        </div>
      )}
    </div>
  );
}
