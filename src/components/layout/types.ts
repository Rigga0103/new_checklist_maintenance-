// Types for Dashboard Layout
export interface SidebarRoute {
  href: string;
  label: string;
  icon: string; // Icon component name from lucide-react
  active: boolean;
  submenu?: boolean;
  showFor: ("admin" | "user")[];
}

export interface DataCategory {
  id: string;
  name: string;
  link?: string;
  showFor?: ("admin" | "user")[];
}

export interface UserInfo {
  username: string;
  userRole: string;
  userEmail: string;
}

export type ThemeMode = "light" | "dark" | "system";
