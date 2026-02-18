import supabase from "@/utils/supabaseClient";
import type {
  ChecklistTask,
  DelegationTask,
  User,
  PaginatedResponse,
  ChecklistUpdatePayload,
  ChecklistOriginalMatch,
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
 * Delete checklist tasks by matching name + task_description
 * Only deletes where submission_date is null
 */
export const deleteChecklistTasksApi = async (
  tasks: ChecklistTask[],
): Promise<ChecklistTask[]> => {
  for (const task of tasks) {
    const { error } = await supabase
      .from("checklist")
      .delete()
      .eq("name", task.name)
      .eq("task_description", task.task_description)
      .is("submission_date", null);

    if (error) throw error;
  }
  return tasks;
};

/**
 * Delete delegation tasks by task_id
 * Only deletes where submission_date is null
 */
export const deleteDelegationTasksApi = async (
  taskIds: number[],
): Promise<number[]> => {
  const { error } = await supabase
    .from("delegation")
    .delete()
    .in("task_id", taskIds)
    .is("submission_date", null);

  if (error) throw error;
  return taskIds;
};

// ============ Update API ============

/**
 * Update checklist task by matching department, name, task_description
 * Updates all matching rows where submission_date is null
 */
export const updateChecklistTaskApi = async (
  updatedTask: ChecklistUpdatePayload,
  originalTask: ChecklistOriginalMatch,
): Promise<ChecklistTask[]> => {
  const { data, error } = await supabase
    .from("checklist")
    .update({
      department: updatedTask.department,
      given_by: updatedTask.given_by,
      name: updatedTask.name,
      task_description: updatedTask.task_description,
      enable_reminder: updatedTask.enable_reminder,
      require_attachment: updatedTask.require_attachment,
      remark: updatedTask.remark,
    })
    .eq("department", originalTask.department)
    .eq("name", originalTask.name)
    .eq("task_description", originalTask.task_description)
    .is("submission_date", null)
    .select();

  if (error) {
    console.error("Supabase error:", error);
    throw error;
  }

  return data as ChecklistTask[];
};
