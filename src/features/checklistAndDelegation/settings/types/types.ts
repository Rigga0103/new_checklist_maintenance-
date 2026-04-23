// Settings feature types

export interface User {
  id: number;
  created_at: string;
  user_name: string | null;
  password: string | null;
  email_id: string | null;
  number: number | null;
  department: string | null;
  given_by: string | null;
  role: string | null;
  status: string | null;
  user_access: string | null;
  leave_date: string | null;
  remark: string | null;
  leave_end_date: string | null;
  employee_id: string | null;
  last_punch_time: string | null;
  last_punch_device: string | null;
  page_access: string | null;
  system_access: string | null;
}

export interface CreateUserPayload {
  user_name: string;
  password?: string;
  email_id: string;
  number?: number;
  department?: string;
  given_by?: string;
  role: string;
  status: string;
  user_access?: string;
  employee_id?: string;
  page_access?: string;
  system_access?: string;
}

export interface UpdateUserPayload {
  user_name?: string;
  password?: string;
  email_id?: string;
  number?: number;
  department?: string;
  given_by?: string;
  role?: string;
  status?: string;
  user_access?: string;
  leave_date?: string | null;
  leave_end_date?: string | null;
  remark?: string | null;
  employee_id?: string;
  page_access?: string;
  system_access?: string;
}

export interface Department {
  id: number;
  department: string;
  given_by: string;
}

export interface CreateDepartmentPayload {
  name: string;
  givenBy: string;
}

export interface UpdateDepartmentPayload {
  department: string;
  given_by: string;
}

export interface UserPermission {
  id: number;
  user_id: number;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export type PermissionResource =
  // Checklist & Delegation
  | "dashboard"
  | "assign_task"
  | "checklist"
  | "delegation"
  | "quick_task"
  // Repairing
  | "repair_dashboard"
  | "repair_request"
  | "repairing"
  | "repair_history"
  | "repair_part_vendor"
  // Maintenance
  | "maintenance"
  | "maintenance_dashboard"
  | "maintenance_history"
  | "maintenance_schedules"
  | "maintenance_calendar"
  | "maintenance_edit"
  // Other
  | "machines"
  | "approval"
  | "settings"
  | "license"
  | "training_video"
  | "employee_management";
