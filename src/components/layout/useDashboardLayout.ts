"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ThemeMode, DataCategory, UserInfo } from "./types";

interface Route {
  href: string;
  label: string;
  icon: string;
  submenu?: boolean;
  showFor: readonly ("admin" | "user")[];
  children?: Route[];
}

const routes: Route[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "Home",
    showFor: ["admin", "user"] as const,
  },
  {
    href: "/assign-task",
    label: "Assign Task",
    icon: "CheckSquare",
    showFor: ["admin", "user"] as const,
  },
  {
    href: "/delegation",
    label: "Delegation",
    icon: "ClipboardList",
    showFor: ["admin", "user"] as const,
  },
  {
    href: "/quick-task",
    label: "Quick Task",
    icon: "Zap",
    showFor: ["admin"] as const,
  },
  {
    href: "/checklist",
    label: "Checklist",
    icon: "ClipboardList",
    showFor: ["admin", "user"] as const,
  },
  {
    href: "/repairing",
    label: "Repairing",
    icon: "Wrench",
    submenu: true,
    showFor: ["admin", "user"] as const,
    children: [
      {
        href: "/repairing/dashboard",
        label: "Dashboard",
        icon: "Home",
        showFor: ["admin", "user"] as const,
      },
      {
        href: "/repairing/request-form",
        label: "Request Form",
        icon: "FileText",
        showFor: ["admin", "user"] as const,
      },
      {
        href: "/repairing/pending",
        label: "Pending",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
      },
      {
        href: "/repairing/history",
        label: "History",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
      },
    ],
  },
  {
    href: "/maintenance",
    label: "Maintenance",
    icon: "Settings",
    submenu: true,
    showFor: ["admin", "user"] as const,
    children: [
      {
        href: "/maintenance/pending",
        label: "Pending",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
      },
      {
        href: "/maintenance/history",
        label: "History",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
      },
      {
        href: "/maintenance/schedules",
        label: "Schedules",
        icon: "ClipboardList",
        showFor: ["admin", "user"] as const,
      },
      {
        href: "/maintenance/calendar",
        label: "Calendar",
        icon: "Calendar",
        showFor: ["admin", "user"] as const,
      },
    ],
  },
  {
    href: "/machines",
    label: "Machines",
    icon: "Settings",
    showFor: ["admin"] as const,
  },
  {
    href: "/approval",
    label: "Admin Approvals",
    icon: "CheckSquare",
    showFor: ["admin"] as const,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "Settings",
    showFor: ["admin"] as const,
  },
  {
    href: "/license",
    label: "License",
    icon: "CheckSquare",
    showFor: ["admin"] as const,
  },
  {
    href: "/training-video",
    label: "Training Video",
    icon: "CheckSquare",
    showFor: ["admin"] as const,
  },
];

export function useDashboardLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);

  // Use next-themes hook for proper theme management
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    username: "",
    userRole: "",
    userEmail: "",
  });
  const [accessibleRoutes, setAccessibleRoutes] = useState<
    Array<Route & { active: boolean }>
  >([]);
  const [accessibleDepartments, setAccessibleDepartments] = useState<
    DataCategory[]
  >([]);

  // Track mounting for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cycle through themes: light -> dark -> system
  const cycleTheme = useCallback(() => {
    const themes: ThemeMode[] = ["light", "dark", "system"];
    const currentTheme = theme as ThemeMode;
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem("user-name");
    const storedRole = localStorage.getItem("role");
    const storedEmail = localStorage.getItem("email_id");

    if (!storedUsername) {
      router.push("/login");
      return;
    }

    setUserInfo({
      username: storedUsername,
      userRole: storedRole || "user",
      userEmail: storedEmail || "",
    });

    // Compute accessible routes and departments
    const userRole = (storedRole as "admin" | "user") || "user";

    // Helper to check if a route is active (or one of its children)
    const isRouteActive = (route: Route) => {
      if (route.href === "/dashboard") {
        return pathname === "/dashboard";
      }
      if (route.children) {
        return route.children.some(
          (child) =>
            pathname === child.href || pathname.startsWith(child.href + "/"),
        );
      }
      return pathname.startsWith(route.href);
    };

    const filteredRoutes = routes
      .filter((route) =>
        (route.showFor as readonly string[]).includes(userRole),
      )
      .map((route) => {
        const filteredChildren = route.children?.filter((child) =>
          (child.showFor as readonly string[]).includes(userRole),
        );

        return {
          ...route,
          children: filteredChildren,
          active: isRouteActive(route),
        };
      });
    setAccessibleRoutes(filteredRoutes);

    const filteredDepartments: DataCategory[] = [];
    setAccessibleDepartments(filteredDepartments);
  }, [router, pathname]);

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("user-name");
    localStorage.removeItem("role");
    localStorage.removeItem("email_id");
    localStorage.removeItem("token");
    window.location.href = "/login";
  }, []);

  // Auto-expand submenu if active
  useEffect(() => {
    const activeRoute = accessibleRoutes.find((r) => r.submenu && r.active);
    if (activeRoute && openSubmenu !== activeRoute.label) {
      setOpenSubmenu(activeRoute.label);
    }
  }, [accessibleRoutes, pathname]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenu((prev) => (prev === label ? null : label));
  };

  return {
    // State
    pathname,
    isMobileMenuOpen,
    openSubmenu,
    isUserPopupOpen,
    theme,
    userInfo,
    accessibleRoutes,
    accessibleDepartments,
    mounted,

    // Actions
    setIsMobileMenuOpen,
    toggleSubmenu,
    setIsUserPopupOpen,
    cycleTheme,
    handleLogout,
  };
}
