import supabase from "@/utils/supabaseClient";
import type {
  MachineMaintenance,
  MaintenanceFetchResponse,
} from "../../../types/types";

// ============ Fetch Maintenance Tasks ============

/**
 * Fetch pending maintenance tasks (where actual_date is null)
 */
export const fetchPendingMaintenance = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
): Promise<MaintenanceFetchResponse> => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayISO = endOfToday.toISOString();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_maintenance")
      .select("*", { count: "exact" })
      .lte("task_start_date", endOfTodayISO)
      .is("actual_date", null)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    // Apply date filter
    if (startDate) {
      query = query.gte("task_start_date", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("task_start_date", `${endDate}T23:59:59.999Z`);
    }

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `machine_name.ilike.%${searchValue}%`,
        `doer_name.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter - users only see their assigned tasks
    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching pending maintenance:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineMaintenance[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch completed maintenance history
 */
export const fetchMaintenanceHistory = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
): Promise<MaintenanceFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_maintenance")
      .select("*", { count: "exact" })
      .not("actual_date", "is", null)
      .order("actual_date", { ascending: false })
      .range(from, to);

    // Apply date filter (for history, filter by task_start_date or actual_date? Let's use actual_date as it marks when it was completed, or task_start_date for planned date. Usually task_start_date is more consistent)
    if (startDate) {
      query = query.gte("task_start_date", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("task_start_date", `${endDate}T23:59:59.999Z`);
    }

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `machine_name.ilike.%${searchValue}%`,
        `doer_name.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter
    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching maintenance history:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineMaintenance[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

// ============ Helper for Week Range ============
function getWeekRange() {
  const current = new Date();
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  return { start: monday.toISOString(), end: saturday.toISOString() };
}

/**
 * Fetch all overdue maintenance tasks (task start date < today and actual date is null)
 */
export const fetchAllOverdueMaintenance = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<MaintenanceFetchResponse> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    const startOfTodayISO = today.toISOString();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_maintenance")
      .select("*", { count: "exact" })
      .lt("task_start_date", startOfTodayISO)
      .is("actual_date", null)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `machine_name.ilike.%${searchValue}%`,
        `doer_name.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
        `department.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    // Apply role filter - users only see their assigned tasks
    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching overdue maintenance:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineMaintenance[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch maintenance tasks for the last 7 days (Monday to Saturday)
 * Shows all tasks regardless of completion status
 */
export const fetchMaintenanceLast7Days = async (
  page = 1,
  limit = 1000,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<MaintenanceFetchResponse> => {
  try {
    const { start: startOfWeek, end: endOfWeek } = getWeekRange();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_maintenance")
      .select("*", { count: "exact" })
      .gte("task_start_date", startOfWeek)
      .lte("task_start_date", endOfWeek)
      .order("task_start_date", { ascending: true })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConds = [
        `machine_name.ilike.%${searchValue}%`,
        `doer_name.ilike.%${searchValue}%`,
        `task_description.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConds.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConds.join(","));
    }

    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching last 7 days maintenance:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineMaintenance[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch all maintenance tasks for dashboard/calendar
 */
export const fetchAllMaintenance = async (): Promise<MachineMaintenance[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .select("*")
      .order("task_start_date", { ascending: true });

    if (error) {
      console.error("Error fetching all maintenance:", error);
      return [];
    }

    return data as MachineMaintenance[];
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// ============ Submit Maintenance Task ============

/**
 * Mark maintenance task as complete
 */
export const completeMaintenance = async (
  taskId: number,
  remarks?: string,
  imageFile?: File,
  maintenanceCost?: number,
): Promise<MachineMaintenance | null> => {
  try {
    let imageUrl: string | null = null;

    // Handle image upload
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `maintenance-${taskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("maintenance")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("maintenance").getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    const updateData: Partial<MachineMaintenance> = {
      status: "completed",
      actual_date: new Date().toISOString(),
      remarks: remarks || null,
      maintenance_cost: maintenanceCost || null,
    };

    if (imageUrl) updateData.image_url = imageUrl;

    const { data, error } = await supabase
      .from("machine_maintenance")
      .update(updateData)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error completing maintenance:", error);
      return null;
    }

    return data as MachineMaintenance;
  } catch (error) {
    console.error("Error from Supabase:", error);
    return null;
  }
};

/**
 * Bulk complete maintenance tasks
 */
export const bulkCompleteMaintenance = async (
  taskIds: number[],
  remarks?: string,
): Promise<MachineMaintenance[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .update({
        status: "completed",
        actual_date: new Date().toISOString(),
        remarks: remarks || null,
      })
      .in("task_id", taskIds)
      .select();

    if (error) {
      console.error("Error bulk completing maintenance:", error);
      return [];
    }

    return data as MachineMaintenance[];
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// ============ Get Unique Values for Filters ============

/**
 * Get unique machine names for filter dropdown
 */
export const getUniqueMachines = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .select("machine_name")
      .not("machine_name", "is", null);

    if (error) {
      console.error("Error fetching machines:", error);
      return [];
    }

    const uniqueMachines = [
      ...new Set(data.map((item) => item.machine_name).filter(Boolean)),
    ] as string[];
    return uniqueMachines.sort();
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

/**
 * Get unique frequencies for filter dropdown
 */
export const getUniqueFrequencies = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .select("frequency")
      .not("frequency", "is", null);

    if (error) {
      console.error("Error fetching frequencies:", error);
      return [];
    }

    const uniqueFreqs = [
      ...new Set(data.map((item) => item.frequency).filter(Boolean)),
    ] as string[];
    return uniqueFreqs.sort();
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};
