import supabase from "@/utils/supabaseClient";
import { Vendor, CreateVendorDTO } from "../../../types/types";

// Fetch all vendors from VendorList table
export const fetchVendors = async (): Promise<Vendor[]> => {
  try {
    const { data, error } = await supabase
      .from("vendorlist")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching vendors:", error);
      throw error;
    }
    return data as Vendor[];
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Create a new vendor
export const createVendor = async (
  vendor: CreateVendorDTO,
): Promise<Vendor | null> => {
  try {
    const { data, error } = await supabase
      .from("vendorlist")
      .insert([{
        ...vendor,
        Timestamp: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating vendor:", error);
      throw error;
    }
    return data as Vendor;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Update a vendor
export const updateVendor = async (
  id: number,
  updates: Partial<CreateVendorDTO>,
): Promise<Vendor | null> => {
  try {
    const { data, error } = await supabase
      .from("vendorlist")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating vendor:", error);
      throw error;
    }
    return data as Vendor;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// Delete a vendor
export const deleteVendor = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase.from("vendorlist").delete().eq("id", id);

    if (error) {
      console.error("Error deleting vendor:", error);
      throw error;
    }
    return true;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
