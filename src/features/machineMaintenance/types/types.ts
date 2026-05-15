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
  machine_type?: string | null;
  vendor_name: string | null;
  bill_copy_url: string | null;
  bill_amount: number | null;
  remarks: string | null;
  motor_name: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  Work_Done_By?: string | null;
  Type_of_Work?: string | null;
  qty?: number | null;
  purchase_date?: string | null;
  amc?: string | null;
  next_repairing_date?: string | null;
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
  require_attachment: string | null;
  sample_image?: string | null;
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
  machineType?: string;
  machineName: string;
  motorName?: string;
  issueDetail: string;
  task_start_date?: string;
  part_replaced?: string[];
  bill_amount?: number;
  qty?: number;
  vendorName?: string;
  purchaseDate?: string;
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
  warrantyFromDate?: string;
  warrantyToDate?: string;
  workDoneBy?: string;
  typeOfWork?: string;
  amc?: string;
  nextRepairingDate?: string;
}

export type RepairStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";
export type MaintenanceStatus = "pending" | "completed" | "overdue";

export interface Vendor {
  id: number;
  Timestamp: string | null;
  "VENDOR CODE": string | null;
  "Vendor Name": string | null;
  "Contact No": string | null;
  Location: string | null;
  "Vendor Type": string | null;
  "Parts Name": string | null;
  "Work Type": string | null;
  "Visiting Card": string | null;
  "Images If Any": string | null;
  "FROM LINK": string | null;
}

export interface CreateVendorDTO {
  "VENDOR CODE"?: string;
  "Vendor Name": string;
  "Contact No"?: string;
  Location?: string;
  "Vendor Type"?: string;
  "Parts Name"?: string;
  "Work Type"?: string;
  "Visiting Card"?: string;
  "Images If Any"?: string;
  "FROM LINK"?: string;
}

export interface Part {
  id: number;
  Timestamp: string | null;
  "VENDOR CODE": string | null;
  "ITEM NAME": string | null;
  "DATE OF PURCHASE": string | null;
  RATE: string | null;
  QTY: string | null;
  UNIT: string | null;
  "VENDOR NAME": string | null;
}

export interface CreatePartDTO {
  "VENDOR CODE"?: string;
  "ITEM NAME": string;
  "DATE OF PURCHASE"?: string;
  RATE?: string;
  QTY?: string;
  UNIT?: string;
  "VENDOR NAME"?: string;
}
