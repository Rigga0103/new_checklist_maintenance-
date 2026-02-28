import supabase from "@/utils/supabaseClient";
import { GeneratedTask } from "../../types/types";

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

// Push generated tasks directly to Supabase (matching legacy behavior)
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

    // 1. Fetch the current MAX task_id from the table to increment manually
    const { data: maxIdData, error: maxIdError } = await supabase
      .from(submitTable)
      .select("task_id")
      .order("task_id", { ascending: false })
      .limit(1);

    if (maxIdError) {
      console.error("Error fetching max task_id:", maxIdError);
      return { success: false, message: "Failed to generate Task IDs" };
    }

    const currentMaxId =
      maxIdData && maxIdData.length > 0 ? Number(maxIdData[0].task_id) : 0;

    // 2. Map tasks to database schema with sequential IDs
    let tasksData: any[] = [];

    if (section === "maintenance") {
      tasksData = generatedTasks.map((task, index) => ({
        task_id: currentMaxId + index + 1,
        machine_name: task.department, // For maintenance, department field holds machine name
        doer_name: task.assignTo,
        task_description: task.description,
        task_start_date: task.dueDate,
        frequency: task.frequency,
        status: "pending",
        created_at: new Date().toISOString(),
        enable_reminder: task.enableReminders ? "yes" : "no",
        require_attachment: task.requireAttachment ? "yes" : "no",
      }));
    } else {
      tasksData = generatedTasks.map((task, index) => ({
        task_id: currentMaxId + index + 1,
        department: task.department,
        given_by: task.givenBy,
        name: task.assignTo,
        task_description: task.description,
        task_start_date: task.dueDate,
        frequency: task.frequency,
        enable_reminder: task.enableReminders ? "yes" : "no",
        require_attachment: task.requireAttachment ? "yes" : "no",
        // status: "pending", // Status column in checklist is enum(yes/no), cannot be "pending".
        created_at: new Date().toISOString(),
      }));

      // If delegation (one-time), it supports status text
      if (submitTable === "delegation") {
        tasksData = tasksData.map((t, index) => ({
          ...t,
          status: "pending",
          // Store the end date (deadline) as planned_date if provided
          planned_date: generatedTasks[index]?.endDate || null,
        }));
      }
    }

    // 3. Insert into database
    const { data, error } = await supabase
      .from(submitTable)
      .insert(tasksData)
      .select();

    if (error) {
      console.error("Error inserting tasks:", error);
      return { success: false, message: error.message };
    }

    console.log(
      `Successfully inserted ${tasksData.length} tasks into ${submitTable}`,
      data,
    );
    return {
      success: true,
      message: `Successfully assigned ${tasksData.length} task(s)`,
    };
  } catch (error) {
    console.error("Error submitting tasks:", error);
    return { success: false, message: "Failed to submit tasks" };
  }
};
