"use client";

import {
  BookmarkCheck,
  Calendar,
  CalendarCheck,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  ClipboardList,
  Clock,
  Database,
  FileText,
  Home,
  LogOut,
  LucideIcon,
  Menu,
  Monitor,
  Moon,
  Package,
  Settings,
  Sun,
  UserRound,
  Users,
  Wrench,
  Zap,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useDashboardLayout } from "./useDashboardLayout";

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Home,
  CheckSquare,
  ClipboardList,
  Zap,
  Database,
  Settings,
  Wrench,
  FileText,
  Clock,
  Calendar,
  Users,
  Package,
  ShieldCheck
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const {
    pathname,
    isMobileMenuOpen,
    openSubmenu,
    isUserPopupOpen,
    theme,
    userInfo,
    accessibleRoutes,
    accessibleDepartments,
    setIsMobileMenuOpen,
    toggleSubmenu,
    setIsUserPopupOpen,
    cycleTheme,
    handleLogout,
    mounted,
  } = useDashboardLayout();

  const getThemeIcon = () => {
    if (!mounted) return <Monitor className="w-5 h-5" />;
    if (theme === "light") return <Sun className="w-5 h-5" />;
    if (theme === "dark") return <Moon className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const getThemeLabel = () => {
    if (!mounted) return "System";
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";
    return "System";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors">
      {/* Sidebar for desktop */}
      <aside className="flex-shrink-0 hidden w-64 transition-colors bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 shadow-lg dark:shadow-none md:flex md:flex-col">
        <div className="flex items-center px-4 border-b border-slate-200   h-14 bg-primary dark:bg-black">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-white"
          >
            <ClipboardList className="w-5 h-5 text-white dark:text-white " />
            <span>Checklist and Delegation</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto bg-white dark:bg-zinc-900">
          <ul className="space-y-1">
            {accessibleRoutes.map((route) => {
              const IconComponent = iconMap[route.icon] || CheckSquare;
              const isSubmenuOpen = openSubmenu === route.label;

              return (
                <li key={`${route.label}-${route.href}`}>
                  {route.submenu ? (
                    <div className="mb-1">
                      <button
                        onClick={() => toggleSubmenu(route.label)}
                        className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                          ? "bg-neutral-100 dark:bg-neutral-800 text-foreground"
                          : "text-foreground dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent
                            className={`h-4 w-4 ${route.active
                              ? "text-muted-foreground"
                              : "text-foreground-secondary dark:text-zinc-400"
                              }`}
                          />
                          <span className="font-medium text-foreground dark:text-zinc-200">
                            {route.label}
                          </span>
                        </div>
                        <div className="flex items-center text-muted-foreground dark:text-zinc-400">
                          {isSubmenuOpen ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>
                      {isSubmenuOpen && (
                        <ul className="pl-2 mt-1 ml-6 space-y-1 border-l border-muted dark:border-zinc-700">
                          {route.children
                            ? route.children.map((child) => {
                              const ChildIcon =
                                iconMap[child.icon] || CheckSquare;
                              const isChildActive = pathname === child.href;
                              return (
                                <li key={`${child.label}-${child.href}`}>
                                  <Link
                                    href={child.href}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${isChildActive
                                      ? "bg-secondary dark:bg-zinc-800 text-foreground font-medium"
                                      : "text-foreground-secondary dark:text-zinc-400 hover:bg-secondary dark:hover:bg-zinc-800 hover:text-primary dark:hover:text-foreground"
                                      }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                  >
                                    <ChildIcon className="w-3 h-3 text-muted-foreground dark:text-zinc-500" />
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })
                            : // Fallback for legacy data departments if any
                            accessibleDepartments.map((category) => (
                              <li key={category.id}>
                                <Link
                                  href={
                                    category.link || `/data/${category.id}`
                                  }
                                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${pathname ===
                                    (category.link || `/data/${category.id}`)
                                    ? "bg-secondary dark:bg-zinc-800 text-foreground font-medium"
                                    : "text-foreground-secondary dark:text-zinc-400 hover:bg-secondary dark:hover:bg-zinc-800 hover:text-primary dark:hover:text-foreground"
                                    }`}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <Database className="w-3 h-3 text-muted-foreground dark:text-zinc-500" />
                                  {category.name}
                                </Link>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={route.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                        ? "bg-neutral-100 dark:bg-neutral-800 text-foreground border-l-4 border-green-600"
                        : "text-foreground dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:border-l-4 hover:border-neutral-400"
                        }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <IconComponent
                        className={`h-4 w-4 ${route.active
                          ? "text-muted-foreground"
                          : "text-foreground-secondary dark:text-zinc-400"
                          }`}
                      />
                      <span className="text-foreground dark:text-zinc-200">
                        {route.label}
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600">
                  <span className="text-sm font-medium text-white">
                    {userInfo.username
                      ? userInfo.username.charAt(0).toUpperCase()
                      : "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {userInfo.username || "User"}{" "}
                    {userInfo.userRole === "admin" ? "(Admin)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userInfo.userEmail || "user@example.com"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-foreground hover:text-primary dark:hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="absolute z-50 p-2 text-primary rounded-md md:hidden left-4 top-3 dark:text-foreground hover:bg-muted dark:hover:bg-zinc-800"
      >
        <Menu className="w-5 h-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-zinc-900 shadow-lg">
            <div className="flex items-center px-4 border-b border-slate-200 dark:border-zinc-800 h-14 bg-primary">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClipboardList className="w-5 h-5 text-white" />
                <span>Checklist and Delegation</span>
              </Link>
            </div>
            <nav className="flex-1 p-2 overflow-y-auto bg-white dark:bg-zinc-900">
              <ul className="space-y-1">
                {accessibleRoutes.map((route) => {
                  const IconComponent = iconMap[route.icon] || CheckSquare;
                  const isSubmenuOpen = openSubmenu === route.label;

                  return (
                    <li key={`mobile-${route.label}-${route.href}`}>
                      {route.submenu ? (
                        <div className="mb-1">
                          <button
                            onClick={() => toggleSubmenu(route.label)}
                            className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                              ? "bg-accent text-foreground"
                              : "text-foreground dark:text-zinc-300 hover:bg-secondary dark:hover:bg-zinc-800"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent
                                className={`h-4 w-4 ${route.active
                                  ? "text-muted-foreground"
                                  : "text-foreground-secondary dark:text-zinc-400"
                                  }`}
                              />
                              <span className="font-medium text-foreground dark:text-zinc-200">
                                {route.label}
                              </span>
                            </div>
                            <div className="flex items-center text-muted-foreground dark:text-zinc-400">
                              {isSubmenuOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </button>
                          {isSubmenuOpen && (
                            <ul className="pl-2 mt-1 ml-6 space-y-1 border-l border-muted dark:border-zinc-700">
                              {route.children
                                ? route.children.map((child) => {
                                  const ChildIcon =
                                    iconMap[child.icon] || CheckSquare;
                                  const isChildActive =
                                    pathname === child.href;
                                  return (
                                    <li
                                      key={`mobile-${child.label}-${child.href}`}
                                    >
                                      <Link
                                        href={child.href}
                                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${isChildActive
                                          ? "bg-secondary dark:bg-zinc-800 text-foreground font-medium"
                                          : "text-foreground-secondary dark:text-zinc-400 hover:bg-secondary dark:hover:bg-zinc-800 hover:text-primary dark:hover:text-foreground"
                                          }`}
                                        onClick={() =>
                                          setIsMobileMenuOpen(false)
                                        }
                                      >
                                        <ChildIcon className="w-3 h-3 text-muted-foreground dark:text-zinc-500" />
                                        {child.label}
                                      </Link>
                                    </li>
                                  );
                                })
                                : accessibleDepartments.map((category) => (
                                  <li key={`mobile-${category.id}`}>
                                    <Link
                                      href={
                                        category.link ||
                                        `/data/${category.id}`
                                      }
                                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${pathname ===
                                        (category.link ||
                                          `/data/${category.id}`)
                                        ? "bg-secondary dark:bg-zinc-800 text-foreground font-medium"
                                        : "text-foreground-secondary dark:text-zinc-400 hover:bg-secondary dark:hover:bg-zinc-800 hover:text-primary dark:hover:text-foreground"
                                        }`}
                                      onClick={() =>
                                        setIsMobileMenuOpen(false)
                                      }
                                    >
                                      <Database className="w-3 h-3 text-muted-foreground dark:text-zinc-500" />
                                      {category.name}
                                    </Link>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={route.href}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${route.active
                            ? "bg-accent text-foreground border-l-4 border-primary dark:border-muted-foreground"
                            : "text-foreground dark:text-zinc-300 hover:bg-secondary dark:hover:bg-zinc-800 hover:border-l-4 hover:border-foreground dark:hover:border-primary"
                            }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <IconComponent
                            className={`h-4 w-4 ${route.active
                              ? "text-muted-foreground"
                              : "text-foreground-secondary dark:text-zinc-400"
                              }`}
                          />
                          <span className="text-foreground dark:text-zinc-200">
                            {route.label}
                          </span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600">
                    <span className="text-sm font-medium text-white">
                      {userInfo.username
                        ? userInfo.username.charAt(0).toUpperCase()
                        : "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {userInfo.username || "User"}{" "}
                      {userInfo.userRole === "admin" ? "(Admin)" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userInfo.userEmail || "user@example.com"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center mt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-foreground hover:text-primary dark:hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-4 transition-colors bg-white border-b border-slate-200 h-14 dark:border-zinc-800 dark:bg-zinc-900 md:px-6">
          <div className="flex w-8 md:hidden"></div>
          <h1 className="text-lg font-semibold text-foreground">
            Checklist and Delegation
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={cycleTheme}
              className="flex items-center gap-2 p-2 text-primary transition-colors rounded-lg hover:bg-muted dark:hover:bg-zinc-800 dark:text-foreground"
              title={`Theme: ${getThemeLabel()}`}
            >
              {getThemeIcon()}
              <span className="hidden text-sm font-medium sm:inline">
                {getThemeLabel()}
              </span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 pb-20 overflow-y-auto transition-colors md:p-6 bg-background sm:pb-6">
          {children}

          {/* Mobile bottom navigation */}
          <div className="fixed bottom-0 left-0 right-0 z-10 px-4 py-1 text-sm text-center text-white shadow-lg md:left-64 bg-green-600 backdrop-blur-sm">
            <div className="sm:hidden flex justify-between items-center mb-[-10px]">
              <div className="p-2 transition-all duration-300 transform rounded-full cursor-pointer hover:bg-white/20 hover:scale-110">
                <Link
                  href="/dashboard"
                  className={`${pathname === "/dashboard" ? "bg-white/20" : ""
                    }`}
                >
                  <Home size={29} className="drop-shadow-md" />
                </Link>
              </div>
              <div className="p-2 transition-all duration-300 transform rounded-full cursor-pointer hover:bg-white/20 hover:scale-110">
                <Link
                  href="/checklist"
                  className={`${pathname === "/checklist" ? "bg-white/20" : ""
                    }`}
                >
                  <CalendarCheck size={29} className="drop-shadow-md" />
                </Link>
              </div>
              <div className="p-3 -mt-6 text-primary transition-all duration-300 transform bg-white dark:bg-zinc-800 dark:text-muted-foreground rounded-full shadow-lg cursor-pointer hover:bg-muted dark:hover:bg-zinc-700 hover:scale-110">
                <Link
                  href="/assign-task"
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${pathname === "/assign-task" ? "bg-white/20" : ""
                    }`}
                >
                  <CirclePlus size={29} className="drop-shadow-md" />
                </Link>
              </div>
              <div className="p-2 transition-all duration-300 transform rounded-full cursor-pointer hover:bg-white/20 hover:scale-110">
                <Link
                  href="/delegation"
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${pathname === "/delegation" ? "bg-white/20" : ""
                    }`}
                >
                  <BookmarkCheck size={29} className="drop-shadow-md" />
                </Link>
              </div>
              <div
                className="p-2 transition-all duration-300 transform rounded-full cursor-pointer hover:bg-white/20 hover:scale-110"
                onClick={() => setIsUserPopupOpen(true)}
              >
                <UserRound size={29} className="drop-shadow-md" />
              </div>
            </div>
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden flex items-center justify-center gap-1 text-gray-900 transition-colors duration-300 mb-[-5px]"
            >
              All Right Reserved by -
              <span className="font-bold text-gray-900 drop-shadow-md">
                Botivate
              </span>
            </a>
            <a
              href="https://www.botivate.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden hover:underline sm:flex items-center justify-center gap-1 text-white/90 hover:text-white transition-colors duration-300 mb-[-5px]"
            >
              All Right Reserved by -
              <span className="font-bold text-white drop-shadow-md">
                Botivate
              </span>
            </a>
          </div>
        </main>

        {/* User Popup */}
        {isUserPopupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-80">
              <div className="flex flex-col items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-600">
                    <span className="text-3xl font-medium text-white">
                      {userInfo.username
                        ? userInfo.username.charAt(0).toUpperCase()
                        : "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {userInfo.username || "User"}{" "}
                      {userInfo.userRole === "admin" ? "(Admin)" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userInfo.userEmail || "user@example.com"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-around w-full gap-2 mt-4">
                  <button
                    onClick={() => setIsUserPopupOpen(false)}
                    className="p-1 px-2 rounded-md outline"
                  >
                    <span className="flex items-center justify-center">
                      Cancel
                    </span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="p-1 px-2 text-white bg-blue-700 rounded-md hover:bg-blue-900"
                  >
                    <span className="flex items-center justify-center">
                      Log out <LogOut className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
