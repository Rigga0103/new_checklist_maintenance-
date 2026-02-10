// Dashboard feature types
export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  taskStartDate: string;
  originalTaskStartDate: string;
  submission_date: string | null;
  status: "pending" | "completed" | "overdue";
  frequency: string;
  rating: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  progress: number;
}

export interface DepartmentData {
  allTasks: Task[];
  staffMembers: StaffMember[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  barChartData: Array<{ name: string; completed: number; pending: number }>;
  pieChartData: Array<{ name: string; value: number; color: string }>;
  completedRatingOne: number;
  completedRatingTwo: number;
  completedRatingThreePlus: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
  filtered: boolean;
}

export type DashboardType = "checklist" | "delegation" | "repair";
export type TaskView = "recent" | "today" | "upcoming" | "overdue";
export type FilterStatus = "all" | "pending" | "completed" | "overdue";

export interface StaffTaskData {
  id: string;
  department: string;
  name: string;
  total_tasks: number;
  total_completed_tasks: number;
  total_done_on_time: number;
  completion_score: number;
  ontime_score: number;
}
