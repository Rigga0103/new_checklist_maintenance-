import supabase from "@/utils/supabaseClient";
import type {
  User,
  Department,
  CreateUserPayload,
  UpdateUserPayload,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../../types/types";

// ============ User APIs ============

/**
 * Fetch all users with details
 */
export const fetchUserDetailsApi = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from("users")
    .select("*, user_access, leave_date, leave_end_date, remark, employee_id")
    .not("user_name", "is", null)
    .neq("user_name", "");

  if (error) {
    console.error("Error when fetching data", error);
    throw error;
  }

  return data as User[];
};

/**
 * Create new user
 */
export const createUserApi = async (
  newUser: CreateUserPayload,
): Promise<User> => {
  // Get the current max ID
  const { data: maxIdData, error: maxIdError } = await supabase
    .from("users")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (maxIdError) {
    console.error("Error fetching last ID:", maxIdError);
    throw maxIdError;
  }

  const lastId = maxIdData?.[0]?.id || 0;
  const newId = lastId + 1;

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        id: newId,
        user_name: newUser.username,
        password: newUser.password,
        email_id: newUser.email,
        number: newUser.phone,
        employee_id: newUser.employee_id,
        role: newUser.role,
        status: newUser.status,
        user_access: newUser.user_access,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error when creating user:", error);
    throw error;
  }

  return data as User;
};

/**
 * Update existing user
 */
export const updateUserDataApi = async (
  id: number,
  updatedUser: UpdateUserPayload,
): Promise<User> => {
  const updateData: Record<string, unknown> = {
    user_name: updatedUser.user_name,
    password: updatedUser.password,
    email_id: updatedUser.email_id,
    number: updatedUser.number,
    employee_id: updatedUser.employee_id,
    role: updatedUser.role,
    status: updatedUser.status,
    user_access: updatedUser.user_access,
  };

  // Add optional leave data
  if (updatedUser.leave_date !== undefined) {
    updateData.leave_date = updatedUser.leave_date;
  }
  if (updatedUser.leave_end_date !== undefined) {
    updateData.leave_end_date = updatedUser.leave_end_date;
  }
  if (updatedUser.remark !== undefined) {
    updateData.remark = updatedUser.remark;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error when updating user:", error);
    throw error;
  }

  return data as User;
};

/**
 * Delete user by ID
 */
export const deleteUserByIdApi = async (id: number): Promise<void> => {
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// ============ Department APIs ============

/**
 * Fetch departments with given_by (unique combinations)
 */
export const fetchDepartmentDataApi = async (): Promise<Department[]> => {
  const { data, error } = await supabase
    .from("users")
    .select("id, department, given_by")
    .not("department", "is", null)
    .neq("department", "")
    .order("department", { ascending: true });

  if (error) {
    console.error("Error when fetching departments:", error);
    throw error;
  }

  // Filter unique combinations of department + given_by
  const uniqueDepartments = Array.from(
    new Map(
      (data || []).map((item) => [`${item.department}-${item.given_by}`, item]),
    ).values(),
  );

  return uniqueDepartments as Department[];
};

/**
 * Fetch unique department names only
 */
export const fetchDepartmentsOnlyApi = async (): Promise<
  { department: string }[]
> => {
  const { data, error } = await supabase
    .from("users")
    .select("department")
    .not("department", "is", null)
    .neq("department", "")
    .order("department", { ascending: true });

  if (error) {
    console.error("Error when fetching departments:", error);
    throw error;
  }

  const uniqueDepartments = [
    ...new Set((data || []).map((item) => item.department)),
  ]
    .filter((dept): dept is string => Boolean(dept))
    .map((dept) => ({ department: dept }));

  return uniqueDepartments;
};

/**
 * Fetch unique given_by names
 */
export const fetchGivenByDataApi = async (): Promise<
  { given_by: string }[]
> => {
  const { data, error } = await supabase
    .from("users")
    .select("given_by")
    .not("given_by", "is", null)
    .neq("given_by", "")
    .order("given_by", { ascending: true });

  if (error) {
    console.error("Error when fetching given_by data:", error);
    throw error;
  }

  const uniqueGivenBy = [...new Set((data || []).map((item) => item.given_by))]
    .filter((givenBy): givenBy is string => Boolean(givenBy))
    .map((givenBy) => ({ given_by: givenBy }));

  return uniqueGivenBy;
};

/**
 * Create new department entry
 */
export const createDepartmentApi = async (
  newDept: CreateDepartmentPayload,
): Promise<Department> => {
  const { data: maxIdData, error: maxIdError } = await supabase
    .from("users")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (maxIdError) {
    console.error("Error fetching last ID:", maxIdError);
    throw maxIdError;
  }

  const lastId = maxIdData?.[0]?.id || 0;
  const newId = lastId + 1;

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        id: newId,
        department: newDept.name,
        given_by: newDept.givenBy,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error when creating department:", error);
    throw error;
  }

  return data as Department;
};

/**
 * Update department entry
 */
export const updateDepartmentDataApi = async (
  id: number,
  updatedDept: UpdateDepartmentPayload,
): Promise<Department> => {
  if (!updatedDept.department || !updatedDept.given_by) {
    throw new Error("Missing department or given_by data");
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      department: updatedDept.department,
      given_by: updatedDept.given_by,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error when updating department:", error);
    throw error;
  }

  return data as Department;
};
