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
 * Uses deduplication by task_description
 */
export const fetchChecklistData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
): Promise<PaginatedResponse<ChecklistTask>> => {
  try {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    // Step 1: Get unique task_descriptions with conditions applied at database level
    let uniqueQuery = supabase
      .from("checklist")
      .select("task_description")
      .is("submission_date", null)
      .not("task_description", "is", null);

    if (nameFilter) {
      uniqueQuery = uniqueQuery.eq("name", nameFilter);
    }

    const { data: allUniqueDescriptions, error: uniqueError } =
      await uniqueQuery;

    if (uniqueError) {
      console.error("Error when fetching unique descriptions", uniqueError);
      return { data: [], total: 0 };
    }

    // Get truly unique descriptions (client-side dedupe for descriptions only)
    const seenDescriptions = new Set<string>();
    const uniqueDescriptions = (allUniqueDescriptions || [])
      .map((row) => row.task_description as string)
      .filter((desc) => {
        if (!desc || seenDescriptions.has(desc)) return false;
        seenDescriptions.add(desc);
        return true;
      });

    if (uniqueDescriptions.length === 0) {
      return { data: [], total: 0 };
    }

    // Step 2: Get paginated slice of unique descriptions for current page
    const paginatedDescriptions = uniqueDescriptions.slice(start, end + 1);

    if (paginatedDescriptions.length === 0) {
      return { data: [], total: uniqueDescriptions.length };
    }

    // Step 3: Fetch actual data only for the paginated unique descriptions
    let dataQuery = supabase
      .from("checklist")
      .select("*")
      .in("task_description", paginatedDescriptions)
      .is("submission_date", null)
      .order("task_start_date", { ascending: true });

    if (nameFilter) {
      dataQuery = dataQuery.eq("name", nameFilter);
    }

    const { data, error } = await dataQuery;

    if (error) {
      console.error("Error when fetching data", error);
      return { data: [], total: 0 };
    }

    // Final client-side deduplication (should be minimal now)
    const finalSeen = new Set<string>();
    const finalData = (data || []).filter((row) => {
      if (finalSeen.has(row.task_description)) {
        return false;
      }
      finalSeen.add(row.task_description);
      return true;
    }) as ChecklistTask[];

    return {
      data: finalData,
      total: uniqueDescriptions.length,
    };
  } catch (error) {
    console.error("Error from Supabase", error);
    return { data: [], total: 0 };
  }
};

// ============ Delegation API ============

/**
 * Fetch paginated delegation data with optional name filter
 * Uses deduplication by task_description
 */
export const fetchDelegationData = async (
  page = 0,
  pageSize = 50,
  nameFilter = "",
): Promise<PaginatedResponse<DelegationTask>> => {
  try {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    // Step 1: Get unique task_descriptions
    let uniqueQuery = supabase
      .from("delegation")
      .select("task_description")
      .is("submission_date", null)
      .not("task_description", "is", null);

    if (nameFilter) {
      uniqueQuery = uniqueQuery.eq("name", nameFilter);
    }

    const { data: allUniqueDescriptions, error: uniqueError } =
      await uniqueQuery;

    if (uniqueError) {
      console.error("Error when fetching unique descriptions", uniqueError);
      return { data: [], total: 0 };
    }

    // Get truly unique descriptions
    const seenDescriptions = new Set<string>();
    const uniqueDescriptions = (allUniqueDescriptions || [])
      .map((row) => row.task_description as string)
      .filter((desc) => {
        if (!desc || seenDescriptions.has(desc)) return false;
        seenDescriptions.add(desc);
        return true;
      });

    if (uniqueDescriptions.length === 0) {
      return { data: [], total: 0 };
    }

    // Step 2: Get paginated slice
    const paginatedDescriptions = uniqueDescriptions.slice(start, end + 1);

    if (paginatedDescriptions.length === 0) {
      return { data: [], total: uniqueDescriptions.length };
    }

    // Step 3: Fetch actual data
    let dataQuery = supabase
      .from("delegation")
      .select("*")
      .in("task_description", paginatedDescriptions)
      .is("submission_date", null)
      .order("task_id", { ascending: true });

    if (nameFilter) {
      dataQuery = dataQuery.eq("name", nameFilter);
    }

    const { data, error } = await dataQuery;

    if (error) {
      console.error("Error when fetching delegation data", error);
      return { data: [], total: 0 };
    }

    // Final client-side deduplication
    const finalSeen = new Set<string>();
    const finalData = (data || []).filter((row) => {
      if (finalSeen.has(row.task_description)) {
        return false;
      }
      finalSeen.add(row.task_description);
      return true;
    }) as DelegationTask[];

    return {
      data: finalData,
      total: uniqueDescriptions.length,
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
