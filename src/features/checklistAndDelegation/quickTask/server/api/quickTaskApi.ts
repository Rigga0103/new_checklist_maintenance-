import supabase from "@/utils/supabaseClient";
import type {
  ChecklistTask,
  DelegationTask,
  User,
  PaginatedResponse,
  ChecklistUpdatePayload,
  ChecklistOriginalMatch,
  DelegationOriginalMatch,
  DelegationUpdatePayload,
} from "../../types/types";

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
      .select("user_name")
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
 * Delete checklist tasks by matching department + name + task_description
 * Only deletes where submission_date is null (pending)
 */
export const deleteChecklistTasksApi = async (
  tasks: ChecklistTask[],
): Promise<ChecklistTask[]> => {
  for (const task of tasks) {
    let query = supabase.from("checklist").delete().is("submission_date", null);

    // Strict composite match
    if (task.department) query = query.eq("department", task.department);
    else query = query.is("department", null);

    if (task.name) query = query.eq("name", task.name);
    else query = query.is("name", null);

    if (task.task_description)
      query = query.eq("task_description", task.task_description);
    else query = query.is("task_description", null);

    const { error } = await query;
    if (error) throw error;
  }
  return tasks;
};

/**
 * Delete delegation tasks by matching department + name + task_description
 * Only deletes where submission_date is null (pending)
 */
export const deleteDelegationTasksApi = async (
  tasks: DelegationTask[],
): Promise<DelegationTask[]> => {
  for (const task of tasks) {
    let query = supabase
      .from("delegation")
      .delete()
      .is("submission_date", null);

    // Strict composite match
    if (task.department) query = query.eq("department", task.department);
    else query = query.is("department", null);

    if (task.name) query = query.eq("name", task.name);
    else query = query.is("name", null);

    if (task.task_description)
      query = query.eq("task_description", task.task_description);
    else query = query.is("task_description", null);

    const { error } = await query;
    if (error) throw error;
  }
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
  if (updatedTask.name !== undefined) updatePayload.name = updatedTask.name;
  if (updatedTask.task_description !== undefined)
    updatePayload.task_description = updatedTask.task_description;
  if (updatedTask.enable_reminder !== undefined)
    updatePayload.enable_reminder = updatedTask.enable_reminder;
  if (updatedTask.require_attachment !== undefined)
    updatePayload.require_attachment = updatedTask.require_attachment;
  if (updatedTask.remark !== undefined)
    updatePayload.remark = updatedTask.remark;

  let query = supabase
    .from("checklist")
    .update(updatePayload)
    .is("submission_date", null);

  // Strict composite match
  if (originalTask.department)
    query = query.eq("department", originalTask.department);
  else query = query.is("department", null);

  if (originalTask.name) query = query.eq("name", originalTask.name);
  else query = query.is("name", null);

  if (originalTask.task_description)
    query = query.eq("task_description", originalTask.task_description);
  else query = query.is("task_description", null);

  const { data, error } = await query.select();

  if (error) {
    console.error("Supabase error (Checklist update):", error);
    throw error;
  }

  return data as ChecklistTask[];
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
    .is("submission_date", null);

  // Strict composite match
  if (originalTask.department)
    query = query.eq("department", originalTask.department);
  else query = query.is("department", null);

  if (originalTask.name) query = query.eq("name", originalTask.name);
  else query = query.is("name", null);

  if (originalTask.task_description)
    query = query.eq("task_description", originalTask.task_description);
  else query = query.is("task_description", null);

  const { data, error } = await query.select();

  if (error) {
    console.error("Error editing delegation task (cascading):", error);
    throw error;
  }

  return data as DelegationTask[];
};
