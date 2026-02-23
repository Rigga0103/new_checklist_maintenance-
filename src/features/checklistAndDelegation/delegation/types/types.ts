// Delegation feature types

export interface DelegationTask {
  task_id: number;
  department: string;
  given_by: string;
  name: string;
  task_description: string;
  task_start_date: string;
  frequency: string;
  enable_reminder: string;
  require_attachment: string;
  status: string | null;
  submission_date: string | null;
  remark: string | null;
  image: string | null;
  admin_done: string | null;
  created_at?: string;
  planned_date?: string | null;
  next_extend_date?: string | null;
}

export interface DelegationFilters {
  search: string;
  status: string;
  dateRange: string;
  name?: string;
}

export interface DelegationSubmission {
  taskId: number;
  status: string;
  remarks: string;
  nextExtendDate?: string | null;
  image?: {
    name: string;
    type: string;
    previewUrl: string;
  };
}
