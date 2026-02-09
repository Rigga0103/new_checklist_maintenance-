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
): Promise<FetchResult> => {
  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
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
      .is("submission_date", null)
      .is("status", null)
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
): Promise<DelegationTask[]> => {
  const itemsPerPage = 50;
  const start = (page - 1) * itemsPerPage;

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

  try {
    let query = supabase
      .from("delegation")
      .select("*", { count: "exact" })
      .order("task_start_date", { ascending: false })
      .not("submission_date", "is", null)
      .not("status", "is", null)
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

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching delegation history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
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

    const updates = await Promise.all(
      submissionData.map(async (item) => {
        let imageUrl: string | null = null;

        if (item.image && item.image.previewUrl) {
          try {
            const response = await fetch(item.image.previewUrl);
            const blob = await response.blob();
            const file = new File([blob], item.image.name, {
              type: item.image.type,
            });

            const fileExt = item.image.name.split(".").pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `task-${item.taskId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("checklist-delegation")
              .upload(filePath, file, {
                cacheControl: "3600",
                contentType: item.image.type,
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage
              .from("checklist-delegation")
              .getPublicUrl(filePath);

            imageUrl = publicUrl;
          } catch (uploadError) {
            console.error("Image upload failed:", uploadError);
          }
        }

        return {
          task_id: item.taskId,
          status: item.status,
          remark: item.remarks,
          submission_date: new Date().toISOString(),
          image: imageUrl,
        };
      }),
    );

    const results = await Promise.all(
      updates.map(async (updateObj) => {
        const cleanUpdate = {
          status: updateObj.status,
          remark: updateObj.remark,
          submission_date: updateObj.submission_date,
          image: updateObj.image,
        };

        const { data, error } = await supabase
          .from("delegation")
          .update(cleanUpdate)
          .eq("task_id", updateObj.task_id)
          .select();

        if (error) {
          console.error(`Error updating task ${updateObj.task_id}:`, error);
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
