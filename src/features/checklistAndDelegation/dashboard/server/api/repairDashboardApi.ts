import supabase from "@/utils/supabaseClient";

// Types matching the Supabase tables
export interface MachineRepairTask {
  id: number;
  created_at: string; // timestamp
  task_id: number;
  form_filled_by?: string;
  assigned_to?: string;
  machine_name?: string;
  issue_detail?: string;
  part_replaced?: string;
  task_start_date?: string;
  actual_date?: string;
  delay?: string; // interval
  work_done?: string;
  photo_url?: string;
  status?: string;
  vendor_name?: string;
  bill_copy_url?: string;
  bill_amount?: number;
  remarks?: string;
  warranty?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  machine_type?: string;
}

export interface MachineMaintenanceTask {
  task_id: number;
  created_at: string;
  machine_name: string;
  task_description?: string;
  frequency?: string;
  assigned_to?: string;
  department?: string;
  task_start_date?: string;
  actual_date?: string;
  status?: string;
  remarks?: string;
  image_url?: string;
  maintenance_cost?: number;
  delay?: string;
  doer_name?: string;
  require_attachment?: string; // e.g. "yes", "no"
  enable_reminder?: string; // e.g. "yes", "no"
  sample_image?: string;
  machine_type?: string;
}

export interface RepairDashboardData {
  repairs: MachineRepairTask[];
  maintenance: MachineMaintenanceTask[];
}

// Fetch all repair data
export const fetchRepairData = async (): Promise<MachineRepairTask[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching machine_repair:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchRepairData:", error);
    return [];
  }
};

// Fetch all maintenance data (used by Dashboard for charts/stats)
export const fetchMaintenanceData = async (): Promise<
  MachineMaintenanceTask[]
> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching machine_maintenance:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceData:", error);
    return [];
  }
};

// Fetch current week's pending maintenance tasks (mirrors checklist pattern)
export const fetchMaintenancePending = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
): Promise<MachineMaintenanceTask[]> => {
  try {
    const { start: startOfWeek, end: endOfWeek } = getWeekRange();

    const defaultStart = startDate
      ? `${startDate}T00:00:00.000Z`
      : `${startOfWeek}T00:00:00.000Z`;
    const defaultEnd = endDate
      ? `${endDate}T23:59:59.999Z`
      : `${endOfWeek}T23:59:59.999Z`;

    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .gte("task_start_date", defaultStart)
      .lte("task_start_date", defaultEnd)
      .is("actual_date", null)
      .order("task_start_date", { ascending: true });

    // Search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `doer_name.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    // Role filter - regular users only see their own tasks
    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching pending maintenance:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenancePending:", error);
    return [];
  }
};

// Fetch completed maintenance tasks (history)
export const fetchMaintenanceHistory = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
): Promise<MachineMaintenanceTask[]> => {
  try {
    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .not("actual_date", "is", null)
      .order("actual_date", { ascending: false });

    // Apply date filters targeting actual completion date or planned date
    if (startDate) {
      query = query.gte("task_start_date", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("task_start_date", `${endDate}T23:59:59.999Z`);
    }

    // Search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `doer_name.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    // Role filter
    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching maintenance history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceHistory:", error);
    return [];
  }
};

// Helper: get Monday–Saturday week range
function getWeekRange() {
  const current = new Date();
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const format = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return { start: format(monday), end: format(saturday) };
}

// Fetch maintenance tasks for the last 7 days (Monday to Saturday, all statuses)
export const fetchMaintenanceLast7Days = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<MachineMaintenanceTask[]> => {
  try {
    const { start: startOfWeek, end: endOfWeek } = getWeekRange();

    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .gte("task_start_date", `${startOfWeek}T00:00:00.000Z`)
      .lte("task_start_date", `${endOfWeek}T23:59:59.999Z`)
      .order("task_start_date", { ascending: true });

    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `doer_name.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching last 7 days maintenance:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceLast7Days:", error);
    return [];
  }
};

// Fetch overdue maintenance tasks (task start date < today and actual date is null)
export const fetchMaintenanceOverdue = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<MachineMaintenanceTask[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    const startOfTodayISO = today.toISOString();

    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .lt("task_start_date", startOfTodayISO)
      .is("actual_date", null)
      .order("task_start_date", { ascending: true });

    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `doer_name.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching overdue maintenance:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceOverdue:", error);
    return [];
  }
};

// Fetch upcoming maintenance tasks (task start date >= today and <= today + 7 days)
export const fetchMaintenanceUpcoming = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<MachineMaintenanceTask[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfTodayISO = today.toISOString();

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    sevenDaysLater.setHours(23, 59, 59, 999);
    const endOfSevenDaysISO = sevenDaysLater.toISOString();

    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .gte("task_start_date", startOfTodayISO)
      .lte("task_start_date", endOfSevenDaysISO)
      .is("actual_date", null)
      .order("task_start_date", { ascending: true });

    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `doer_name.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching upcoming maintenance:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceUpcoming:", error);
    return [];
  }
};

export const updateMaintenanceTask = async (
  id: number,
  updates: Partial<MachineMaintenanceTask>,
): Promise<MachineMaintenanceTask | null> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .update(updates)
      .eq("task_id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating machine_maintenance:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in updateMaintenanceTask:", error);
    throw error;
  }
};

// Fetch unique maintenance tasks for edit view (deduplicated by machine_name + task_description + doer_name)
export const fetchUniqueMaintenanceTasksForEdit = async (
  page = 0,
  pageSize = 50,
  searchTerm = "",
  machineName = "",
  assignedTo = "",
): Promise<{
  data: (MachineMaintenanceTask & { task_count: number })[];
  total: number;
}> => {
  try {
    // Fetch all tasks (no pagination at DB level since we deduplicate client-side)
    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .order("task_start_date", { ascending: false });

    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `doer_name.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    if (machineName && machineName.trim() !== "") {
      query = query.eq("machine_name", machineName.trim());
    }

    if (assignedTo && assignedTo.trim() !== "") {
      query = query.eq("doer_name", assignedTo.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching maintenance for edit:", error);
      return { data: [], total: 0 };
    }

    // Deduplicate client-side by (machine_name, task_description, doer_name)
    const groupMap = new Map<
      string,
      { task: MachineMaintenanceTask; count: number }
    >();

    for (const task of data || []) {
      const key = `${task.machine_name}|||${task.task_description || ""}|||${task.doer_name || ""}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { task, count: 1 });
      } else {
        groupMap.get(key)!.count += 1;
      }
    }

    const uniqueTasks = Array.from(groupMap.values()).map(
      ({ task, count }) => ({
        ...task,
        task_count: count,
      }),
    );

    // Client-side pagination
    const total = uniqueTasks.length;
    const from = page * pageSize;
    const paginated = uniqueTasks.slice(from, from + pageSize);

    return { data: paginated, total };
  } catch (error) {
    console.error(
      "Unexpected error in fetchUniqueMaintenanceTasksForEdit:",
      error,
    );
    return { data: [], total: 0 };
  }
};

// Fetch paginated maintenance tasks for edit view (all tasks, no deduplication)
export const fetchMaintenanceTasksForEdit = async (
  page = 0,
  pageSize = 50,
  searchTerm = "",
  machineName = "",
  assignedTo = "",
): Promise<{ data: MachineMaintenanceTask[]; total: number }> => {
  try {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("machine_maintenance")
      .select("*", { count: "exact" })
      .order("task_start_date", { ascending: false })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `doer_name.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    if (machineName && machineName.trim() !== "") {
      query = query.eq("machine_name", machineName.trim());
    }

    if (assignedTo && assignedTo.trim() !== "") {
      query = query.eq("doer_name", assignedTo.trim());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching maintenance for edit:", error);
      return { data: [], total: 0 };
    }

    return { data: data || [], total: count || 0 };
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceTasksForEdit:", error);
    return { data: [], total: 0 };
  }
};

// Update ALL matching maintenance tasks by (machine_name + task_description + doer_name)
export const updateMaintenanceTaskCascade = async (
  oldMachineName: string,
  oldTaskDescription: string,
  oldDoerName: string,
  updates: Partial<MachineMaintenanceTask>,
): Promise<MachineMaintenanceTask[] | null> => {
  try {
    // Remove fields that shouldn't be in the update payload
    const { task_id: _, created_at: __, ...cleanUpdates } = updates as any;

    let query = supabase
      .from("machine_maintenance")
      .update(cleanUpdates)
      .eq("machine_name", oldMachineName)
      .eq("task_description", oldTaskDescription || "");

    if (oldDoerName) {
      query = query.eq("doer_name", oldDoerName);
    } else {
      query = query.is("doer_name", null);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("Error in updateMaintenanceTaskCascade:", error);
      throw error;
    }

    // Attempt to also update maintenance_schedules if applicable
    try {
      let scheduleQuery = supabase
        .from("maintenance_schedules")
        .update(cleanUpdates)
        .eq("machine_name", oldMachineName)
        .eq("task_description", oldTaskDescription || "");

      if (oldDoerName) {
        scheduleQuery = scheduleQuery.eq("doer_name", oldDoerName);
      } else {
        scheduleQuery = scheduleQuery.is("doer_name", null);
      }

      await scheduleQuery; // Fire and forget or await, depending on if we need strict consistency
    } catch (schedErr) {
      console.warn("Could not update maintenance_schedules cascade:", schedErr);
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in updateMaintenanceTaskCascade:", error);
    throw error;
  }
};

// Delete ALL matching maintenance tasks by (machine_name + task_description + doer_name)
export const deleteMaintenanceTaskCascade = async (
  machineName: string,
  taskDescription: string,
  doerName: string,
): Promise<void> => {
  try {
    let query = supabase
      .from("machine_maintenance")
      .delete()
      .eq("machine_name", machineName)
      .eq("task_description", taskDescription || "");

    if (doerName) {
      query = query.eq("doer_name", doerName);
    } else {
      query = query.is("doer_name", null);
    }

    const { error } = await query;

    if (error) {
      console.error("Error in deleteMaintenanceTaskCascade:", error);
      throw error;
    }
  } catch (error) {
    console.error("Unexpected error in deleteMaintenanceTaskCascade:", error);
    throw error;
  }
};

// Delete maintenance tasks by id
export const deleteMaintenanceTasks = async (
  taskIds: number[],
): Promise<number[]> => {
  const { error } = await supabase
    .from("machine_maintenance")
    .delete()
    .in("task_id", taskIds);

  if (error) throw error;
  return taskIds;
};

// Fetch paginated repair tasks for edit view
export const fetchRepairTasksForEdit = async (
  page = 0,
  pageSize = 50,
  searchTerm = "",
  machineName = "",
  assignedTo = "",
): Promise<{ data: MachineRepairTask[]; total: number }> => {
  try {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `issue_detail.ilike.%${sv}%`,
        `assigned_to.ilike.%${sv}%`,
        `vendor_name.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    if (machineName && machineName.trim() !== "") {
      query = query.eq("machine_name", machineName.trim());
    }

    if (assignedTo && assignedTo.trim() !== "") {
      query = query.eq("assigned_to", assignedTo.trim());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching repair for edit:", error);
      return { data: [], total: 0 };
    }

    return { data: data || [], total: count || 0 };
  } catch (error) {
    console.error("Unexpected error in fetchRepairTasksForEdit:", error);
    return { data: [], total: 0 };
  }
};

// Delete repair tasks by task_id
export const deleteRepairTasks = async (
  taskIds: number[],
): Promise<number[]> => {
  const { error } = await supabase
    .from("machine_repair")
    .delete()
    .in("task_id", taskIds);

  if (error) throw error;
  return taskIds;
};

// Update a single repair task
export const updateRepairTask = async (
  taskId: number,
  updates: Partial<MachineRepairTask>,
): Promise<MachineRepairTask | null> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .update(updates)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error updating machine_repair:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in updateRepairTask:", error);
    throw error;
  }
};
// ============ Maintenance Schedule Edit APIs (Cascade) ============

export interface MaintenanceSchedule {
  id: number;
  created_at?: string;
  machine_name: string;
  task_description: string;
  frequency: string;
  assigned_to?: string;
  department?: string;
}

// Fetch paginated maintenance schedules for edit view
export const fetchMaintenanceSchedulesForEdit = async (
  page = 0,
  pageSize = 50,
  searchTerm = "",
  machineName = "",
  assignedTo = "",
): Promise<{ data: MaintenanceSchedule[]; total: number }> => {
  try {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("maintenance_schedules")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      const isNumeric = /^\d+$/.test(sv);
      let orConds = [
        `machine_name.ilike.%${sv}%`,
        `task_description.ilike.%${sv}%`,
        `assigned_to.ilike.%${sv}%`,
        `frequency.ilike.%${sv}%`,
      ];
      if (isNumeric) {
        orConds.push(`id.eq.${sv}`);
      }
      query = query.or(orConds.join(","));
    }

    if (machineName && machineName.trim() !== "") {
      query = query.eq("machine_name", machineName.trim());
    }

    if (assignedTo && assignedTo.trim() !== "") {
      query = query.eq("assigned_to", assignedTo.trim());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching schedules for edit:", error);
      return { data: [], total: 0 };
    }

    return { data: data || [], total: count || 0 };
  } catch (error) {
    console.error(
      "Unexpected error in fetchMaintenanceSchedulesForEdit:",
      error,
    );
    return { data: [], total: 0 };
  }
};

// Update schedule and cascade changes to pending tasks
export const updateMaintenanceScheduleCascade = async (
  id: number,
  oldData: MaintenanceSchedule,
  newData: Partial<MaintenanceSchedule>,
): Promise<MaintenanceSchedule | null> => {
  try {
    // 1. Update the schedule
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .update(newData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 2. Cascade update to pending tasks (today or future, not started/completed)
    // Criteria: machine_name & task_description match OLD data, and task is pending (actual_date is null)
    const today = new Date().toISOString().split("T")[0];
    const startOfToday = `${today}T00:00:00`;

    // Map fields: assigned_to -> doer_name
    const pendingUpdates: any = {};
    if (newData.machine_name)
      pendingUpdates.machine_name = newData.machine_name;
    if (newData.task_description)
      pendingUpdates.task_description = newData.task_description;
    if (newData.frequency) pendingUpdates.frequency = newData.frequency;
    if (newData.assigned_to !== undefined)
      pendingUpdates.doer_name = newData.assigned_to;
    if (newData.department !== undefined)
      pendingUpdates.department = newData.department;

    if (Object.keys(pendingUpdates).length > 0) {
      const { error: cascadeError } = await supabase
        .from("machine_maintenance")
        .update(pendingUpdates)
        .eq("machine_name", oldData.machine_name)
        .eq("task_description", oldData.task_description)
        .is("actual_date", null)
        .gte("task_start_date", startOfToday);

      if (cascadeError) {
        console.error("Error cascading update to tasks:", cascadeError);
        // We don't throw here to avoid rolling back the schedule update (Supabase REST doesn't support transactions easily)
        // In a real app, use RPC for transaction.
      }
    }

    return data;
  } catch (error) {
    console.error(
      "Unexpected error in updateMaintenanceScheduleCascade:",
      error,
    );
    throw error;
  }
};

// Delete schedule and cascade delete to pending tasks
export const deleteMaintenanceScheduleCascade = async (
  id: number,
  oldData: MaintenanceSchedule,
): Promise<number> => {
  try {
    // 1. Delete the schedule
    const { error } = await supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // 2. Cascade delete to pending tasks
    const today = new Date().toISOString().split("T")[0];
    const startOfToday = `${today}T00:00:00`;

    const { error: cascadeError } = await supabase
      .from("machine_maintenance")
      .delete()
      .eq("machine_name", oldData.machine_name)
      .eq("task_description", oldData.task_description)
      .is("actual_date", null)
      .gte("task_start_date", startOfToday);

    if (cascadeError) {
      console.error("Error cascading delete to tasks:", cascadeError);
    }

    return id;
  } catch (error) {
    console.error(
      "Unexpected error in deleteMaintenanceScheduleCascade:",
      error,
    );
    throw error;
  }
};

// Create a new maintenance task
export const createMaintenanceTask = async (
  task: Partial<MachineMaintenanceTask>,
): Promise<MachineMaintenanceTask | null> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .insert([task])
      .select()
      .single();

    if (error) {
      console.error("Error creating machine_maintenance:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in createMaintenanceTask:", error);
    throw error;
  }
};

// Create a new repair task
export const createRepairTask = async (
  task: Partial<MachineRepairTask>,
): Promise<MachineRepairTask | null> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .insert([task])
      .select()
      .single();

    if (error) {
      console.error("Error creating machine_repair:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in createRepairTask:", error);
    throw error;
  }
};
