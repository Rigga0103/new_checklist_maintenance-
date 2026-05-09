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
    console.error("Error when fetching user details:", error.message || error);
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
    console.error("Error fetching last ID for user:", maxIdError.message || maxIdError);
    throw maxIdError;
  }

  const lastId = maxIdData?.[0]?.id || 0;
  const newId = lastId + 1;

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        id: newId,
        user_name: newUser.user_name,
        password: newUser.password,
        email_id: newUser.email_id,
        number: newUser.number || null,
        employee_id: newUser.employee_id || null,
        role: newUser.role,
        status: newUser.status,
        user_access: newUser.user_access,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error when creating user:", error.message || error);
    throw error;
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
    user_id: newId,
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
    console.error("Error creating default permissions:", permError.message || permError);
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
    number: updatedUser.number || null,
    employee_id: updatedUser.employee_id || null,
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

  // Filter out undefined values to avoid Supabase errors
  const cleanUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from("users")
    .update(cleanUpdateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error when updating user:", error.message || error, error.details || "");
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
    console.error("Error deleting user:", error.message || error);
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
    console.error("Error when fetching departments:", error.message || error);
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
    console.error("Error when fetching departments only:", error.message || error);
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
    console.error("Error when fetching given_by data:", error.message || error);
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
    console.error("Error fetching last ID for department:", maxIdError.message || maxIdError);
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
    console.error("Error when creating department:", error.message || error);
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
    console.error("Error when updating department:", error.message || error);
    throw error;
  }

  return data as Department;
};

// ============ Working Day Calendar APIs ============

export interface WorkingDayRow {
  working_date: string;
  day: string;
  week_num: number;
  month: number;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const fetchHolidaysForYearApi = async (year: number): Promise<string[]> => {
  const { data, error } = await supabase
    .from("holidays")
    .select("leave_date")
    .gte("leave_date", `${year}-01-01`)
    .lte("leave_date", `${year}-12-31`);
  if (error) throw error;
  return (data || []).map((h) => h.leave_date as string);
};

// fromDate: "YYYY-MM-DD" — calendar is generated from this date to Dec 31 of that year
export const fetchWorkingDayCountForDateApi = async (fromDate: string): Promise<number> => {
  const year = fromDate.split("-")[0];
  const { count, error } = await supabase
    .from("working_day_calender")
    .select("*", { count: "exact", head: true })
    .gte("working_date", fromDate)
    .lte("working_date", `${year}-12-31`);
  if (error) throw error;
  return count ?? 0;
};

export const initializeWorkingCalendarApi = async (
  fromDate: string,
  skipSunday: boolean,
  onProgress?: (inserted: number, total: number) => void,
): Promise<number> => {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const year = parseInt(fromDate.split("-")[0], 10);

  const holidays = await fetchHolidaysForYearApi(year);
  const holidaySet = new Set(holidays);

  const rows: WorkingDayRow[] = [];
  const [y, m, day] = fromDate.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  while (d.getFullYear() === year) {
    const dow = d.getDay();
    if (!(skipSunday && dow === 0)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!holidaySet.has(iso)) {
        rows.push({
          working_date: iso,
          day: dayNames[dow],
          week_num: getISOWeek(d),
          month: d.getMonth() + 1,
        });
      }
    }
    d.setDate(d.getDate() + 1);
  }

  // Delete existing rows from fromDate to end of year
  const { error: delError } = await supabase
    .from("working_day_calender")
    .delete()
    .gte("working_date", fromDate)
    .lte("working_date", `${year}-12-31`);
  if (delError) throw delError;

  // Batch insert in chunks of 100
  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("working_day_calender").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
    onProgress?.(inserted, rows.length);
  }

  return inserted;
};

// ============ Permission APIs ============

/**
 * Fetch permissions for a specific user
 */
export const fetchUserPermissionsApi = async (
  userId: number,
): Promise<import("../../types/types").UserPermission[]> => {
  const { data, error } = await supabase
    .from("user_permissions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user permissions:", error.message || error);
    return [];
  }

  return data as import("../../types/types").UserPermission[];
};

/**
 * Update user permissions (Upsert)
 */
export const updateUserPermissionsApi = async (
  userId: number,
  permissions: {
    resource: string;
    can_read: boolean;
    can_write: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }[],
): Promise<void> => {
  const upsertData = permissions.map((p) => ({
    user_id: userId,
    resource: p.resource,
    can_read: p.can_read,
    can_write: p.can_write,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  const { error } = await supabase
    .from("user_permissions")
    .upsert(upsertData, { onConflict: "user_id, resource" });

  if (error) {
    console.error("Error updating user permissions:", error.message || error);
    throw error;
  }
};
