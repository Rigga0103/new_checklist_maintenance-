// Types for Machine Repair and Maintenance systems

export interface MachineRepair {
  task_id: number;
  created_at: string;
  form_filled_by: string | null;
  assigned_to: string | null;
  machine_name: string | null;
  issue_detail: string | null;
  part_replaced: string | null;
  task_start_date: string | null;
  actual_date: string | null;
  delay: string | null;
  work_done: string | null;
  photo_url: string | null;
  status: string | null;
  vendor_name: string | null;
  bill_copy_url: string | null;
  bill_amount: number | null;
  remarks: string | null;
  motor_name: string | null;
  warranty: string | null;
}

export interface MachineMaintenance {
  task_id: number;
  created_at: string;
  machine_name: string | null;
  serial_no: string | null;
  department: string | null;
  task_description: string | null;
  frequency: string | null;
  doer_name: string | null;
  task_start_date: string | null;
  actual_date: string | null;
  delay: string | null;
  status: string | null;
  remarks: string | null;
  image_url: string | null;
  maintenance_cost: number | null;
}

export interface RepairFetchResponse {
  data: MachineRepair[];
  totalCount: number;
}

export interface MaintenanceFetchResponse {
  data: MachineMaintenance[];
  totalCount: number;
}

export interface RepairRequestFormData {
  formFilledBy: string;
  assignedTo: string;
  machineName: string;
  motorName?: string;
  issueDetail: string;
}

export interface RepairProcessFormData {
  partReplaced?: string;
  workDone?: string;
  photoUrl?: string;
  status: string;
  vendorName?: string;
  billCopyUrl?: string;
  billAmount?: number;
  remarks?: string;
  warranty?: string;
}

export type RepairStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";
export type MaintenanceStatus = "pending" | "completed" | "overdue";
