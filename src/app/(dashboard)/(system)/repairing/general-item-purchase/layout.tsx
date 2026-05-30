"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, FileText, ShieldCheck, Clock, CheckSquare } from "lucide-react";

interface SubTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const subTabs: SubTab[] = [
  {
    href: "/repairing/general-item-purchase/item-request-form",
    label: "Item Request Form",
    icon: FileText,
  },
  {
    href: "/repairing/general-item-purchase/approval",
    label: "Approval",
    icon: ShieldCheck,
  },
  {
    href: "/repairing/general-item-purchase/pending-purchase",
    label: "Pending Purchase",
    icon: Clock,
  },
  {
    href: "/repairing/general-item-purchase/completed-list",
    label: "Completed List",
    icon: CheckSquare,
  },
];

export default function GeneralItemPurchaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between border-b border-neutral-100 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 dark:bg-green-950/30 rounded-xl text-green-600 dark:text-green-400 shadow-sm transition-transform duration-300 hover:scale-105">
            <ShoppingCart className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              General Item Purchase
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage requests, approvals, pending purchases, and historical purchase data.
            </p>
          </div>
        </div>
      </div>

      {/* Sleek Horizontal Tab Navigation */}
      <div className="border-b border-neutral-200 dark:border-zinc-800">
        <nav className="flex space-x-1 -mb-px overflow-x-auto pb-1 md:pb-0 scrollbar-none" aria-label="Tabs">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-200 rounded-t-lg ${isActive
                  ? "border-green-600 text-green-600 dark:border-green-400 dark:text-green-400 bg-green-50/30 dark:bg-green-950/10 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-neutral-300 dark:hover:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-900/50"
                  }`}
              >
                <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content Area with smooth transition */}
      <div className="w-full transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
        {children}
      </div>
    </div>
  );
}
