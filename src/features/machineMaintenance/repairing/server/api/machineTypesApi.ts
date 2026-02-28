import supabase from "@/utils/supabaseClient";

export interface MachineType {
  id: number;
  type_name: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface MachineName {
  id: number;
  type_id: number;
  machine_name: string;
  status: "active" | "inactive";
  created_at: string;
}

// Fetch all active Machine Types
export const fetchMachineTypes = async (): Promise<MachineType[]> => {
  try {
    const { data, error } = await supabase
      .from("repair_machine_types")
      .select("*")
      .order("type_name", { ascending: true });

    if (error) {
      console.error("Error fetching machine types:", error);
      return [];
    }
    return data as MachineType[];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Fetch all Machine Names for a specific Type
export const fetchMachineNamesByType = async (
  typeId: number,
): Promise<MachineName[]> => {
  try {
    const { data, error } = await supabase
      .from("repair_machine_names")
      .select("*")
      .eq("type_id", typeId)
      .order("machine_name", { ascending: true });

    if (error) {
      console.error("Error fetching machine names:", error);
      return [];
    }
    return data as MachineName[];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Fetch all Machine Names
export const fetchAllMachineNames = async (): Promise<MachineName[]> => {
  try {
    const { data, error } = await supabase
      .from("repair_machine_names")
      .select("*")
      .order("machine_name", { ascending: true });

    if (error) {
      console.error("Error fetching all machine names:", error);
      return [];
    }
    return data as MachineName[];
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

// Create a new Machine Type
export const createMachineType = async (
  typeName: string,
): Promise<MachineType | null> => {
  try {
    const { data, error } = await supabase
      .from("repair_machine_types")
      .insert([{ type_name: typeName, status: "active" }])
      .select()
      .single();

    if (error) {
      console.error("Error creating machine type:", error);
      throw error;
    }
    return data as MachineType;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Update a Machine Type
export const updateMachineType = async (
  id: number,
  updates: Partial<MachineType>,
): Promise<MachineType | null> => {
  try {
    const { data, error } = await supabase
      .from("repair_machine_types")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating machine type:", error);
      throw error;
    }
    return data as MachineType;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Delete a Machine Type
export const deleteMachineType = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("repair_machine_types")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting machine type:", error);
    throw error;
  }
};

// Create a new Machine Name
export const createMachineName = async (
  typeId: number,
  machineName: string,
): Promise<MachineName | null> => {
  try {
    const { data, error } = await supabase
      .from("repair_machine_names")
      .insert([
        { type_id: typeId, machine_name: machineName, status: "active" },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating machine name:", error);
      throw error;
    }
    return data as MachineName;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Update a Machine Name
export const updateMachineName = async (
  id: number,
  updates: Partial<MachineName>,
): Promise<MachineName | null> => {
  try {
    const { data, error } = await supabase
      .from("repair_machine_names")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating machine name:", error);
      throw error;
    }
    return data as MachineName;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Delete a Machine Name
export const deleteMachineName = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("repair_machine_names")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting machine name:", error);
    throw error;
  }
};
