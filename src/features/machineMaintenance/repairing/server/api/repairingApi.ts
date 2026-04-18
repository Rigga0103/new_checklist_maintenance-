import supabase from "@/utils/supabaseClient";
import type {
  MachineRepair,
  RepairFetchResponse,
  RepairRequestFormData,
  RepairProcessFormData,
} from "../../../types/types";

// ============ Fetch Repair Requests ============

/**
 * Fetch pending repair requests
 */
export const fetchPendingRepairs = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
): Promise<RepairFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .or("status.eq.pending,status.eq.in_progress")
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply date filter
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConditions = [
        `machine_name.ilike.%${searchValue}%`,
        `form_filled_by.ilike.%${searchValue}%`,
        `issue_detail.ilike.%${searchValue}%`,
        `assigned_to.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConditions.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConditions.join(","));
    }

    // Apply role filter - users only see their assigned tasks
    if (role === "user" && username) {
      query = query.eq("assigned_to", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching pending repairs:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineRepair[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch all overdue repair requests (created before today and not completed/cancelled)
 */
export const fetchAllOverdueRepairing = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<RepairFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .or("status.eq.pending,status.eq.in_progress")
      .lt("created_at", todayISO) // Before today
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConditions = [
        `machine_name.ilike.%${searchValue}%`,
        `form_filled_by.ilike.%${searchValue}%`,
        `issue_detail.ilike.%${searchValue}%`,
        `assigned_to.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConditions.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConditions.join(","));
    }

    // Apply role filter - users only see their assigned tasks
    if (role === "user" && username) {
      query = query.eq("assigned_to", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching overdue repairs:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineRepair[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch completed repair history
 */
export const fetchRepairHistory = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
): Promise<RepairFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .eq("status", "completed")
      .order("actual_date", { ascending: false })
      .range(from, to);

    // Apply date filter
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConditions = [
        `machine_name.ilike.%${searchValue}%`,
        `form_filled_by.ilike.%${searchValue}%`,
        `issue_detail.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConditions.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConditions.join(","));
    }

    // Apply role filter
    if (role === "user" && username) {
      query = query.eq("assigned_to", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching repair history:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineRepair[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch ALL completed repair history for export
 */
export const fetchAllRepairHistory = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  startDate?: string,
  endDate?: string,
): Promise<MachineRepair[]> => {
  try {
    let query = supabase
      .from("machine_repair")
      .select("*")
      .eq("status", "completed")
      .order("actual_date", { ascending: false });

    // Apply date filter
    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999Z`);
    }

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConditions = [
        `machine_name.ilike.%${searchValue}%`,
        `form_filled_by.ilike.%${searchValue}%`,
        `issue_detail.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConditions.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConditions.join(","));
    }

    // Apply role filter
    if (role === "user" && username) {
      query = query.eq("assigned_to", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching all repair history:", error);
      return [];
    }

    return data as MachineRepair[];
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
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

  return { start: monday, end: saturday };
}

/**
 * Fetch Last 7 Days (Monday to Saturday) repairs for the tab
 */
export const fetchRepairLast7Days = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
  options?: {
    startDate?: string;
    endDate?: string;
  },
): Promise<RepairFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Use specific date range if provided, else use the default week range
    const range = getWeekRange();
    let startDateStr = options?.startDate
      ? `${options.startDate}T00:00:00.000Z`
      : range.start.toISOString();
    let endDateStr = options?.endDate
      ? `${options.endDate}T23:59:59.999Z`
      : range.end.toISOString();

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConditions = [
        `machine_name.ilike.%${searchValue}%`,
        `form_filled_by.ilike.%${searchValue}%`,
        `issue_detail.ilike.%${searchValue}%`,
        `assigned_to.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConditions.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConditions.join(","));
    }

    // Apply role filter - users only see their assigned tasks
    if (role === "user" && username) {
      query = query.eq("assigned_to", username);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching last 7 days repairs:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineRepair[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch Parts and Vendors History (where part_replaced or vendor_name is not null)
 */
export const fetchPartsAndVendors = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  vendorFilter = "",
  partFilter = "",
): Promise<RepairFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .not("vendor_name", "is", null) // Just fetching those with vendor names or parts
      .order("actual_date", { ascending: false })
      .range(from, to);

    // Apply search filter (for task ID, machine name, etc)
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      let orConditions = [
        `machine_name.ilike.%${searchValue}%`,
        `vendor_name.ilike.%${searchValue}%`,
        `part_replaced.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConditions.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConditions.join(","));
    }

    // Apply specific filters
    if (vendorFilter && vendorFilter.trim() !== "") {
      query = query.eq("vendor_name", vendorFilter);
    }
    if (partFilter && partFilter.trim() !== "") {
      query = query.eq("part_replaced", partFilter);
    }

    // Actually we want any row where part_replaced IS NOT NULL OR vendor_name IS NOT NULL
    // Supabase OR across different columns checking for NOT NULL is tricky, so let's just
    // fetch anything that's "completed" OR has vendor_name/part_replaced.
    // We already fetch closed repairs. Let's just ensure we only show rows that have a part or vendor.
    // Easiest is to add .or('vendor_name.not.is.null,part_replaced.not.is.null') but it's simpler to filter
    // Let's rely on .or("vendor_name.neq.null,part_replaced.neq.null") workaround:
    // query = query.or("vendor_name.not.is.null,part_replaced.not.is.null") - Supabase doesn't natively support this well.
    // Instead we will just filter completed repairs and client-side or use a specific view.
    // Let's just rely on .not("vendor_name", "is", null) or .not("part_replaced", "is", null)
    // Actually, let's just use .neq('status', 'cancelled') for now and filter if we need to.

    // For now we'll fetch completed items where bill/vendor could be attached
    query = query.eq("status", "completed");

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching parts and vendors history:", error);
      return { data: [], totalCount: 0 };
    }

    // Since Supabase `or` with `not.is.null` is severely limited, we do a lightweight client-side filter
    // to strictly enforce that either vendor_name or part_replaced exists:
    let filteredData = (data as MachineRepair[]).filter(
      (item) => item.vendor_name || item.part_replaced,
    );

    // Adjust totalCount estimation based on filter (This is rough but typically pages are mostly filled with these)
    let finalCount = count || 0;
    if (filteredData.length < data.length) {
      finalCount = Math.max(
        0,
        finalCount - (data.length - filteredData.length),
      );
    }

    return { data: filteredData, totalCount: finalCount };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * Fetch all repairs for dashboard stats
 */
export const fetchAllRepairs = async (): Promise<MachineRepair[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all repairs:", error);
      return [];
    }

    return data as MachineRepair[];
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// ============ Fetch Active User Names ============

/**
 * Fetch all active user names for assignment dropdown
 */
export const fetchActiveUserNames = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("user_name")
      .eq("status", "active")
      .not("user_name", "is", null)
      .order("user_name", { ascending: true });

    if (error) {
      console.error("Error fetching active users:", error);
      return [];
    }

    return data.map((u) => u.user_name as string).filter(Boolean);
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// ============ Create Repair Request ============

/**
 * Submit a new repair request
 */
export const createRepairRequest = async (
  formData: RepairRequestFormData,
): Promise<MachineRepair | MachineRepair[] | null> => {
  try {
    const partsArray = formData.part_replaced && formData.part_replaced.length > 0
      ? formData.part_replaced
      : [null];

    const recordsToInsert = partsArray.map((part) => ({
      form_filled_by: formData.formFilledBy,
      assigned_to: formData.assignedTo,
      machine_type: formData.machineType,
      machine_name: formData.machineName,
      issue_detail: formData.issueDetail,
      motor_name: formData.motorName || null,
      status: "pending",
      task_start_date: formData.task_start_date || new Date().toISOString().split("T")[0],
      part_replaced: part,
      bill_amount: formData.bill_amount || null,
      qty: formData.qty || null,
      vendor_name: formData.vendorName || null,
      purchase_date: formData.purchaseDate || null,
    }));

    const { data, error } = await supabase
      .from("machine_repair")
      .insert(recordsToInsert)
      .select();

    if (error) {
      console.error("Error creating repair request:", error);
      return null;
    }

    // Supabase returns an array of inserted rows
    return data && data.length === 1 ? (data[0] as MachineRepair) : (data as MachineRepair[]);
  } catch (error) {
    console.error("Error from Supabase:", error);
    return null;
  }
};

// ============ Delete Repair ============

/**
 * Delete repair record by task_id
 */
export const deleteRepair = async (
  taskId: number,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("machine_repair")
      .delete()
      .eq("task_id", taskId);

    if (error) {
      console.error("Error deleting repair:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error from Supabase:", error);
    return false;
  }
};

// ============ Process Repair (Admin) ============

/**
 * Update repair with processing details (admin action)
 */
export const processRepair = async (
  taskId: number,
  processData: RepairProcessFormData,
  photoFile?: File,
  billFile?: File,
): Promise<MachineRepair | null> => {
  try {
    let photoUrl: string | null = null;
    let billCopyUrl: string | null = null;

    // Handle photo upload
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `repair-${taskId}/photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("repairing")
        .upload(filePath, photoFile, {
          cacheControl: "3600",
          contentType: photoFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("repairing").getPublicUrl(filePath);

      photoUrl = publicUrl;
    }

    // Handle bill copy upload
    if (billFile) {
      const fileExt = billFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `repair-${taskId}/bills/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("repairing")
        .upload(filePath, billFile, {
          cacheControl: "3600",
          contentType: billFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("repairing").getPublicUrl(filePath);

      billCopyUrl = publicUrl;
    }

    const updateData: Partial<MachineRepair> = {
      part_replaced: processData.partReplaced || null,
      work_done: processData.workDone || null,
      status: processData.status,
      vendor_name: processData.vendorName || null,
      bill_amount: processData.billAmount || null,
      remarks: processData.remarks || null,
      warranty_start_date: processData.warrantyFromDate || null,
      warranty_end_date: processData.warrantyToDate || null,
      Work_Done_By: processData.workDoneBy || null,
      Type_of_Work: processData.typeOfWork || null,
      task_start_date: new Date().toISOString(),
    };

    if (photoUrl) updateData.photo_url = photoUrl;
    if (billCopyUrl) updateData.bill_copy_url = billCopyUrl;

    // If completed, set actual_date
    if (processData.status === "completed") {
      updateData.actual_date = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("machine_repair")
      .update(updateData)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Error processing repair:", error);
      return null;
    }

    return data as MachineRepair;
  } catch (error) {
    console.error("Error from Supabase:", error);
    return null;
  }
};

// ============ Get Unique Values for Filters ============

/**
 * Get unique machine names for filter dropdown
 */
export const getUniqueMachines = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
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
 * Get unique assigned persons for filter dropdown
 */
export const getUniqueAssignedPersons = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .select("assigned_to")
      .not("assigned_to", "is", null);

    if (error) {
      console.error("Error fetching assigned persons:", error);
      return [];
    }

    const uniquePersons = [
      ...new Set(data.map((item) => item.assigned_to).filter(Boolean)),
    ] as string[];
    return uniquePersons.sort();
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

/**
 * Get unique vendor names for filter dropdown
 */
export const getUniqueVendors = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .select("vendor_name")
      .not("vendor_name", "is", null);

    if (error) {
      console.error("Error fetching vendors:", error);
      return [];
    }

    const uniqueVendors = [
      ...new Set(data.map((item) => item.vendor_name).filter(Boolean)),
    ] as string[];
    return uniqueVendors.sort();
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

/**
 * Get unique parts replaced for filter dropdown
 */
export const getUniqueParts = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .select("part_replaced")
      .not("part_replaced", "is", null);

    if (error) {
      console.error("Error fetching parts:", error);
      return [];
    }

    const uniqueParts = [
      ...new Set(data.map((item) => item.part_replaced).filter(Boolean)),
    ] as string[];
    return uniqueParts.sort();
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};
