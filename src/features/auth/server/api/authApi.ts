import supabase from "@/utils/supabaseClient";
import { LoginFormData, UserData } from "../../types/types";

interface LoginResponse {
  data?: UserData;
  error?: string;
}

export const loginCredentialsApi = async (
  formData: LoginFormData,
): Promise<LoginResponse> => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_name", formData.username)
    .eq("password", formData.password)
    .single();

  // Handle error or no data
  if (error || !data) {
    return { error: "Invalid username or password" };
  }

  // Check if user is inactive
  if (data.status !== "active") {
    localStorage.clear();
    return { error: "Your account is inactive. Please contact admin." };
  }

  // Store user access in localStorage
  if (data.user_access) {
    localStorage.setItem("user_access", data.user_access);
  }

  return { data };
};

export const signupUserApi = async (formData: {
  username: string;
  password: string;
  email: string;
  role?: string;
}): Promise<LoginResponse> => {
  // Check if username already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("user_name")
    .eq("user_name", formData.username)
    .single();

  if (existingUser) {
    return { error: "Username already exists" };
  }

  // Create new user
  const { data, error } = await supabase
    .from("users")
    .insert({
      user_name: formData.username,
      password: formData.password,
      email_id: formData.email,
      role: formData.role || "user",
      status: "active",
    })
    .select()
    .single();

  console.log(error, "error");
  console.log(data, "data");
  if (error) {
    return { error: error.message || "Failed to create account" };
  }

  // Assign default permissions
  const defaultPermissions = [
    {
      resource: "dashboard",
      can_read: true,
      can_write: true,
      can_edit: true,
      can_delete: false,
    },
    {
      resource: "checklist",
      can_read: true,
      can_write: true,
      can_edit: true,
      can_delete: false,
    },
    {
      resource: "delegation",
      can_read: true,
      can_write: true,
      can_edit: true,
      can_delete: false,
    },
  ];

  const permissionData = defaultPermissions.map((p) => ({
    user_id: data.id,
    resource: p.resource,
    can_read: p.can_read,
    can_write: p.can_write,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  const { error: permError } = await supabase
    .from("user_permissions")
    .insert(permissionData);

  if (permError) {
    console.error("Error creating default permissions:", permError);
    // Optional: deciding whether to fail the whole process or just log.
    // For now, logging error but returning success for user creation as it's critical.
  }

  return { data };
};
