import supabase from "@/utils/supabaseClient";
import type { DashboardType, TaskView } from "../../types/types";

// ============ Types ============

export interface DashboardFetchParams {
  dashboardType: DashboardType;
  staffFilter?: string | null;
  page?: number;
  limit?: number;
  taskView?: TaskView;
  departmentFilter?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface DashboardSummary {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
}

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

// ============ Core Dashboard Data ============

/**
 * Fetch dashboard data with pagination and filters
 */
export const fetchDashboardDataApi = async ({
  dashboardType,
  staffFilter = null,
  page = 1,
  limit = 50,
  taskView = "recent",
  departmentFilter = null,
  role = null,
  username = null,
}: DashboardFetchParams & {
  role?: string | null;
  username?: string | null;
}) => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from(dashboardType)
      .select("*")
      .order("task_start_date", { ascending: false })
      .range(from, to);

    // Role-based filtering
    if (role === "user" && username) {
      query = query.eq("name", username);
    }

    // Department filter (checklist only)
    if (
      departmentFilter &&
      departmentFilter !== "all" &&
      dashboardType === "checklist"
    ) {
      query = query.eq("department", departmentFilter);
    }

    // Staff filter (admin only)
    if (staffFilter && staffFilter !== "all" && role === "admin") {
      query = query.eq("name", staffFilter);
    }

    // Task view filtering
    switch (taskView) {
      case "recent":
        query = query
          .gte("task_start_date", `${today}T00:00:00`)
          .lte("task_start_date", `${today}T23:59:59`);
        if (dashboardType === "checklist") {
          query = query.or("status.is.null,status.neq.yes");
        }
        break;

      case "upcoming": {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        query = query
          .gte("task_start_date", `${tomorrowStr}T00:00:00`)
          .lte("task_start_date", `${tomorrowStr}T23:59:59`);
        break;
      }

      case "overdue":
        query = query
          .lt("task_start_date", `${today}T00:00:00`)
          .is("submission_date", null);
        if (dashboardType === "checklist") {
          query = query.or("status.is.null,status.neq.yes");
        } else {
          query = query.neq("status", "done");
        }
        break;

      default:
        query = query.lte("task_start_date", `${today}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error from Supabase:", error);
    throw error;
  }
};

// ============ Count APIs ============

/**
 * Count total tasks for today only
 */
export const countTotalTasksApi = async (
  dashboardType: DashboardType,
  staffFilter: string | null = null,
  departmentFilter: string | null = null,
  role: string | null = null,
  username: string | null = null,
): Promise<number> => {
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from(dashboardType)
    .select("*", { count: "exact", head: true })
    .gte("task_start_date", `${today}T00:00:00`)
    .lte("task_start_date", `${today}T23:59:59`);

  if (role === "user" && username) {
    query = query.eq("name", username);
  } else if (staffFilter && staffFilter !== "all") {
    query = query.eq("name", staffFilter);
  }

  if (
    departmentFilter &&
    departmentFilter !== "all" &&
    dashboardType === "checklist"
  ) {
    query = query.eq("department", departmentFilter);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

/**
 * Count completed tasks for today only
 */
export const countCompletedTasksApi = async (
  dashboardType: DashboardType,
  staffFilter: string | null = null,
  departmentFilter: string | null = null,
  role: string | null = null,
  username: string | null = null,
): Promise<number> => {
  const today = new Date().toISOString().split("T")[0];

  let query =
    dashboardType === "delegation"
      ? supabase
          .from("delegation")
          .select("*", { count: "exact", head: true })
          .not("submission_date", "is", null)
          .gte("task_start_date", `${today}T00:00:00`)
          .lte("task_start_date", `${today}T23:59:59`)
      : supabase
          .from("checklist")
          .select("*", { count: "exact", head: true })
          .eq("status", "yes")
          .gte("task_start_date", `${today}T00:00:00`)
          .lte("task_start_date", `${today}T23:59:59`);

  if (role === "user" && username) {
    query = query.eq("name", username);
  } else if (staffFilter && staffFilter !== "all") {
    query = query.eq("name", staffFilter);
  }

  if (
    departmentFilter &&
    departmentFilter !== "all" &&
    dashboardType === "checklist"
  ) {
    query = query.eq("department", departmentFilter);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

/**
 * Count pending/delay tasks (today's tasks)
 */
export const countPendingTasksApi = async (
  dashboardType: DashboardType,
  staffFilter: string | null = null,
  departmentFilter: string | null = null,
  role: string | null = null,
  username: string | null = null,
): Promise<number> => {
  const today = new Date().toISOString().split("T")[0];

  let query =
    dashboardType === "delegation"
      ? supabase
          .from("delegation")
          .select("*", { count: "exact", head: true })
          .is("submission_date", null)
          .gte("task_start_date", `${today}T00:00:00`)
          .lte("task_start_date", `${today}T23:59:59`)
      : supabase
          .from("checklist")
          .select("*", { count: "exact", head: true })
          .or("status.is.null,status.neq.yes")
          .gte("task_start_date", `${today}T00:00:00`)
          .lte("task_start_date", `${today}T23:59:59`);

  if (role === "user" && username) {
    query = query.eq("name", username);
  } else if (staffFilter && staffFilter !== "all") {
    query = query.eq("name", staffFilter);
  }

  if (
    departmentFilter &&
    departmentFilter !== "all" &&
    dashboardType === "checklist"
  ) {
    query = query.eq("department", departmentFilter);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

/**
 * Count overdue tasks
 */
export const countOverdueTasksApi = async (
  dashboardType: DashboardType,
  staffFilter: string | null = null,
  departmentFilter: string | null = null,
  role: string | null = null,
  username: string | null = null,
): Promise<number> => {
  const today = new Date().toISOString().split("T")[0];

  let query =
    dashboardType === "delegation"
      ? supabase
          .from("delegation")
          .select("*", { count: "exact", head: true })
          .is("submission_date", null)
          .lt("task_start_date", `${today}T00:00:00`)
          .neq("status", "done")
      : supabase
          .from("checklist")
          .select("*", { count: "exact", head: true })
          .or("status.is.null,status.neq.yes")
          .is("submission_date", null)
          .lt("task_start_date", `${today}T00:00:00`);

  if (role === "user" && username) {
    query = query.eq("name", username);
  } else if (staffFilter && staffFilter !== "all") {
    query = query.eq("name", staffFilter);
  }

  if (
    departmentFilter &&
    departmentFilter !== "all" &&
    dashboardType === "checklist"
  ) {
    query = query.eq("department", departmentFilter);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

// ============ Summary API ============

/**
 * Get dashboard summary with all counts
 */
export const getDashboardSummaryApi = async (
  dashboardType: DashboardType,
  staffFilter: string | null = null,
  departmentFilter: string | null = null,
  role: string | null = null,
  username: string | null = null,
): Promise<DashboardSummary> => {
  const today = new Date().toISOString().split("T")[0];

  // Determine filter name based on role
  // If user, use their username. If admin, use selected staff filter.
  // If admin selects 'all', pass null or rely on RPC to handle 'all'.
  const filterName =
    role === "user" && username
      ? username
      : staffFilter && staffFilter !== "all"
        ? staffFilter
        : null;

  const { data, error } = await supabase.rpc("get_dashboard_counts", {
    p_dashboard_type: dashboardType,
    p_date: today,
    p_filter_name: filterName,
    p_dept_filter:
      dashboardType === "checklist" &&
      departmentFilter &&
      departmentFilter !== "all"
        ? departmentFilter
        : null,
  });

  if (error) {
    console.error("Error fetching dashboard summary via RPC:", error);
    throw error;
  }

  // RPC returns an array with one object
  const result =
    data && data.length > 0
      ? data[0]
      : {
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          overdue_tasks: 0,
        };

  const totalTasks = Number(result.total_tasks || 0);
  const completedTasks = Number(result.completed_tasks || 0);
  const pendingTasks = Number(result.pending_tasks || 0);
  const overdueTasks = Number(result.overdue_tasks || 0);

  const completionRate =
    totalTasks > 0
      ? Number(((completedTasks / totalTasks) * 100).toFixed(1))
      : 0;

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    completionRate,
  };
};

// ============ Filter Data APIs ============

/**
 * Get unique departments from users table
 */
export const getUniqueDepartmentsApi = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from("users")
    .select("department")
    .not("department", "is", null)
    .not("department", "eq", "");

  if (error) throw error;

  const uniqueDepartments = [
    ...new Set(
      (data || [])
        .map((item) => item.department?.trim())
        .filter((dept): dept is string => Boolean(dept) && dept.length > 0),
    ),
  ].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return uniqueDepartments;
};

/**
 * Get staff names (non-admin users)
 */
export const getStaffNamesApi = async (
  departmentFilter: string | null = null,
): Promise<string[]> => {
  const { data, error } = await supabase
    .from("users")
    .select("user_name, user_access")
    .not("user_name", "is", null)
    .not("user_access", "eq", "admin")
    .not("user_name", "eq", "");

  if (error) throw error;

  let filteredStaff = (data || []).map((user) => user.user_name);

  if (departmentFilter && departmentFilter !== "all") {
    filteredStaff = (data || [])
      .filter((user) => {
        if (!user.user_access) return false;
        const userDepartments = user.user_access
          .split(",")
          .map((d: string) => d.trim().toLowerCase());
        return userDepartments.includes(departmentFilter.toLowerCase());
      })
      .map((user) => user.user_name);
  }

  return [...new Set(filteredStaff)];
};

/**
 * Get total users count
 */
export const getTotalUsersCountApi = async (
  departmentFilter: string | null = null,
): Promise<number> => {
  let query = supabase
    .from("users")
    .select("user_name, department", { count: "exact", head: true })
    .not("user_name", "is", null)
    .not("user_name", "eq", "");

  if (departmentFilter && departmentFilter !== "all") {
    query = query.eq("department", departmentFilter);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

/**
 * Get staff task summary (aggregated stats per staff)
 */
export const getStaffTaskSummaryApi = async (
  dashboardType: DashboardType,
  departmentFilter: string | null = null,
): Promise<StaffTaskData[]> => {
  // Use current month start date
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  const { data, error } = await supabase.rpc("get_staff_stats", {
    p_dashboard_type: dashboardType,
    p_start_date: startOfMonthStr,
    p_dept_filter:
      departmentFilter && departmentFilter !== "all" ? departmentFilter : null,
  });

  if (error) {
    console.error("Error fetching staff stats via RPC:", error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  return data
    .map((stat: any) => {
      const total = Number(stat.total_tasks || 0);
      const completed = Number(stat.completed_tasks || 0);
      const ontime = Number(stat.ontime_tasks || 0);

      return {
        id: stat.worker_id || stat.worker_name,
        name: stat.worker_name,
        department: stat.worker_department || "Unassigned",
        total_tasks: total,
        total_completed_tasks: completed,
        total_done_on_time: ontime,
        completion_score: total > 0 ? Math.round((completed / total) * 100) : 0,
        ontime_score:
          completed > 0 ? Math.round((ontime / completed) * 100) : 0,
      };
    })
    .sort(
      (a: StaffTaskData, b: StaffTaskData) =>
        b.completion_score - a.completion_score,
    );
};
