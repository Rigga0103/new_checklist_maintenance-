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

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      query = query.or(
        `task_id::text.ilike.%${searchValue}%,machine_name.ilike.%${searchValue}%,form_filled_by.ilike.%${searchValue}%,issue_detail.ilike.%${searchValue}%,assigned_to.ilike.%${searchValue}%`,
      );
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
 * Fetch completed repair history
 */
export const fetchRepairHistory = async (
  page = 1,
  limit = 50,
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
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

    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      query = query.or(
        `task_id::text.ilike.%${searchValue}%,machine_name.ilike.%${searchValue}%,form_filled_by.ilike.%${searchValue}%,issue_detail.ilike.%${searchValue}%`,
      );
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
): Promise<MachineRepair | null> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .insert({
        form_filled_by: formData.formFilledBy,
        assigned_to: formData.assignedTo,
        machine_name: formData.machineName,
        issue_detail: formData.issueDetail,
        motor_name: formData.motorName || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating repair request:", error);
      return null;
    }

    return data as MachineRepair;
  } catch (error) {
    console.error("Error from Supabase:", error);
    return null;
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
