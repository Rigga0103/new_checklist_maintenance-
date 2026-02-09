// Settings feature types

export interface User {
  id: number;
  user_name: string;
  password: string;
  email_id: string | null;
  number: string | null;
  employee_id: string | null;
  role: string;
  status: string | null;
  user_access: string | null;
  leave_date: string | null;
  leave_end_date: string | null;
  remark: string | null;
  department?: string | null;
  given_by?: string | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email: string;
  phone: string;
  employee_id?: string;
  role: string;
  status: string;
  user_access: string;
}

export interface UpdateUserPayload {
  user_name: string;
  password: string;
  email_id: string;
  number: string;
  employee_id?: string;
  role: string;
  status: string;
  user_access: string;
  leave_date?: string | null;
  leave_end_date?: string | null;
  remark?: string | null;
}

export interface Department {
  id: number;
  department: string;
  given_by: string;
}

export interface CreateDepartmentPayload {
  name: string;
  givenBy: string;
}

export interface UpdateDepartmentPayload {
  department: string;
  given_by: string;
}
