import supabase from "@/utils/supabaseClient";
import { ApprovalTask } from "../../types/types";
// Helper to combine Ritu Sahu and Hemlata Verma data when Ritu Sahu is selected
const applyNameFilter = (query: any, filterName: string | null | undefined) => {
  if (!filterName || filterName === "all" || filterName === "") return query;
  const nameToFilter = filterName.trim();
  if (nameToFilter === "Ritu Sahu") {
    return query.in("name", ["Ritu Sahu", "Hemlata Verma"]);
  }
  return query.eq("name", nameToFilter);
};

// Helper function to format date-time
const formatDateTime = (dateTimeStr: string | null): string => {
  if (!dateTimeStr) return "";

  // If already in ISO format, convert to DD/MM/YYYY HH:MM:SS
  if (typeof dateTimeStr === "string" && dateTimeStr.includes("T")) {
    const date = new Date(dateTimeStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  return dateTimeStr;
};

// Fetch completed checklist tasks for approval
export async function fetchChecklistApprovalData(
  username: string | null,
  role: string | null,
): Promise<{ data: ApprovalTask[]; members: string[] }> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("checklist")
      .select("*")
      .not("submission_date", "is", null)
      .not("status", "is", null)
      .range(from, to);

    if (role === "user" && username) {
      query = applyNameFilter(query, username);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch checklist data: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
    }

    if (!data || data.length < pageSize) {
      hasMore = false;
    }

    page++;
  }

  const membersSet = new Set<string>();

  const processedData: ApprovalTask[] = allData.map((row: any, index: number) => {
    const assignedTo = row.name || "Unassigned";
    membersSet.add(assignedTo);

    const taskId = row.task_id || "";
    const stableId = taskId
      ? `checklist_task_${taskId}_${index + 1}`
      : `checklist_row_${index + 1}_${Math.random().toString(36).substring(2, 15)}`;

    return {
      _id: stableId,
      _rowIndex: index + 1,
      _taskId: String(taskId),
      _sheetType: "checklist" as const,
      task_id: row.task_id,
      task_description: row.task_description,
      name: row.name,
      given_by: row.given_by,
      department: row.department,
      task_start_date: formatDateTime(row.task_start_date),
      planned_date: formatDateTime(row.planned_date),
      frequency: row.frequency,
      enable_reminders: row.enable_reminders,
      require_attachment: row.require_attachment,
      submission_date: formatDateTime(row.submission_date),
      status: row.status,
      remark: row.remark,
      image: row.image,
      admin_done: row.admin_done,
    };
  });

  return { data: processedData, members: Array.from(membersSet).sort() };
}

// Fetch completed delegation tasks for approval
export async function fetchDelegationApprovalData(
  username: string | null,
  role: string | null,
): Promise<{ data: ApprovalTask[]; members: string[] }> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("delegation")
      .select("*")
      .not("submission_date", "is", null)
      .not("status", "is", null)
      .range(from, to);

    if (role === "user" && username) {
      query = applyNameFilter(query, username);
    }

    const { data, error } = await query;

    if (error) {
      console.warn(`Failed to fetch delegation data: ${error.message}`);
      return { data: [], members: [] };
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
    }

    if (!data || data.length < pageSize) {
      hasMore = false;
    }

    page++;
  }

  const membersSet = new Set<string>();

  const processedData: ApprovalTask[] = allData.map((row: any, index: number) => {
    const assignedTo = row.name || "Unassigned";
    membersSet.add(assignedTo);

    const taskId = row.task_id || "";
    const stableId = taskId
      ? `delegation_task_${taskId}_${index + 1}`
      : `delegation_row_${index + 1}_${Math.random().toString(36).substring(2, 15)}`;

    return {
      _id: stableId,
      _rowIndex: index + 1,
      _taskId: String(taskId),
      _sheetType: "delegation" as const,
      task_id: row.task_id,
      task_description: row.task_description,
      name: row.name,
      given_by: row.given_by,
      department: row.department,
      task_start_date: formatDateTime(row.task_start_date),
      planned_date: formatDateTime(row.planned_date),
      frequency: row.frequency || row.freq,
      enable_reminders: row.enable_reminder || row.enable_reminders,
      require_attachment: row.require_attachment,
      submission_date: formatDateTime(row.submission_date),
      status: row.status,
      remark: row.remarks || row.remark,
      image: row.image || "",
      admin_done: row.admin_done || "",
    };
  });

  return { data: processedData, members: Array.from(membersSet).sort() };
}

// Update admin_done status for a single task
export async function updateAdminStatus(
  taskId: string | number,
  status: string,
  sheetType: "checklist" | "delegation",
): Promise<void> {
  const targetTable = sheetType === "delegation" ? "delegation" : "checklist";

  const { error } = await supabase
    .from(targetTable)
    .update({ admin_done: status })
    .eq("task_id", taskId);

  if (error) {
    throw new Error(error.message);
  }
}

// Mark multiple tasks as admin done
export async function markMultipleAsDone(
  checklistTaskIds: (string | number)[],
  delegationTaskIds: (string | number)[],
): Promise<void> {
  // Update checklist items
  if (checklistTaskIds.length > 0) {
    const { error: checklistError } = await supabase
      .from("checklist")
      .update({ admin_done: "Done" })
      .in("task_id", checklistTaskIds);

    if (checklistError) {
      throw new Error(checklistError.message);
    }
  }

  // Update delegation items
  if (delegationTaskIds.length > 0) {
    const { error: delegationError } = await supabase
      .from("delegation")
      .update({ admin_done: "Done" })
      .in("task_id", delegationTaskIds);

    if (delegationError) {
      throw new Error(delegationError.message);
    }
  }
}

// Fetch unique checklist templates for unique tasks view.
// Reads from unique_checklist (~1100 rows) instead of paginating through the
// full checklist table (56 000+ rows), which was causing the page to never load.
export async function fetchAllChecklistData(
  username: string | null = null,
  role: string | null = null,
): Promise<{ data: ApprovalTask[]; members: string[] }> {
  let query = supabase
    .from("unique_checklist")
    .select(
      "task_id, name, department, task_description, task_start_date, task_end_date, frequency, require_attachment, given_by, created_at",
    )
    .order("created_at", { ascending: false });

  if (role === "user" && username) {
    query = applyNameFilter(query, username);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch unique checklist data: ${error.message}`);
  }

  const membersSet = new Set<string>();

  const processedData: ApprovalTask[] = (data || []).map(
    (row: any, index: number) => {
      const assignedTo = row.name || "Unassigned";
      membersSet.add(assignedTo);

      return {
        _id: `unique_checklist_${row.task_id}_${index}`,
        _rowIndex: index + 1,
        _taskId: String(row.task_id),
        _sheetType: "checklist" as const,
        task_id: row.task_id,
        task_description: row.task_description,
        name: row.name,
        given_by: row.given_by,
        department: row.department,
        task_start_date: formatDateTime(row.task_start_date),
        planned_date: formatDateTime(row.task_end_date),   // task_end_date → planned date column
        frequency: row.frequency,
        enable_reminders: null,
        require_attachment: row.require_attachment,
        submission_date: formatDateTime(row.task_start_date), // used for date-range filter
        status: null,
        remark: null,
        image: null,
        admin_done: null,
      };
    },
  );

  return { data: processedData, members: Array.from(membersSet).sort() };
}
