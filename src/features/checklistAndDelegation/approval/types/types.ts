// Types for Admin Approval feature

export interface ApprovalTask {
  _id: string;
  _rowIndex: number;
  _taskId: string;
  _sheetType: "checklist" | "delegation";
  task_id: number;
  task_description: string | null;
  name: string | null;
  given_by: string | null;
  department: string | null;
  task_start_date: string | null;
  planned_date: string | null;
  frequency: string | null;
  enable_reminders: string | null;
  require_attachment: string | null;
  submission_date: string | null;
  status: string | null;
  remark: string | null;
  image: string | null;
  admin_done: string | null;
}

export interface ApprovalFilters {
  searchTerm: string;
  selectedMembers: string[];
  startDate: string;
  endDate: string;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  itemCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}
