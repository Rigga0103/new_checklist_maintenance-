import supabase from "@/utils/supabaseClient";
import { DelegationTask, DelegationSubmission } from "../../types/types";

interface FetchResult {
  data: DelegationTask[];
  totalCount: number;
}

// Fetch delegation tasks sorted by date (pending tasks)
export const fetchDelegationDataSortByDate = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  roleOverride?: string | null,
  nameFilter?: string,
  statusFilter?: string,
): Promise<FetchResult> => {
  const role =
    roleOverride ??
    (typeof window !== "undefined" ? localStorage.getItem("role") : null);
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayISO = endOfToday.toISOString();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("delegation")
      .select("*", { count: "exact" })
      .lte("task_start_date", endOfTodayISO)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    if (statusFilter && statusFilter !== "all" && statusFilter !== "All") {
      if (statusFilter.toLowerCase() === "overdue") {
        query = query
          .lt("planned_date", endOfTodayISO)
          .or("status.neq.done,status.is.null");
      } else if (statusFilter.toLowerCase() === "pending") {
        query = query.or("status.eq.pending,status.is.null");
      } else if (statusFilter.toLowerCase() === "extend") {
        query = query.eq("status", "extend");
      } else {
        query = query.eq("status", statusFilter);
      }
    } else {
      query = query.or("status.neq.done,status.is.null"); // Show pending + extend tasks
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      query = query.or(
        `task_id.ilike.%${searchValue}%,name.ilike.%${searchValue}%,given_by.ilike.%${searchValue}%,department.ilike.%${searchValue}%,task_description.ilike.%${searchValue}%`,
      );
    }

    if (role === "user" && username) {
      query = query.eq("name", username);
    }

    if (nameFilter) {
      query = query.eq("name", nameFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching delegation data:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data || [], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

// Fetch delegation history (completed tasks)
export const fetchDelegationDataForHistory = async (
  page = 1,
  searchTerm = "",
  roleOverride?: string | null,
  nameFilter?: string,
): Promise<FetchResult> => {
  const itemsPerPage = 50;
  const start = (page - 1) * itemsPerPage;

  const role =
    roleOverride ??
    (typeof window !== "undefined" ? localStorage.getItem("role") : null);
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  try {
    let query = supabase
      .from("delegation")
      .select("*", { count: "exact" })
      .order("submission_date", { ascending: false })
      .eq("status", "done") // Only show completed tasks in history
      .range(start, start + itemsPerPage - 1);

    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      query = query.or(
        `task_id.ilike.%${searchValue}%,name.ilike.%${searchValue}%,given_by.ilike.%${searchValue}%,department.ilike.%${searchValue}%,task_description.ilike.%${searchValue}%`,
      );
    }

    if (role === "user" && username) {
      query = query.eq("name", username);
    }

    if (nameFilter) {
      query = query.eq("name", nameFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching delegation history:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data || [], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

// ============ Helper for Week Range ============
function getWeekRange() {
  const current = new Date();
  const day = current.getDay();

  // If today is Sunday (0), offset by 6 days to get the *previous* Monday
  // Otherwise, subtract (day - 1) to get the *current* Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  // Monday
  const mondayOffset = new Date(current);
  mondayOffset.setDate(current.getDate() + diffToMonday);
  mondayOffset.setHours(0, 0, 0, 0);

  // End date: today, but capped at Saturday (if Sunday, go back to Saturday)
  const endDate = new Date(current);
  if (day === 0) {
    endDate.setDate(current.getDate() - 1); // Sunday → back to Saturday
  }
  endDate.setHours(23, 59, 59, 999);

  return {
    start: mondayOffset.toISOString(),
    end: endDate.toISOString(),
  };
}

// Fetch delegation tasks for the last 7 days (Monday to Saturday)
export const fetchDelegationLast7Days = async (
  page = 1,
  limit = 1000,
  searchTerm = "",
  roleOverride?: string | null,
  nameFilter?: string,
): Promise<FetchResult> => {
  const role =
    roleOverride ??
    (typeof window !== "undefined" ? localStorage.getItem("role") : null);
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  try {
    const { start: startOfWeek, end: endOfWeek } = getWeekRange();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("delegation")
      .select("*", { count: "exact" })
      .gte("task_start_date", startOfWeek)
      .lte("task_start_date", endOfWeek)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      query = query.or(
        `task_id.ilike.%${searchValue}%,name.ilike.%${searchValue}%,given_by.ilike.%${searchValue}%,department.ilike.%${searchValue}%,task_description.ilike.%${searchValue}%`,
      );
    }

    if (role === "user" && username) {
      query = query.eq("name", username);
    }

    if (nameFilter) {
      query = query.eq("name", nameFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching last 7 days delegation data:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data || [], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

// Update delegation task with submission
export const updateDelegationData = async (
  submissionData: DelegationSubmission[],
): Promise<DelegationTask[]> => {
  try {
    if (!Array.isArray(submissionData) || submissionData.length === 0) {
      throw new Error("Invalid submission data");
    }

    // Images are already uploaded via uploadChecklistImage hook
    // Just use the previewUrl directly
    const results = await Promise.all(
      submissionData.map(async (item) => {
        const imageUrl = item.image?.previewUrl || null;
        const now = new Date().toISOString();

        console.log("Processing delegation submission:", {
          taskId: item.taskId,
          status: item.status,
          hasImage: !!item.image,
          imageUrl,
          nextExtendDate: item.nextExtendDate,
        });

        let cleanUpdate: Record<string, unknown>;

        if (item.status === "Extend date") {
          // For extend: update planned_date, set status to 'extend', do NOT set submission_date
          cleanUpdate = {
            status: "extend",
            planned_date: item.nextExtendDate
              ? new Date(item.nextExtendDate).toISOString()
              : now,
            updated_at: now,
            remarks: item.remarks || null,
            image: imageUrl,
          };
        } else {
          // For Done: set submission_date and status to 'done'
          cleanUpdate = {
            status: "done",
            submission_date: now,
            updated_at: now,
            remarks: item.remarks || null,
            image: imageUrl,
          };
        }

        const { data, error } = await supabase
          .from("delegation")
          .update(cleanUpdate)
          .eq("task_id", item.taskId)
          .select();

        if (error) {
          console.error(`Error updating task ${item.taskId}:`, error);
          throw error;
        }
        return data[0];
      }),
    );

    return results;
  } catch (error) {
    console.error("Error in updateDelegationData:", error);
    throw error;
  }
};

// Mark delegation as admin done
export const postDelegationAdminDoneAPI = async (
  selectedItems: DelegationTask[] | number[],
): Promise<{ data?: DelegationTask[]; error?: Error }> => {
  try {
    if (!selectedItems || selectedItems.length === 0) {
      return { error: new Error("No items selected") };
    }

    const updates = selectedItems.map((item) => ({
      task_id: typeof item === "object" ? item.task_id : item,
      admin_done: "Done",
    }));

    const { data, error } = await supabase
      .from("delegation")
      .upsert(updates)
      .select();

    if (error) {
      console.error("Error updating delegation items:", error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error("Error in supabase operation:", error);
    return { error: error as Error };
  }
};

// Edit core fields of a delegation task (admin edit)
export const editDelegationTaskApi = async (
  taskId: number,
  fields: Partial<
    Pick<
      DelegationTask,
      | "department"
      | "given_by"
      | "name"
      | "task_description"
      | "task_start_date"
      | "planned_date"
      | "enable_reminder"
      | "require_attachment"
      | "frequency"
    >
  >,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (fields.department !== undefined)
      updatePayload.department = fields.department;
    if (fields.given_by !== undefined) updatePayload.given_by = fields.given_by;
    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.task_description !== undefined)
      updatePayload.task_description = fields.task_description;
    if (fields.frequency !== undefined)
      updatePayload.frequency = fields.frequency;
    if (fields.enable_reminder !== undefined)
      updatePayload.enable_reminder = fields.enable_reminder;
    if (fields.require_attachment !== undefined)
      updatePayload.require_attachment = fields.require_attachment;

    // Convert date strings to ISO if provided
    if (fields.task_start_date !== undefined) {
      updatePayload.task_start_date = fields.task_start_date
        ? new Date(fields.task_start_date).toISOString()
        : null;
    }
    if (fields.planned_date !== undefined) {
      updatePayload.planned_date = fields.planned_date
        ? new Date(fields.planned_date).toISOString()
        : null;
    }

    const { error } = await supabase
      .from("delegation")
      .update(updatePayload)
      .eq("task_id", taskId);

    if (error) {
      console.error("Error editing delegation task:", error);
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in editDelegationTaskApi:", error);
    return { success: false, message: "Failed to update task" };
  }
};
