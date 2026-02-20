import supabase from "@/utils/supabaseClient";

// Types matching the Supabase tables
export interface MachineRepairTask {
  id: number;
  created_at: string; // timestamp
  task_id: number;
  form_filled_by?: string;
  assigned_to?: string;
  machine_name?: string;
  issue_detail?: string;
  part_replaced?: string;
  task_start_date?: string;
  actual_date?: string;
  delay?: string; // interval
  work_done?: string;
  photo_url?: string;
  status?: string;
  vendor_name?: string;
  bill_copy_url?: string;
  bill_amount?: number;
  remarks?: string;
}

export interface MachineMaintenanceTask {
  id: number;
  created_at: string;
  machine_name: string;
  task_description?: string;
  frequency?: string;
  assigned_to?: string;
  department?: string;
  task_start_date?: string;
  actual_date?: string;
  status?: string;
  remarks?: string;
  image_url?: string;
  maintenance_cost?: number;
  delay?: string;
  doer_name?: string;
}

export interface RepairDashboardData {
  repairs: MachineRepairTask[];
  maintenance: MachineMaintenanceTask[];
}

// Fetch all repair data
export const fetchRepairData = async (): Promise<MachineRepairTask[]> => {
  try {
    const { data, error } = await supabase
      .from("machine_repair")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching machine_repair:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchRepairData:", error);
    return [];
  }
};

// Fetch all maintenance data (used by Dashboard for charts/stats)
export const fetchMaintenanceData = async (): Promise<
  MachineMaintenanceTask[]
> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching machine_maintenance:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceData:", error);
    return [];
  }
};

// Fetch today's pending maintenance tasks (mirrors checklist pattern)
export const fetchMaintenancePending = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<MachineMaintenanceTask[]> => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const startOfToday = `${today}T00:00:00`;
    const endOfToday = `${today}T23:59:59`;

    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .gte("task_start_date", startOfToday)
      .lte("task_start_date", endOfToday)
      .is("actual_date", null)
      .order("task_start_date", { ascending: true });

    // Search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      query = query.or(
        `machine_name.ilike.%${sv}%,task_description.ilike.%${sv}%,doer_name.ilike.%${sv}%,frequency.ilike.%${sv}%`,
      );
    }

    // Role filter - regular users only see their own tasks
    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching pending maintenance:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenancePending:", error);
    return [];
  }
};

// Fetch completed maintenance tasks (history)
export const fetchMaintenanceHistory = async (
  searchTerm = "",
  role: string | null = null,
  username: string | null = null,
): Promise<MachineMaintenanceTask[]> => {
  try {
    let query = supabase
      .from("machine_maintenance")
      .select("*")
      .not("actual_date", "is", null)
      .order("actual_date", { ascending: false });

    // Search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const sv = searchTerm.trim();
      query = query.or(
        `machine_name.ilike.%${sv}%,task_description.ilike.%${sv}%,doer_name.ilike.%${sv}%,frequency.ilike.%${sv}%`,
      );
    }

    // Role filter
    if (role === "user" && username) {
      query = query.eq("doer_name", username);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching maintenance history:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error in fetchMaintenanceHistory:", error);
    return [];
  }
};

export const updateMaintenanceTask = async (
  id: number,
  updates: Partial<MachineMaintenanceTask>,
): Promise<MachineMaintenanceTask | null> => {
  try {
    const { data, error } = await supabase
      .from("machine_maintenance")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating machine_maintenance:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in updateMaintenanceTask:", error);
    throw error;
  }
};
