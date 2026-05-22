"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ThemeMode, DataCategory, UserInfo } from "./types";
import { useUserPermissions } from "@/features/checklistAndDelegation/settings/server/tanstackQuery/useSettings";
import type { PermissionResource } from "@/features/checklistAndDelegation/settings/types/types";

interface Route {
  href: string;
  label: string;
  icon: string;
  submenu?: boolean;
  showFor: readonly ("admin" | "user")[];
  children?: Route[];
  permissionResource?: PermissionResource;
}

const routes: Route[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "Home",
    showFor: ["admin", "user"] as const,
    permissionResource: "dashboard",
  },
  {
    href: "/assign-task",
    label: "Assign Task",
    icon: "CheckSquare",
    showFor: ["admin", "user"] as const,
    permissionResource: "assign_task",
  },
  {
    href: "/delegation",
    label: "Delegation",
    icon: "ClipboardList",
    showFor: ["admin", "user"] as const,
    permissionResource: "delegation",
  },
  {
    href: "/quick-task",
    label: "Checklist Edit Task",
    icon: "Zap",
    showFor: ["admin"] as const,
    permissionResource: "quick_task",
  },
  {
    href: "/checklist",
    label: "Checklist",
    icon: "ClipboardList",
    showFor: ["admin", "user"] as const,
    permissionResource: "checklist",
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
        permissionResource: "repair_dashboard",
      },
      {
        href: "/repairing/request-form",
        label: "Request Form",
        icon: "FileText",
        showFor: ["admin", "user"] as const,
        permissionResource: "repair_request",
      },

      {
        href: "/repairing/pending",
        label: "Pending",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
        permissionResource: "repairing",
      },

      {
        href: "/repairing/pending-indent",
        label: "Pending Indent",
        icon: "ClipboardList",
        showFor: ["admin", "user"] as const,
        permissionResource: "repairing",
      },


      {
        href: "/repairing/part-and-vendor",
        label: "Part And Vendor",
        icon: "Package",
        showFor: ["admin", "user"] as const,
        permissionResource: "repair_part_vendor", // Ensure backend has this permission or relies on role
      },
      {
        href: "/repairing/part-purchase-pending",
        label: "Part Purchase Pending",
        icon: "ShoppingCart",
        showFor: ["admin", "user"] as const,
        permissionResource: "repair_part_vendor",
      },
      {
        href: "/repairing/history",
        label: "History",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
        permissionResource: "repair_history",
      },
      {
        href: "/repairing/settings",
        label: "Settings",
        icon: "Settings",
        showFor: ["admin"] as const,
        permissionResource: "settings",
      },
      {
        href: "/repairing/amc",
        label: "AMC",
        icon: "FileTask",
        showFor: ["admin"] as const,
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
        href: "/maintenance/dashboard",
        label: "Dashboard",
        icon: "Home",
        showFor: ["admin", "user"] as const,
        permissionResource: "maintenance_dashboard",
      },
      {
        href: "/maintenance/pending",
        label: "Pending",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
        permissionResource: "maintenance",
      },
      {
        href: "/maintenance/history",
        label: "History",
        icon: "Clock",
        showFor: ["admin", "user"] as const,
        permissionResource: "maintenance_history",
      },
      {
        href: "/maintenance/schedules",
        label: "Schedules",
        icon: "ClipboardList",
        showFor: ["admin", "user"] as const,
        permissionResource: "maintenance_schedules",
      },
      {
        href: "/maintenance/edit-task",
        label: "Maintenance Edit Task",
        icon: "Edit",
        showFor: ["admin"] as const,
        permissionResource: "maintenance_edit",
      },
    ],
  },
  {
    href: "/machines",
    label: "Machines Master",
    icon: "Settings",
    showFor: ["admin"] as const,
    permissionResource: "machines",
  },
  {
    href: "/vendor-master",
    label: "Vendor Master",
    icon: "Users",
    showFor: ["admin"] as const,
    permissionResource: "machines",
  },
  {
    href: "/part-master",
    label: "Part Master",
    icon: "Package",
    showFor: ["admin"] as const,
    permissionResource: "machines",
  },
  {
    href: "/employee-management",
    label: "Employee Management",
    icon: "Users",
    submenu: true,
    showFor: ["admin"] as const,
    children: [
      {
        href: "/employee-management/doer-management",
        label: "Doer Management",
        icon: "Users",
        showFor: ["admin"] as const,
        permissionResource: "employee_management",
      },
      {
        href: "/employee-management/task-management",
        label: "Task Management",
        icon: "ClipboardList",
        showFor: ["admin"] as const,
        permissionResource: "employee_management",
      },
    ],
  },
  {
    href: "/approval",
    label: "Admin Approvals",
    icon: "CheckSquare",
    showFor: ["admin"] as const,
    permissionResource: "approval",
  },
  {
    href: "/unique-tasks",
    label: "Unique Tasks",
    icon: "ClipboardList",
    showFor: ["admin"] as const,
    permissionResource: "approval", // Reusing approval permission for now
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: "Calendar",
    showFor: ["admin", "user"] as const,
    permissionResource: "maintenance_calendar",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "Settings",
    showFor: ["admin"] as const,
    permissionResource: "settings",
  },
  {
    href: "/license",
    label: "License",
    icon: "CheckSquare",
    showFor: ["admin"] as const,
    permissionResource: "license",
  },
  {
    href: "/training-video",
    label: "Training Video",
    icon: "CheckSquare",
    showFor: ["admin"] as const,
    permissionResource: "training_video",
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

  // Read user_id for RBAC permission fetching
  const [userId, setUserId] = useState<number | null>(null);

  // Track mounting for hydration and sync user info
  useEffect(() => {
    setMounted(true);
    setUserInfo({
      username: localStorage.getItem("user-name") || "",
      userRole: localStorage.getItem("role") || "user",
      userEmail: localStorage.getItem("email_id") || "",
    });
    const id = localStorage.getItem("user_id");
    if (id) {
      setUserId(parseInt(id, 10));
    }
  }, []);

  // Fetch user permissions from DB for RBAC-based sidebar filtering
  const { data: userPermissions = [] } = useUserPermissions(userId);

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
    const userRole = (userInfo.userRole || "user").toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "super_admin";

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

    // Check if user has can_read permission for a given resource
    const hasPermission = (resource?: PermissionResource) => {
      if (isAdmin) return true;
      if (!resource) return false;
      return userPermissions.some((p) => p.resource === resource && p.can_read);
    };

    // A route is accessible if role allows it OR user has explicit RBAC permission
    const isRouteAccessible = (route: Route) => {
      if (isAdmin) return true;

      // If route has specific permission resource, that takes precedence
      if (route.permissionResource) {
        return hasPermission(route.permissionResource);
      }

      // Fallback to role-based check
      return (route.showFor as readonly string[]).includes(userRole);
    };

    // Filter routes: only show accessible ones
    return routes
      .filter((route) => {
        // For parent routes with children (submenu), show if at least one child is accessible
        if (route.submenu && route.children) {
          return route.children.some(isRouteAccessible);
        }
        return isRouteAccessible(route);
      })
      .map((route) => {
        const filteredChildren = route.children?.filter(isRouteAccessible);

        return {
          ...route,
          children: filteredChildren,
          active: isRouteActive(route),
        };
      });
  }, [userInfo.userRole, pathname, userPermissions]);

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