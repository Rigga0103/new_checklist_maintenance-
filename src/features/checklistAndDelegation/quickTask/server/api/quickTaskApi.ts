import posthog from "posthog-js";
import supabase from "@/utils/supabaseClient";
import type {
  ChecklistTask,
  DelegationTask,
  MaintenanceTask,
  MaintenanceUpdatePayload,
  MaintenanceOriginalMatch,
  User,
  PaginatedResponse,
  ChecklistUpdatePayload,
  ChecklistOriginalMatch,
  DelegationOriginalMatch,
  DelegationUpdatePayload,
} from "../../types/types";
import { logChecklistAction } from "../../../assignTask/server/api/logChecklistApi";

// ============ Checklist API ============

/**
 * Fetch paginated checklist data with optional name filter
 * Uses server-side deduplication via RPC
 */
export const fetchChecklistData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
): Promise<PaginatedResponse<ChecklistTask>> => {
  try {
    // Call RPC for data
    const { data, error } = await supabase.rpc("get_unique_checklist_tasks", {
      page_number: page,
      page_size: pageSize,
      name_filter: nameFilter || "",
    });

    if (error) {
      console.error("Error fetching checklist rpc", error);
      return { data: [], total: 0 };
    }

    // Call RPC for count (or separate query)
    // We do this in parallel effectively
    const { data: countData, error: countError } = await supabase.rpc(
      "get_unique_checklist_tasks_count",
      {
        name_filter: nameFilter || "",
      },
    );

    if (countError) {
      console.error("Error fetching checklist count", countError);
    }

    return {
      data: (data as ChecklistTask[]) || [],
      total: typeof countData === "number" ? countData : 0,
    };
  } catch (error) {
    console.error("Error from Supabase", error);
    return { data: [], total: 0 };
  }
};

// ============ Delegation API ============

/**
 * Fetch paginated delegation data with optional name filter
 * Uses server-side deduplication via RPC
 */
export const fetchDelegationData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
): Promise<PaginatedResponse<DelegationTask>> => {
  try {
    const { data, error } = await supabase.rpc("get_unique_delegation_tasks", {
      page_number: page,
      page_size: pageSize,
      name_filter: nameFilter || "",
    });

    if (error) {
      console.error("Error fetching delegation rpc", error);
      return { data: [], total: 0 };
    }

    const { data: countData, error: countError } = await supabase.rpc(
      "get_unique_delegation_tasks_count",
      {
        name_filter: nameFilter || "",
      },
    );

    if (countError) {
      console.error("Error fetching delegation count", countError);
    }

    return {
      data: (data as DelegationTask[]) || [],
      total: typeof countData === "number" ? countData : 0,
    };
  } catch (error) {
    console.error("Error from Supabase delegation", error);
    return { data: [], total: 0 };
  }
};

// ============ Users API ============

/**
 * Fetch all users for filter dropdown
 */
export const fetchUsersData = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("user_name, status")
      .not("user_name", "is", null);

    if (error) {
      console.error("Error when fetching users", error);
      return [];
    }

    return data as User[];
  } catch (error) {
    console.error("Error from Supabase", error);
    return [];
  }
};

// ============ Delete APIs ============

/**
 * Delete checklist tasks by task_id from unique_checklist (template table).
 * Also removes all pending checklist instances linked to the template.
 */
export const deleteChecklistTasksApi = async (
  tasks: ChecklistTask[],
): Promise<ChecklistTask[]> => {
  const localDate = new Date();
  const year = localDate.getFullYear();
  const month = (localDate.getMonth() + 1).toString().padStart(2, "0");
  const day = localDate.getDate().toString().padStart(2, "0");
  const todayStr = `${year}-${month}-${day}T00:00:00`;

  for (const task of tasks) {
    // 1. Delete pending checklist instances linked via FK which are not done (status IS NULL) and not overdue
    await supabase
      .from("checklist")
      .delete()
      .eq("source_unique_id", task.task_id)
      .is("status", null)
      .gte("task_start_date", todayStr);

    // 2. Also catch any instances inserted without source_unique_id (legacy rows)
    if (task.name && task.task_description) {
      await supabase
        .from("checklist")
        .delete()
        .is("status", null)
        .eq("name", task.name)
        .eq("task_description", task.task_description)
        .gte("task_start_date", todayStr);
    }

    // 3. Delete the template row itself from unique_checklist
    const { error } = await supabase
      .from("unique_checklist")
      .delete()
      .eq("task_id", task.task_id);

    if (error) throw error;
  }

  const logParams = tasks.map((task) => ({
    checklistId: task.task_id?.toString() || "",
    action: "delete",
    department: task.department || "",
    givenBy: task.given_by || "",
    doerName: task.name || "",
    frequency: task.frequency || "",
    fromDate: task.task_start_date || "",
    endDate: (task as any).planned_date || "",
    description: task.task_description || "",
  }));
  await logChecklistAction(logParams);

  posthog.capture("checklist_tasks_deleted", {
    task_count: tasks.length,
    task_ids: tasks.map((t) => t.task_id),
  });

  return tasks;
};

/**
 * Delete delegation tasks by task_id (exact match).
 */
export const deleteDelegationTasksApi = async (
  tasks: DelegationTask[],
): Promise<DelegationTask[]> => {
  for (const task of tasks) {
    const { error } = await supabase
      .from("delegation")
      .delete()
      .eq("task_id", task.task_id);

    if (error) throw error;
  }

  const logParams = tasks.map((task) => ({
    checklistId: task.task_id?.toString() || "",
    action: "delete",
    department: task.department || "",
    givenBy: task.given_by || "",
    doerName: task.name || "",
    frequency: task.frequency || "",
    fromDate: task.task_start_date || "",
    endDate: task.planned_date || "",
    description: task.task_description || "",
  }));
  await logChecklistAction(logParams);

  posthog.capture("delegation_tasks_deleted", {
    task_count: tasks.length,
    task_ids: tasks.map((t) => t.task_id),
  });

  return tasks;
};

// ============ Update APIs ============

/**
 * Update checklist task by matching department + name + task_description
 * Updates all matching rows where submission_date is null
 */
export const updateChecklistTaskApi = async (
  updatedTask: ChecklistUpdatePayload,
  originalTask: ChecklistOriginalMatch,
): Promise<ChecklistTask[]> => {
  const updatePayload: Record<string, unknown> = {};

  if (updatedTask.department !== undefined)
    updatePayload.department = updatedTask.department;
  if (updatedTask.given_by !== undefined)
    updatePayload.given_by = updatedTask.given_by;
  if (updatedTask.name !== undefined)
    updatePayload.name = updatedTask.name;
  if (updatedTask.task_description !== undefined)
    updatePayload.task_description = updatedTask.task_description;
  if (updatedTask.enable_reminder !== undefined)
    updatePayload.enable_reminder = updatedTask.enable_reminder;
  if (updatedTask.require_attachment !== undefined)
    updatePayload.require_attachment = updatedTask.require_attachment;
  // unique_checklist stores the image in the `image` column
  if (updatedTask.image !== undefined)
    updatePayload.image = updatedTask.image;
  if (updatedTask.task_start_date !== undefined) {
    updatePayload.task_start_date = updatedTask.task_start_date
      ? new Date(updatedTask.task_start_date).toISOString()
      : null;
  }
  // Allow frequency to be updated on the template
  if (updatedTask.frequency !== undefined)
    updatePayload.frequency = updatedTask.frequency;

  // Update the template in unique_checklist.
  const { data, error } = await supabase
    .from("unique_checklist")
    .update(updatePayload)
    .eq("task_id", originalTask.task_id)
    .select();

  // If task_start_date changed, delete pending rows that are before the new
  // start date (they're no longer relevant). Rows on/after the new date keep
  // their own scheduled dates so recurring instances stay intact.
  if (updatedTask.task_start_date) {
    const newDate = updatedTask.task_start_date;
    await supabase
      .from("checklist")
      .delete()
      .eq("source_unique_id", originalTask.task_id)
      .is("submission_date", null)
      .lt("task_start_date", `${newDate}T00:00:00`);
  }

  // If frequency changed, wipe ALL pending checklist instances so they can be
  // regenerated with the correct new recurrence pattern.
  if (updatedTask.frequency !== undefined) {
    await supabase
      .from("checklist")
      .delete()
      .eq("source_unique_id", originalTask.task_id)
      .is("submission_date", null);
  }

  if (error) {
    console.error("Supabase error (unique_checklist update):", error);
    throw error;
  }

  if (data && data.length > 0) {
    const logParams = data.map((task) => ({
      checklistId: task.task_id?.toString() || "",
      action: "update",
      department: task.department || "",
      givenBy: task.given_by || "",
      doerName: task.name || "",
      frequency: task.frequency || "",
      fromDate: task.task_start_date || "",
      endDate: task.task_end_date || "",
      description: task.task_description || "",
    }));
    await logChecklistAction(logParams);
  }

  posthog.capture("checklist_task_updated", {
    task_id: originalTask.task_id,
    changed_fields: Object.keys(updatedTask),
  });

  return (data ?? []) as unknown as ChecklistTask[];
};

/**
 * Update delegation task by matching department + name + task_description
 * Updates all matching rows where submission_date is null
 */
export const updateDelegationTaskApi = async (
  updatedTask: DelegationUpdatePayload,
  originalTask: DelegationOriginalMatch,
): Promise<DelegationTask[]> => {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updatedTask.department !== undefined)
    updatePayload.department = updatedTask.department;
  if (updatedTask.given_by !== undefined)
    updatePayload.given_by = updatedTask.given_by;
  if (updatedTask.name !== undefined) updatePayload.name = updatedTask.name;
  if (updatedTask.task_description !== undefined)
    updatePayload.task_description = updatedTask.task_description;
  if (updatedTask.frequency !== undefined)
    updatePayload.frequency = updatedTask.frequency;
  if (updatedTask.enable_reminder !== undefined)
    updatePayload.enable_reminder = updatedTask.enable_reminder;
  if (updatedTask.require_attachment !== undefined)
    updatePayload.require_attachment = updatedTask.require_attachment;

  if (updatedTask.task_start_date !== undefined) {
    updatePayload.task_start_date = updatedTask.task_start_date
      ? new Date(updatedTask.task_start_date).toISOString()
      : null;
  }
  if (updatedTask.planned_date !== undefined) {
    updatePayload.planned_date = updatedTask.planned_date
      ? new Date(updatedTask.planned_date).toISOString()
      : null;
  }

  let query = supabase
    .from("delegation")
    .update(updatePayload)
    .eq("task_id", originalTask.task_id);

  const { data, error } = await query.select();

  if (error) {
    console.error("Error editing delegation task (cascading):", error);
    throw error;
  }

  if (data && data.length > 0) {
    const logParams = data.map(task => ({
      checklistId: task.task_id?.toString() || "",
      action: "update",
      department: task.department || "",
      givenBy: task.given_by || "",
      doerName: task.name || "",
      frequency: task.frequency || "",
      fromDate: task.task_start_date || "",
      endDate: task.planned_date || "",
      description: task.task_description || ""
    }));
    await logChecklistAction(logParams);
  }

  posthog.capture("delegation_task_updated", {
    task_id: originalTask.task_id,
    changed_fields: Object.keys(updatedTask),
  });

  return data as DelegationTask[];
};

// ============ Maintenance API ============

export const fetchMaintenanceData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
): Promise<PaginatedResponse<MaintenanceTask>> => {
  try {
    const [{ data, error }, { data: countData, error: countError }] = await Promise.all([
      supabase.rpc("get_unique_maintenance_tasks", {
        page_number: page,
        page_size: pageSize,
        name_filter: nameFilter || "",
      }),
      supabase.rpc("get_unique_maintenance_tasks_count", {
        name_filter: nameFilter || "",
      }),
    ]);

    if (error) {
      console.error("Error fetching maintenance rpc", error);
      return { data: [], total: 0 };
    }
    if (countError) console.error("Error fetching maintenance count", countError);

    return {
      data: (data as MaintenanceTask[]) || [],
      total: typeof countData === "number" ? countData : 0,
    };
  } catch (error) {
    console.error("Error from Supabase maintenance", error);
    return { data: [], total: 0 };
  }
};

export const deleteMaintenanceTasksApi = async (
  tasks: MaintenanceTask[],
): Promise<MaintenanceTask[]> => {
  for (const task of tasks) {
    // 1a. Delete machine_maintenance rows linked via FK (tasks created via assign task)
    await supabase
      .from("machine_maintenance")
      .delete()
      .eq("source_unique_id", task.task_id);

    // 1b. Also delete by text match for rows inserted without source_unique_id
    if (task.task_description && task.name && task.machine_name) {
      await supabase
        .from("machine_maintenance")
        .delete()
        .ilike("task_description", task.task_description.trim())
        .ilike("doer_name", task.name.trim())
        .ilike("machine_name", task.machine_name.trim());
    }

    // 2. Delete the template row itself
    const { error } = await supabase
      .from("unique_maintanence")
      .delete()
      .eq("task_id", task.task_id);
    if (error) throw error;
  }
  return tasks;
};

export const updateMaintenanceTaskApi = async (
  updatedTask: MaintenanceUpdatePayload,
  originalTask: MaintenanceOriginalMatch,
): Promise<MaintenanceTask[]> => {
  const payload: Record<string, unknown> = {};

  if (updatedTask.machine_name !== undefined) payload.machine_name = updatedTask.machine_name;
  if (updatedTask.given_by !== undefined) payload.given_by = updatedTask.given_by;
  if (updatedTask.name !== undefined) payload.name = updatedTask.name;
  if (updatedTask.task_description !== undefined) payload.task_description = updatedTask.task_description;
  if (updatedTask.frequency !== undefined) payload.frequency = updatedTask.frequency;
  if (updatedTask.enable_reminder !== undefined) payload.enable_reminder = updatedTask.enable_reminder;
  if (updatedTask.require_attachment !== undefined) payload.require_attachment = updatedTask.require_attachment;
  if (updatedTask.task_start_date !== undefined) payload.task_start_date = updatedTask.task_start_date || null;
  if (updatedTask.task_end_date !== undefined) payload.task_end_date = updatedTask.task_end_date || null;
  if (updatedTask.image !== undefined) payload.image = updatedTask.image;

  // Update the template; trg_sync_maintenance_from_template cascades to pending tasks
  const { data, error } = await supabase
    .from("unique_maintanence")
    .update(payload)
    .eq("task_id", originalTask.task_id)
    .select();

  if (error) {
    console.error("Supabase error (unique_maintanence update):", error);
    throw error;
  }

  return (data ?? []) as MaintenanceTask[];
};
