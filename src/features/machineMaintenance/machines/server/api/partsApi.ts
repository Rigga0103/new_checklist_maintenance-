import supabase from "@/utils/supabaseClient";
import { Part, CreatePartDTO } from "../../../types/types";

// Fetch all items from itemdetails table
export const fetchParts = async (): Promise<Part[]> => {
  try {
    const { data, error } = await supabase
      .from("itemdetails")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching parts:", error);
      throw error;
    }
    return data as Part[];
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Create a new part/item
export const createPart = async (
  part: CreatePartDTO,
): Promise<Part | null> => {
  try {
    // Manually calculate next ID
    const { data: maxIdData, error: maxIdError } = await supabase
      .from("itemdetails")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (maxIdError) {
      console.error("Error fetching max ID:", maxIdError);
      throw maxIdError;
    }

    const nextId = (maxIdData?.[0]?.id || 0) + 1;

    const { data, error } = await supabase
      .from("itemdetails")
      .insert([{
        ...part,
        id: nextId,
        RATE: part.RATE ? Number(part.RATE) : null,
        QTY: part.QTY ? Number(part.QTY) : null,
        Timestamp: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating part:", error);
      throw error;
    }
    return data as Part;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Update a part/item
export const updatePart = async (
  id: number,
  updates: Partial<CreatePartDTO>,
): Promise<Part | null> => {
  try {
    const updateData = { ...updates };
    if (updates.RATE !== undefined) updateData.RATE = updates.RATE ? Number(updates.RATE) : null as any;
    if (updates.QTY !== undefined) updateData.QTY = updates.QTY ? Number(updates.QTY) : null as any;

    const { data, error } = await supabase
      .from("itemdetails")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating part:", error);
      throw error;
    }
    return data as Part;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Delete a part/item
export const deletePart = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase.from("itemdetails").delete().eq("id", id);

    if (error) {
      console.error("Error deleting part:", error);
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
