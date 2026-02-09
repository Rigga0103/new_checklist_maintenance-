// Checklist feature types

export interface ChecklistItem {
  task_id: number;
  department: string | null;
  given_by: string | null;
  name: string | null;
  task_description: string | null;
  enable_reminder: "yes" | "no" | null;
  require_attachment: "yes" | "no" | null;
  frequency: string | null;
  remark: string | null;
  status: string | null;
  image: string | null;
  admin_done: string | null;
  delay: string | null;
  planned_date: string | null;
  created_at: string | null;
  task_start_date: string | null;
  submission_date: string | null;
  next_extend_date?: string | null;
}

export interface ChecklistSubmissionItem {
  taskId: number;
  status: string;
  remarks: string;
  nextExtendDate?: string | null;
  image?: {
    previewUrl: string;
    name: string;
    type: string;
  };
}

export interface ChecklistFetchResponse {
  data: ChecklistItem[];
  totalCount: number;
}

export interface ChecklistFetchParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
}
