// QuickTask feature types - Checklist and Delegation entities

// ============ Checklist Types ============

export interface ChecklistTask {
  task_id: number;
  department: string | null;
  given_by: string | null;
  name: string | null;
  task_description: string | null;
  enable_reminder: "yes" | "no" | null;
  require_attachment: "yes" | "no" | null;
  frequency: string | null;
  remark: string | null;
  status: "yes" | "no" | null;
  image: string | null;
  admin_done: string | null;
  delay: string | null;
  planned_date: string | null;
  created_at: string | null;
  task_start_date: string | null;
  submission_date: string | null;
}

export interface ChecklistUpdatePayload {
  department?: string;
  given_by?: string;
  name?: string;
  task_description?: string;
  enable_reminder?: "yes" | "no";
  require_attachment?: "yes" | "no";
  remark?: string;
}

export interface ChecklistOriginalMatch {
  department: string | null;
  name: string | null;
  task_description: string | null;
}

// ============ Delegation Types ============

export interface DelegationUpdatePayload {
  department?: string;
  given_by?: string;
  name?: string;
  task_description?: string;
  frequency?: string;
  enable_reminder?: "yes" | "no";
  require_attachment?: string;
  task_start_date?: string;
  planned_date?: string;
}

export interface DelegationOriginalMatch {
  department: string | null;
  name: string | null;
  task_description: string | null;
}

export interface DelegationTask {
  task_id: number;
  created_at: string;
  department: string | null;
  name: string | null;
  task_description: string | null;
  frequency: string | null;
  remarks: string | null;
  task_start_date: string;
  given_by: string | null;
  image: string | null;
  enable_reminder: "yes" | "no" | null;
  require_attachment: string | null;
  status: string | null;
  updated_at: string | null;
  planned_date: string | null;
  submission_date: string | null;
  color_code_for: number | null;
  delay: string | null;
}

// ============ User Types ============

export interface User {
  user_name: string;
  status: string | null;
}

// ============ API Response Types ============

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface FetchParams {
  page?: number;
  pageSize?: number;
  nameFilter?: string;
}

// ============ Query Hook Types ============

export interface UseInfiniteTasksReturn<T> {
  data: T[];
  total: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
}
