// Assign Task feature types

export interface AssignTaskFormData {
  department: string;
  givenBy: string;
  assignTo: string;
  description: string;
  startDate: string;
  time: string;
  frequency: FrequencyType;
  enableReminders: boolean;
  requireAttachment: boolean;
}

export type FrequencyType =
  | "one-time"
  | "daily"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "half-yearly"
  | "yearly"
  | "end-of-1st-week"
  | "end-of-2nd-week"
  | "end-of-3rd-week"
  | "end-of-4th-week"
  | "end-of-last-week";

export interface FrequencyOption {
  value: FrequencyType;
  label: string;
}

export interface GeneratedTask {
  id: number;
  department: string;
  givenBy: string;
  assignTo: string;
  description: string;
  dueDate: string; // DD/MM/YYYY HH:MM:SS format
  frequency: FrequencyType;
  status: "pending" | "completed" | "overdue";
  enableReminders: boolean;
  requireAttachment: boolean;
}

export interface WorkingDay {
  working_date: string;
  day: string;
  week_num: number;
  month: string;
}

// Task data format for API submission
export interface TaskSubmissionData {
  timestamp: string;
  taskId: string;
  department: string;
  givenBy: string;
  name: string;
  description: string;
  startDate: string;
  freq: string;
  enableReminders: string;
  requireAttachment: string;
}
