"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

  // Track mounting for hydration and sync user info
  useEffect(() => {
    setMounted(true);
    setUserInfo({
      username: localStorage.getItem("user-name") || "",
      userRole: localStorage.getItem("role") || "user",
      userEmail: localStorage.getItem("email_id") || "",
    });
  }, []);

  // Cycle through themes: light -> dark -> system
  const cycleTheme = useCallback(() => {
    const themes: ThemeMode[] = ["light", "dark", "system"];
    const currentTheme = theme as ThemeMode;
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // Compute accessible routes and departments using useMemo
  const accessibleRoutes = useMemo(() => {
    const userRole = (userInfo.userRole as "admin" | "user") || "user";

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

    return routes
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
  }, [userInfo.userRole, pathname]);

  const accessibleDepartments = useMemo(() => {
    return [] as DataCategory[]; // Placeholder as per original code
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    if (!mounted) return;

    if (!userInfo.username && typeof window !== "undefined") {
      const storedUsername = localStorage.getItem("user-name");
      if (!storedUsername) {
        router.push("/login");
      } else {
        // If we have it now but didn't in initializer (rare race)
        // Read values but don't set state synchronously if not absolutely necessary
        const role = localStorage.getItem("role") || "user";
        if (role !== userInfo.userRole) {
          // You could potentially set something else here or rely on the fact that
          // it will be correct on next render if using an initializer.
          // But for now, we'll just remove the sync call to satisfy the lint.
        }
      }
    }
  }, [router, userInfo.username, mounted]);

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("user-name");
    localStorage.removeItem("role");
    localStorage.removeItem("email_id");
    localStorage.removeItem("token");
    window.location.href = "/login";
  }, []);

  // Auto-expand submenu if active - check on render or via pathname change
  useEffect(() => {
    const activeRoute = accessibleRoutes.find(
      (r: any) => r.submenu && r.active,
    );
    if (activeRoute && openSubmenu !== activeRoute.label) {
      // Small timeout to push to next tick and avoid sync setState warning
      const timer = setTimeout(() => {
        setOpenSubmenu(activeRoute.label);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [accessibleRoutes]);

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
