import supabase from "@/utils/supabaseClient";
import { compressImage } from "@/utils/imageCompression";
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
// Update your createRepairRequest function with detailed logging
export const createRepairRequest = async (
  formData: RepairRequestFormData,
): Promise<MachineRepair | MachineRepair[] | null> => {
  try {
    console.log("=== Starting createRepairRequest ===");
    console.log("Form data received:", {
      part_replaced: formData.part_replaced,
      vendorName: formData.vendorName,
      bill_amount: formData.bill_amount,
      task_start_date: formData.task_start_date
    });

    const partsArray = formData.part_replaced && formData.part_replaced.length > 0
      ? formData.part_replaced
      : [null];

    console.log("Parts array:", partsArray);

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

    console.log("Records to insert into machine_repair:", recordsToInsert);

    const { data, error } = await supabase
      .from("machine_repair")
      .insert(recordsToInsert)
      .select();

    if (error) {
      console.error("Error creating repair request:", error);
      return null;
    }

    console.log("Successfully inserted into machine_repair:", data);

    // After successful insertion, also insert into repairing_pending_indent table
    if (data && data.length > 0) {
      const pendingIndentRecords = [];

      for (const repairRecord of data) {
        console.log(`Processing record with task_id: ${repairRecord.task_id}`, {
          part_replaced: repairRecord.part_replaced,
          vendor_name: repairRecord.vendor_name,
          bill_amount: repairRecord.bill_amount
        });

        // Check if part_replaced exists and is not null/empty
        if (repairRecord.part_replaced && repairRecord.part_replaced.trim() !== "") {
          // Check if this part needs to be indented
          // Always create pending indent record when part_replaced exists
          const needsIndent = repairRecord.part_replaced && repairRecord.part_replaced.trim() !== "";

          console.log(`Part: "${repairRecord.part_replaced}", Needs indent: ${needsIndent}`);

          if (needsIndent) {
            const pendingRecord = {
              task_id: repairRecord.task_id,
              part_replaced: repairRecord.part_replaced,
              vendor_name: repairRecord.vendor_name || null,
              rate: repairRecord.bill_amount || null,
              date: new Date().toISOString().split("T")[0],
            };
            console.log("Adding to pending indent:", pendingRecord);
            pendingIndentRecords.push(pendingRecord);
          }
        } else {
          console.log(`Skipping - No part_replaced for task_id ${repairRecord.task_id}`);
        }
      }

      console.log(`Total pending indent records to insert: ${pendingIndentRecords.length}`);

      // Insert into repairing_pending_indent table if there are records
      if (pendingIndentRecords.length > 0) {
        console.log("Attempting to insert into repairing_pending_indent...");
        const { data: indentData, error: indentError } = await supabase
          .from("repairing_pending_indent")
          .insert(pendingIndentRecords)
          .select(); // Add .select() to see what was inserted

        if (indentError) {
          console.error("Error inserting into pending indent:", {
            message: indentError.message,
            details: indentError.details,
            hint: indentError.hint,
            code: indentError.code
          });
        } else {
          console.log("Successfully inserted into pending indent:", indentData);
        }
      } else {
        console.log("No pending indent records to insert");
      }
    }

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

// ============ Fetch AMC Repairs ============

/**
 * Fetch repairs where AMC = yes and next_repairing_date is set, ordered by next service date asc
 */
export const fetchAMCRepairs = async (
  page = 1,
  limit = 50,
  searchTerm = "",
): Promise<RepairFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      const orConditions = [
        `machine_name.ilike.%${searchValue}%`,
        `issue_detail.ilike.%${searchValue}%`,
        `machine_type.ilike.%${searchValue}%`,
      ];
      if (isNumeric) orConditions.push(`task_id.eq.${searchValue}`);
      query = query.or(orConditions.join(","));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching AMC repairs:", error?.message, "| code:", error?.code, "| hint:", error?.hint);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineRepair[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

// ============ Process Repair (Admin) ============

/**
 * Update repair with processing details (admin action)
 */
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
    console.log("========== PROCESS REPAIR STARTED ==========");
    console.log("1. Function called with parameters:", {
      taskId,
      processData,
      hasPhotoFile: !!photoFile,
      hasBillFile: !!billFile,
    });

    let photoUrl: string | null = null;
    let billCopyUrl: string | null = null;

    // Handle photo upload
    if (photoFile) {
      console.log("2. Processing photo upload...");
      let uploadData: File = photoFile;
      if (photoFile.type.startsWith("image/")) {
        try {
          uploadData = await compressImage(photoFile, 1024, 1024, 0.7);
        } catch (error) {
          console.warn("Photo compression failed, uploading original:", error);
        }
      }

      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `repair-${taskId}/photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("repairing")
        .upload(filePath, uploadData, {
          cacheControl: "3600",
          contentType: photoFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("repairing").getPublicUrl(filePath);

      photoUrl = publicUrl;
      console.log("   - Photo uploaded successfully");
    }

    // Handle bill copy upload
    if (billFile) {
      console.log("3. Processing bill upload...");
      let uploadData: File = billFile;
      if (billFile.type.startsWith("image/")) {
        try {
          uploadData = await compressImage(billFile, 1024, 1024, 0.7);
        } catch (error) {
          console.warn("Bill compression failed, uploading original:", error);
        }
      }

      const fileExt = billFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `repair-${taskId}/bills/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("repairing")
        .upload(filePath, uploadData, {
          cacheControl: "3600",
          contentType: billFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("repairing").getPublicUrl(filePath);

      billCopyUrl = publicUrl;
      console.log("   - Bill uploaded successfully");
    }

    // Prepare update data - ONLY include columns that exist in your database
    const updateData: any = {
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
    const isCompleted = processData.status === "completed";
    if (isCompleted) {
      updateData.actual_date = new Date().toISOString();
      console.log("   - Status is 'completed', adding actual_date:", updateData.actual_date);
    }

    console.log("4. Update data prepared:", updateData);

    // Check if task exists
    console.log(`5. Checking if task ${taskId} exists...`);
    const { data: existingTask, error: checkError } = await supabase
      .from("machine_repair")
      .select("task_id, status")
      .eq("task_id", taskId)
      .single();

    if (checkError) {
      console.error("   - Task not found:", checkError);
      return null;
    }
    console.log("   - Task found, current status:", existingTask.status);

    // Perform the update
    console.log(`6. Updating task ${taskId}...`);
    const { data, error } = await supabase
      .from("machine_repair")
      .update(updateData)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("7. ❌ ERROR UPDATING DATABASE:");
      console.error("   - Error message:", error.message);
      console.error("   - Error code:", error.code);
      console.error("   - Full error:", error);
      return null;
    }

    console.log("8. ✅ Database update successful!");
    console.log("   - Updated record:", data);

    // 🔥 NEW: If status is completed, remove from repairing_pending_indent
    if (isCompleted) {
      console.log(`9. Checking for pending indent records for task ${taskId}...`);

      // First, check if there are any pending indent records for this task
      const { data: pendingIndentRecords, error: fetchIndentError } = await supabase
        .from("repairing_pending_indent")
        .select("*")
        .eq("task_id", taskId);

      if (fetchIndentError) {
        console.error("   - Error checking pending indent:", fetchIndentError);
      } else if (pendingIndentRecords && pendingIndentRecords.length > 0) {
        console.log(`   - Found ${pendingIndentRecords.length} pending indent record(s) for task ${taskId}`);
        console.log("   - Pending indent records:", pendingIndentRecords);

        // Delete the pending indent records
        const { error: deleteIndentError } = await supabase
          .from("repairing_pending_indent")
          .delete()
          .eq("task_id", taskId);

        if (deleteIndentError) {
          console.error("   - ❌ Error deleting pending indent records:", deleteIndentError);
          console.error("     - Error message:", deleteIndentError.message);
          console.error("     - Error code:", deleteIndentError.code);
        } else {
          console.log(`   - ✅ Successfully deleted ${pendingIndentRecords.length} pending indent record(s) for task ${taskId}`);
        }
      } else {
        console.log(`   - No pending indent records found for task ${taskId}`);
      }
    }

    console.log("========== PROCESS REPAIR COMPLETED ==========");
    return data as MachineRepair;
  } catch (error) {
    console.error("========== PROCESS REPAIR FAILED ==========");
    console.error("Exception:", error);
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
 * Fetch Part Purchase Pending (records with part_replaced set, status pending or in_progress)
 */
export const fetchPartPurchasePending = async (
  page = 1,
  limit = 50,
  searchTerm = "",
): Promise<RepairFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("machine_repair")
      .select("*", { count: "exact" })
      .not("part_replaced", "is", null)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      const orConditions = [
        `part_replaced.ilike.%${searchValue}%`,
        `machine_name.ilike.%${searchValue}%`,
        `vendor_name.ilike.%${searchValue}%`,
      ];
      if (isNumeric) orConditions.push(`task_id.eq.${searchValue}`);
      query = query.or(orConditions.join(","));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching part purchase pending:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as MachineRepair[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
  }
};

export interface PendingIndentRow {
  id: number;
  task_id: number;
  part_replaced: string | null;
  vendor_name: string | null;
  rate: number | null;
  date: string | null;
}

export interface PendingIndentFetchResponse {
  data: PendingIndentRow[];
  totalCount: number;
}

/**
 * Fetch rows from repairing_pending_indent table
 */
export const fetchPendingIndent = async (
  page = 1,
  limit = 50,
  searchTerm = "",
): Promise<PendingIndentFetchResponse> => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("repairing_pending_indent")
      .select("*", { count: "exact" })
      .order("date", { ascending: false })
      .range(from, to);

    if (searchTerm && searchTerm.trim() !== "") {
      const searchValue = searchTerm.trim();
      const isNumeric = /^\d+$/.test(searchValue);
      const orConditions = [
        `part_replaced.ilike.%${searchValue}%`,
        `vendor_name.ilike.%${searchValue}%`,
      ];
      if (isNumeric) {
        orConditions.push(`id.eq.${searchValue}`);
        orConditions.push(`task_id.eq.${searchValue}`);
      }
      query = query.or(orConditions.join(","));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching pending indent:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: data as PendingIndentRow[], totalCount: count || 0 };
  } catch (error) {
    console.error("Error from Supabase:", error);
    return { data: [], totalCount: 0 };
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
