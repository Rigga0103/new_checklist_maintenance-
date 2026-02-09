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
      role: "user",
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message || "Failed to create account" };
  }

  return { data };
};
