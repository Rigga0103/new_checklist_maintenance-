import supabase from "@/utils/supabaseClient";
import { GeneratedTask } from "../../types/types";
import { logChecklistAction } from "./logChecklistApi";
import { logMaintenanceAction } from "./logMaintenanceApi";

// Fetch unique departments based on user role
export const fetchUniqueDepartmentDataApi = async (): Promise<string[]> => {
  try {
    // Get logged-in user from localStorage (client-side)
    const userName =
      typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

    if (!userName) {
      console.error("No user logged in");
      return [];
    }

    // Get the logged-in user's role + access
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, user_access")
      .eq("user_name", userName)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user role:", userError);
      return [];
    }

    // If admin → show all departments
    if (userData.role === "admin") {
      const { data, error } = await supabase
        .from("users")
        .select("department")
        .not("department", "is", null)
        .order("department", { ascending: true });

      if (error) {
        console.error("Error fetching departments:", error);
        return [];
      }

      const uniqueDepartments = [
        ...new Set(data.map((d) => d.department as string)),
      ];
      return uniqueDepartments;
    }

    // If user → show only their own department
    if (userData.role === "user") {
      const { data, error } = await supabase
        .from("users")
        .select("department")
        .ilike("department", userData.user_access)
        .not("department", "is", null);

      if (error) {
        console.error("Error fetching restricted department:", error);
        return [];
      }

      const uniqueDepartments = [
        ...new Set(data.map((d) => d.department as string)),
      ];
      return uniqueDepartments;
    }

    return [];
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// Fetch unique "Given By" values
export const fetchUniqueGivenByDataApi = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("given_by")
      .not("given_by", "is", null)
      .order("given_by", { ascending: true });

    if (error) {
      console.error("Error fetching given by data:", error);
      return [];
    }

    const uniqueGivenBy = [...new Set(data.map((d) => d.given_by as string))];
    return uniqueGivenBy;
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// Fetch doer names - all users if department empty, filtered if provided
export const fetchUniqueDoerNameDataApi = async (
  department: string,
): Promise<string[]> => {
  try {
    // If no department filter, return all active users
    if (!department || department.trim() === "") {
      const { data, error } = await supabase
        .from("users")
        .select("user_name")
        .eq("status", "active")
        .not("user_name", "is", null)
        .order("user_name", { ascending: true });

      if (error) {
        console.error("Error fetching all users:", error);
        return [];
      }

      const uniqueNames = [...new Set(data?.map((d) => d.user_name as string))];
      return uniqueNames;
    }

    // Filter by department for checklist mode
    const { data, error } = await supabase
      .from("users")
      .select("user_name, role, user_access")
      .or(`user_access.ilike.%${department}%,role.eq.admin`)
      .eq("status", "active")
      // .eq("role", "user") // Allow admins too
      .order("user_name", { ascending: true });

    if (error) {
      console.error("Error fetching doer names:", error);
      return [];
    }

    const uniqueDoerName = [
      ...new Set(data?.map((d) => d.user_name as string)),
    ];
    return uniqueDoerName;
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// Fetch working days from calendar table - returns DD/MM/YYYY format
export const fetchWorkingDaysApi = async (
  startDate?: string,
): Promise<string[]> => {
  try {
    let query = supabase
      .from("working_day_calender")
      .select("working_date, day, week_num, month")
      .order("working_date", { ascending: true });

    // If startDate provided, filter from that date
    if (startDate) {
      query = query.gte("working_date", startDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching working days:", error);
      return [];
    }

    // Return dates in DD/MM/YYYY format for working days comparison (matching legacy)
    const formattedDays = data.map((day) => {
      const date = new Date(day.working_date);
      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    });

    return formattedDays;
  } catch (error) {
    console.error("Error from Supabase:", error);
    return [];
  }
};

// Resolve user names → user IDs in bulk (returns a Map<lowerName, id>)
async function resolveUserIds(names: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("users")
    .select("id, user_name")
    .in("user_name", unique);
  const map = new Map<string, number>();
  (data || []).forEach((u) => {
    if (u.user_name) map.set(u.user_name.trim().toLowerCase(), u.id);
  });
  return map;
}

// Resolve machine names → machine IDs in bulk
async function resolveMachineIds(names: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("machines")
    .select("id, machine_name")
    .in("machine_name", unique);
  const map = new Map<string, number>();
  (data || []).forEach((m) => {
    if (m.machine_name) map.set(m.machine_name.trim().toLowerCase(), m.id);
  });
  return map;
}

// Push generated tasks directly to Supabase
export const pushAssignTaskApi = async (
  generatedTasks: GeneratedTask[],
  section: "checklist" | "maintenance" = "checklist",
): Promise<{ success: boolean; message?: string }> => {
  if (generatedTasks.length === 0) {
    return { success: false, message: "No tasks to submit" };
  }

  try {
    let submitTable = "";

    // Determine table based on section and frequency
    if (section === "maintenance") {
      submitTable = "machine_maintenance";
    } else {
      submitTable =
        generatedTasks[0]?.frequency === "one-time"
          ? "delegation"
          : "checklist";
    }

    // 1. Resolve FK IDs for assignees, creators, and machines
    const assigneeNames = generatedTasks.map((t) => t.assignTo);
    const givenByNames  = generatedTasks.map((t) => t.givenBy).filter(Boolean) as string[];
    const [userIdMap, machineIdMap] = await Promise.all([
      resolveUserIds([...assigneeNames, ...givenByNames]),
      section === "maintenance"
        ? resolveMachineIds(generatedTasks.map((t) => t.department))
        : Promise.resolve(new Map<string, number>()),
    ]);

    // 2. Map tasks to database schema — omit task_id so the identity sequence assigns it
    let tasksData: any[] = [];

    if (section === "maintenance") {
      tasksData = generatedTasks.map((task) => ({
        machine_name: task.department,
        doer_name: task.assignTo,
        task_description: task.description,
        task_start_date: task.dueDate,
        frequency: task.frequency,
        created_at: new Date().toISOString(),
        enable_reminder: task.enableReminders ? "yes" : "no",
        require_attachment: task.requireAttachment ? "yes" : "no",
        assignee_user_id:   userIdMap.get(task.assignTo.trim().toLowerCase()) ?? null,
        created_by_user_id: task.givenBy ? (userIdMap.get(task.givenBy.trim().toLowerCase()) ?? null) : null,
        machine_id:         machineIdMap.get(task.department.trim().toLowerCase()) ?? null,
      }));
    } else {
      tasksData = generatedTasks.map((task) => {
        const baseTask: any = {
          department: task.department,
          given_by: task.givenBy,
          name: task.assignTo,
          task_description: task.description,
          task_start_date: task.dueDate,
          frequency: task.frequency,
          enable_reminder: task.enableReminders ? "yes" : "no",
          require_attachment: task.requireAttachment ? "yes" : "no",
          created_at: new Date().toISOString(),
          assignee_user_id:   userIdMap.get(task.assignTo.trim().toLowerCase()) ?? null,
          created_by_user_id: task.givenBy ? (userIdMap.get(task.givenBy.trim().toLowerCase()) ?? null) : null,
        };

        if (submitTable === "checklist") {
          baseTask.sample_image = task.sampleImage || null;
        }

        return baseTask;
      });

      if (submitTable === "delegation") {
        tasksData = tasksData.map((t, index) => ({
          ...t,
          status: "pending",
          planned_date: generatedTasks[index]?.endDate || null,
        }));
      }
    }

    // 3. Insert — DB identity column assigns task_id
    const { data, error } = await supabase
      .from(submitTable)
      .insert(tasksData)
      .select();

    if (error) {
      console.error("Error inserting tasks:", error);
      if (error.code === "23505") {
        return {
          success: false,
          message: "One or more tasks already exist (duplicate). Please check for duplicate entries.",
        };
      }
      return { success: false, message: error.message };
    }

    console.log(`Successfully inserted ${tasksData.length} tasks into ${submitTable}`, data);

    // 4. Log action using the DB-assigned task_ids from the insert response
    if (data && data.length > 0) {
      if (section === "maintenance") {
        const logParamsArray = generatedTasks.map((task, index) => ({
          maintenanceId: String(data[index]?.task_id ?? ""),
          action: "created",
          machine: task.department,
          givenBy: task.givenBy || "-",
          doer: task.assignTo,
          frequency: task.frequency,
          fromDate: task.dueDate,
          taskDescription: task.description,
        }));
        await logMaintenanceAction(logParamsArray);
      } else {
        const logParamsArray = generatedTasks.map((task, index) => ({
          checklistId: String(data[index]?.task_id ?? ""),
          action: "created",
          department: task.department,
          givenBy: task.givenBy || "-",
          doerName: task.assignTo,
          frequency: task.frequency,
          fromDate: task.dueDate,
          endDate: task.frequency === "one-time" ? task.endDate : task.dueDate,
          description: task.description,
        }));
        await logChecklistAction(logParamsArray);
      }
    }

    return {
      success: true,
      message: `Successfully assigned ${tasksData.length} task(s)`,
    };
  } catch (error) {
    console.error("Error submitting tasks:", error);
    return { success: false, message: "Failed to submit tasks" };
  }
};

// Fetch unique task descriptions for autocomplete
export const fetchUniqueTaskDescriptionsApi = async (
  section: "checklist" | "maintenance",
): Promise<string[]> => {
  try {
    const table =
      section === "maintenance" ? "unique_maintanence" : "unique_checklist";

    const { data, error } = await supabase
      .from(table)
      .select("task_description")
      .not("task_description", "is", null)
      .order("task_description", { ascending: true });

    if (error) {
      console.error(
        `Error fetching unique task descriptions from ${table}:`,
        error,
      );
      return [];
    }

    const uniqueDescriptions = [
      ...new Set(data.map((d) => d.task_description as string)),
    ];
    return uniqueDescriptions;
  } catch (error) {
    console.error("Error fetching unique task descriptions:", error);
    return [];
  }
};

// Upsert a task template into unique_maintanence if the description+machine doesn't exist yet.
// Called before inserting machine_maintenance tasks so new descriptions are always tracked.
export const upsertUniqueMaintenanceTaskApi = async (params: {
  description: string;
  machineName: string;
  givenBy: string;
  doerName: string;
  frequency: string;
  enableReminders: boolean;
  requireAttachment: boolean;
  startDate: string;
  sampleImage?: string;
}): Promise<void> => {
  try {
    const descTrimmed = params.description.trim();
    if (!descTrimmed) return;

    const { data: existing } = await supabase
      .from("unique_maintanence")
      .select("task_id")
      .ilike("task_description", descTrimmed)
      .ilike("name", params.doerName.trim())
      .limit(1);

    if (existing && existing.length > 0) return;

    const { error } = await supabase.from("unique_maintanence").insert({
      machine_name:       params.machineName,
      given_by:           params.givenBy,
      name:               params.doerName,
      task_description:   descTrimmed,
      frequency:          params.frequency,
      enable_reminder:    params.enableReminders ? "yes" : "no",
      require_attachment: params.requireAttachment ? "yes" : "no",
      task_start_date:    params.startDate || null,
      image:              params.sampleImage || null,
      created_at:         new Date().toISOString(),
    });

    if (error) console.error("Error inserting into unique_maintanence:", error);
  } catch (error) {
    console.error("Error in upsertUniqueMaintenanceTaskApi:", error);
  }
};

// Upsert a task template into unique_checklist if the description doesn't exist yet.
// Called before inserting checklist tasks so new descriptions are always tracked.
export const upsertUniqueChecklistTaskApi = async (params: {
  description: string;
  name: string;
  department: string;
  givenBy: string;
  frequency: string;
  enableReminders: boolean;
  requireAttachment: boolean;
  startDate: string;
  endDate?: string;
  sampleImage?: string;
}): Promise<void> => {
  try {
    const descTrimmed = params.description.trim();
    if (!descTrimmed) return;

    // Check if this description already exists
    const { data: existing } = await supabase
      .from("unique_checklist")
      .select("task_id")
      .ilike("task_description", descTrimmed)
      .limit(1);

    if (existing && existing.length > 0) return; // already in templates

    // Insert new template row
    const { error } = await supabase.from("unique_checklist").insert({
      name: params.name,
      department: params.department,
      given_by: params.givenBy,
      task_description: descTrimmed,
      frequency: params.frequency,
      enable_reminder: params.enableReminders ? "yes" : "no",
      require_attachment: params.requireAttachment ? "yes" : "no",
      task_start_date: params.startDate || null,
      task_end_date: params.endDate || null,
      image: params.sampleImage || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error inserting into unique_checklist:", error);
    }
  } catch (error) {
    console.error("Error in upsertUniqueChecklistTaskApi:", error);
  }
};
