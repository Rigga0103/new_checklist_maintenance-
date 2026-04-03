import supabase from "@/utils/supabaseClient";

export interface MaintenanceSchedule {
  id: number;
  created_at: string;
  machine_type: string | null;
  machine_name: string;
  task_description: string;
  frequency: string;
  assigned_to: string | null;
  department: string | null;
}

export interface CreateScheduleDTO {
  machine_type?: string;
  machine_name: string;
  task_description: string;
  frequency: string;
  assigned_to?: string;
  department?: string;
}

// Fetch all schedules
export const fetchMaintenanceSchedules = async (): Promise<
  MaintenanceSchedule[]
> => {
  try {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching schedules:", error);
      return [];
    }
    return data as MaintenanceSchedule[];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Create a new schedule
export const createMaintenanceSchedule = async (
  schedule: CreateScheduleDTO,
): Promise<MaintenanceSchedule | null> => {
  try {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .insert([schedule])
      .select()
      .single();

    if (error) {
      console.error("Error creating schedule:", error);
      return null;
    }
    return data as MaintenanceSchedule;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

// Update a schedule
export const updateMaintenanceSchedule = async (
  id: number,
  updates: Partial<CreateScheduleDTO>,
): Promise<MaintenanceSchedule | null> => {
  try {
    const { data, error } = await supabase
      .from("maintenance_schedules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating schedule:", error);
      return null;
    }
    return data as MaintenanceSchedule;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

// Delete a schedule
export const deleteMaintenanceSchedule = async (
  id: number,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting schedule:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};

// Generate tasks from schedules
export const generateDailyTasks = async (): Promise<{
  count: number;
  message: string;
}> => {
  try {
    // 1. Fetch all schedules
    const schedules = await fetchMaintenanceSchedules();
    if (schedules.length === 0)
      return { count: 0, message: "No schedules found" };

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getDate(); // 1-31

    // 2. Filter schedules due today
    const dueSchedules = schedules.filter((schedule) => {
      if (schedule.frequency === "daily") return true;
      if (schedule.frequency === "weekly" && dayOfWeek === 1) return true; // Generate on Mondays
      if (schedule.frequency === "monthly" && dayOfMonth === 1) return true; // Generate on 1st of month
      return false;
    });

    if (dueSchedules.length === 0)
      return { count: 0, message: "No schedules due today" };

    // 3. Create tasks (avoid duplicates logic could be here, but for now simple insert)
    // We should check if a task for this schedule and this date already exists to be safe
    // For simplicity, we'll just insert. Providing a unique constraint on (schedule_id, date) in DB would be better.

    const tasksToInsert = dueSchedules.map((schedule) => ({
      machine_type: schedule.machine_type,
      machine_name: schedule.machine_name,
      task_description: schedule.task_description,
      frequency: schedule.frequency,
      doer_name: schedule.assigned_to, // Mapping assigned_to to doer_name
      department: schedule.department,
      task_start_date: new Date().toISOString(), // Today
      status: "pending",
      // maintenance_schedules_id: schedule.id // Ideally link back, but schema might not have it yet
    }));

    const { data, error } = await supabase
      .from("machine_maintenance")
      .insert(tasksToInsert)
      .select();

    if (error) {
      console.error("Error generating tasks:", error);
      throw error;
    }

    return {
      count: data.length,
      message: `Successfully generated ${data.length} tasks`,
    };
  } catch (error) {
    console.error("Error in generateDailyTasks:", error);
    return { count: 0, message: "Failed to generate tasks" };
  }
};
