// Auth feature types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface SignupFormData extends LoginFormData {
  email: string;
  confirmPassword: string;
  role?: string;
}

export interface UserData {
  id?: number;
  user_name?: string;
  username?: string;
  email_id?: string;
  email?: string;
  role?: string;
  status?: string;
  user_access?: string;
}

export interface LoginState {
  isLoggedIn: boolean;
  userData: UserData | null;
  error: string | null;
  loading: boolean;
}

export interface SignupState {
  isSignedUp: boolean;
  userData: UserData | null;
  error: string | null;
  loading: boolean;
}

export interface ToastState {
  show: boolean;
  message: string;
  type: "success" | "error" | "";
}
