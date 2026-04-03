import supabase from "@/utils/supabaseClient";

export interface Machine {
  id: number;
  created_at: string;
  machine_name: string;
  serial_no: string | null;
  model: string | null;
  location: string | null;
  department: string | null;
  type: string | null;
  status: "active" | "inactive";
}

export interface CreateMachineDTO {
  machine_name: string;
  serial_no?: string;
  model?: string;
  location?: string;
  department?: string;
  type?: string;
  status?: "active" | "inactive";
}

// Fetch all machines
export const fetchMachines = async (): Promise<Machine[]> => {
  try {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("machine_name", { ascending: true });

    if (error) {
      console.error("Error fetching machines:", error);
      return [];
    }
    return data as Machine[];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Fetch active machines only (for dropdowns)
export const fetchActiveMachines = async (): Promise<Machine[]> => {
  try {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .eq("status", "active")
      .order("machine_name", { ascending: true });

    if (error) {
      console.error("Error fetching active machines:", error);
      return [];
    }
    return data as Machine[];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Create a new machine
export const createMachine = async (
  machine: CreateMachineDTO,
): Promise<Machine | null> => {
  try {
    const { data, error } = await supabase
      .from("machines")
      .insert([{ ...machine, status: machine.status || "active" }])
      .select()
      .single();

    if (error) {
      console.error("Error creating machine:", error);
      return null;
    }
    return data as Machine;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

// Update a machine
export const updateMachine = async (
  id: number,
  updates: Partial<CreateMachineDTO>,
): Promise<Machine | null> => {
  try {
    const { data, error } = await supabase
      .from("machines")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating machine:", error);
      return null;
    }
    return data as Machine;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

// Delete a machine
export const deleteMachine = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase.from("machines").delete().eq("id", id);

    if (error) {
      console.error("Error deleting machine:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};
