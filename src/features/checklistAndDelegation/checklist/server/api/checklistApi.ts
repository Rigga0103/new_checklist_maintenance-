import supabase from "@/utils/supabaseClient";
import type {
  ChecklistItem,
  ChecklistFetchResponse,
  ChecklistSubmissionItem,
} from "../../types/types";

const applyNameFilter = (query: any, filterName: string | null | undefined) => {
  if (!filterName || filterName === "all" || filterName === "") return query;
  const nameToFilter = filterName.trim();
  if (nameToFilter === "Ritu Sahu") {
    return query.in("name", ["Ritu Sahu", "Hemlata Verma"]);
  }
  return query.eq("name", nameToFilter);
};

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
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Only show today's tasks (matching dashboard "Recent & Today" logic)
    const today = new Date().toISOString().split("T")[0];
    const startOfToday = `${today}T00:00:00`;
    const endOfToday = `${today}T23:59:59`;

    let query = supabase
      .from("checklist")
      .select("*", { count: "exact" })
      .gte("task_start_date", startOfToday)
      .lte("task_start_date", endOfToday)
      .is("submission_date", null)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `name.ilike.%${searchValue}%`,
        `given_by.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter - users only see their own tasks
    if (role === "user" && username) {
      query = applyNameFilter(query, username);
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
  startDate = "",
  endDate = "",
  nameFilter = "",
): Promise<ChecklistItem[]> => {
  const itemsPerPage = 50;
  const start = (page - 1) * itemsPerPage;

  try {
    let query = supabase
      .from("checklist")
      .select("*", { count: "exact" })
      .order("submission_date", { ascending: false })
      .not("submission_date", "is", null)
      .not("status", "is", null)
      .range(start, start + itemsPerPage - 1);

    if (startDate) {
      const startOfDay = new Date(`${startDate}T00:00:00`);
      query = query.gte("submission_date", startOfDay.toISOString());
    }

    if (endDate) {
      const endOfDay = new Date(`${endDate}T23:59:59.999`);
      query = query.lte("submission_date", endOfDay.toISOString());
    }

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `name.ilike.%${searchValue}%`,
        `given_by.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter
    if (role === "user" && username) {
      query = applyNameFilter(query, username);
    }

    // Apply name filter (admin filtering by a specific user)
    if (nameFilter && nameFilter.trim() !== "") {
      query = applyNameFilter(query, nameFilter);
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

// ============ Fetch Checklist Last 7 Days (Mon–Sat) ============

/**
 * Get the most recent Monday (if today is Sunday, use previous Monday).
 * Returns Monday and Saturday date strings in YYYY-MM-DD format.
 */
function getWeekRange(): { monday: string; endDay: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...,6=Sat

  // Calculate days since the most recent Monday
  // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);

  // End date: today, but if Sunday go back to Saturday
  const endDay = new Date(today);
  if (dayOfWeek === 0) {
    endDay.setDate(today.getDate() - 1); // Sunday → back to Saturday
  }

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { monday: fmt(monday), endDay: fmt(endDay) };
}

/**
 * Fetch all checklist tasks from the most recent Monday–Saturday.
 * Returns pending, done, and overdue tasks combined.
 */
export const fetchChecklistLast7Days = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  nameFilter = "",
): Promise<ChecklistFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { monday, endDay } = getWeekRange();
    const startOfMonday = `${monday}T00:00:00`;
    const endOfDay = `${endDay}T23:59:59`;

    let query = supabase
      .from("checklist")
      .select("*", { count: "exact" })
      .gte("task_start_date", startOfMonday)
      .lte("task_start_date", endOfDay)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `name.ilike.%${searchValue}%`,
        `given_by.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter — users only see their own tasks
    if (role === "user" && username) {
      query = applyNameFilter(query, username);
    }

    // Apply name filter (admin filtering by a specific user)
    if (nameFilter && nameFilter.trim() !== "") {
      query = applyNameFilter(query, nameFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching last 7 days data", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as ChecklistItem[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase (last 7 days)", error);
    return { data: [], totalCount: 0 };
  }
};

// ============ Fetch Checklist Upcoming 7 Days ============

/**
 * Fetch all checklist tasks scheduled for the next 7 days (tomorrow to day 7).
 * Returns pending tasks.
 */
export const fetchChecklistUpcoming7Days = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  nameFilter = "",
): Promise<ChecklistFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const next7thDay = new Date(tomorrow);
    next7thDay.setDate(tomorrow.getDate() + 6); // next 7 days

    const startOfTomorrow = `${tomorrow.toISOString().split("T")[0]}T00:00:00`;
    const endOfDay7 = `${next7thDay.toISOString().split("T")[0]}T23:59:59`;

    let query = supabase
      .from("checklist")
      .select("*", { count: "exact" })
      .gte("task_start_date", startOfTomorrow)
      .lte("task_start_date", endOfDay7)
      .is("submission_date", null)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `name.ilike.%${searchValue}%`,
        `given_by.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter
    if (role === "user" && username) {
      query = applyNameFilter(query, username);
    }

    // Apply name filter (admin filtering by a specific user)
    if (nameFilter && nameFilter.trim() !== "") {
      query = applyNameFilter(query, nameFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching upcoming 7 days data", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as ChecklistItem[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase (upcoming 7 days)", error);
    return { data: [], totalCount: 0 };
  }
};

// ============ Fetch Checklist Overdue ============

/**
 * Fetch all checklist tasks where plan date is earlier than today and not completed.
 */
export const fetchChecklistOverdue = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  nameFilter = "",
): Promise<ChecklistFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const today = new Date().toISOString().split("T")[0];
    const startOfToday = `${today}T00:00:00`;

    let query = supabase
      .from("checklist")
      .select("*", { count: "exact" })
      .lt("task_start_date", startOfToday)
      .is("submission_date", null)
      .order("task_start_date", { ascending: false })
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `name.ilike.%${searchValue}%`,
        `given_by.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter
    if (role === "user" && username) {
      query = applyNameFilter(query, username);
    }

    // Apply name filter
    if (nameFilter && nameFilter.trim() !== "") {
      query = applyNameFilter(query, nameFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching overdue data", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as ChecklistItem[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase (overdue)", error);
    return { data: [], totalCount: 0 };
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

// ============ Delete Checklist Row ============

export const deleteChecklistRowApi = async (taskId: number): Promise<void> => {
  const { error } = await supabase
    .from("checklist")
    .delete()
    .eq("task_id", taskId);
  if (error) throw error;
};
