import supabase from "@/utils/supabaseClient";
import type {
  ChecklistItem,
  ChecklistFetchResponse,
  ChecklistSubmissionItem,
} from "../../types/types";

// ============ Fetch Checklist (Active Tasks) ============

/**
 * Fetch checklist data sorted by date with pagination and search
 * Only shows tasks where submission_date is null (pending)
 */
export const fetchChecklistDataSortByDate = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<ChecklistFetchResponse> => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayISO = endOfToday.toISOString();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("checklist")
      .select("*", { count: "exact" })
      .lte("task_start_date", endOfTodayISO)
      .order("task_start_date", { ascending: true })
      .is("submission_date", null)
      .is("submission_date", null)
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      query = query.or(
        `task_id.ilike.%${searchValue}%,name.ilike.%${searchValue}%,given_by.ilike.%${searchValue}%,department.ilike.%${searchValue}%,task_description.ilike.%${searchValue}%`,
      );
    }

    // Apply role filter - users only see their own tasks
    if (role === "user" && username) {
      query = query.eq("name", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error when fetching data", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as ChecklistItem[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase", error);
    return { data: [], totalCount: 0 };
  }
};

// ============ Fetch Checklist History ============

/**
 * Fetch completed checklist tasks (history view)
 */
export const fetchChecklistDataForHistory = async (
  page = 1,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<ChecklistItem[]> => {
  const itemsPerPage = 50;
  const start = (page - 1) * itemsPerPage;

  try {
    let query = supabase
      .from("checklist")
      .select("*", { count: "exact" })
      .order("task_start_date", { ascending: false })
      .not("submission_date", "is", null)
      .not("status", "is", null)
      .range(start, start + itemsPerPage - 1);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      query = query.or(
        `task_id.ilike.%${searchValue}%,name.ilike.%${searchValue}%,given_by.ilike.%${searchValue}%,department.ilike.%${searchValue}%,task_description.ilike.%${searchValue}%`,
      );
    }

    // Apply role filter
    if (role === "user" && username) {
      query = query.eq("name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error when fetching data", error);
      return [];
    }

    return data as ChecklistItem[];
  } catch (error) {
    console.error("Error from Supabase", error);
    return [];
  }
};

// ============ Submit Checklist ============

/**
 * Update checklist with submission data
 * Images are already uploaded to Supabase Storage via uploadChecklistImage
 * The previewUrl field contains the Supabase public URL
 */
export const updateChecklistData = async (
  submissionData: ChecklistSubmissionItem[],
): Promise<ChecklistItem[]> => {
  if (!Array.isArray(submissionData) || submissionData.length === 0) {
    throw new Error("Invalid submission data");
  }

  const updates = submissionData.map((item) => {
    // Image URL is already uploaded, just use previewUrl directly
    const imageUrl = item.image?.previewUrl || null;

    console.log("Processing task submission:", {
      taskId: item.taskId,
      hasImage: !!item.image,
      imageUrl,
      fullImageData: item.image,
    });

    return {
      task_id: item.taskId,
      status: item.status,
      remark: item.remarks,
      submission_date: new Date().toISOString(),
      image: imageUrl,
      next_extend_date: item.nextExtendDate || null,
    };
  });

  // Update each task individually
  const results = await Promise.all(
    updates.map(async (updateObj) => {
      const { data, error } = await supabase
        .from("checklist")
        .update({
          status: updateObj.status,
          remark: updateObj.remark,
          submission_date: updateObj.submission_date,
          image: updateObj.image,
          next_extend_date: updateObj.next_extend_date,
        })
        .eq("task_id", updateObj.task_id)
        .select();

      if (error) {
        console.error(`Error updating task ${updateObj.task_id}:`, error);
        throw error;
      }
      return data[0];
    }),
  );

  return results as ChecklistItem[];
};

// ============ Admin Mark Done ============

/**
 * Mark checklist items as admin done
 */
export const postChecklistAdminDone = async (
  selectedItems: ChecklistItem[] | number[],
): Promise<{ data?: ChecklistItem[]; error?: Error }> => {
  try {
    if (!selectedItems || selectedItems.length === 0) {
      return { error: new Error("No items selected") };
    }

    const updates = selectedItems.map((item) => ({
      task_id: typeof item === "object" ? item.task_id : item,
      admin_done: "Done",
    }));

    const { data, error } = await supabase
      .from("checklist")
      .upsert(updates)
      .select();

    if (error) {
      console.error("Error updating checklist items:", error);
      return { error };
    }

    return { data: data as ChecklistItem[] };
  } catch (error) {
    console.error("Error in supabase operation:", error);
    return { error: error as Error };
  }
};
