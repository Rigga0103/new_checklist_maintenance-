"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus,
  User,
  Building,
  X,
  Edit,
  Trash2,
  Search,
  ChevronDown,
  Calendar,
  RefreshCw,
  Loader2,
  Shield,
  Upload,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useDepartments,
  useDepartmentsOnly,
  useGivenBy,
  useCreateDepartment,
  useUpdateDepartment,
} from "../server/tanstackQuery/useSettings";
import type {
  User as IUser,
  CreateUserPayload,
  UpdateUserPayload,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  Department,
} from "../types/types";
import { SettingsTableSkeleton } from "./SettingsSkeleton";
import supabase from "@/utils/supabaseClient";
import PermissionsModal from "./PermissionsModal";
import CsvImportHub from "./CsvImportHub";
import HolidayAndWorkingDays from "./HolidayAndWorkingDays";
import WorkingDayCalendarSetup from "./WorkingDayCalendarSetup";

const SETTINGS_ITEMS_PER_PAGE = 20;

// Tab types
type TabType = "users" | "departments" | "leave" | "import" | "holiday" | "migrate" | "calendar";
type DeptSubTab = "departments" | "givenBy";

// Initial form states
const initialUserForm = {
  username: "",
  email: "",
  password: "",
  phone: "",
  employee_id: "",
  role: "user",
  status: "active",
  department: "",
};

const initialDeptForm = {
  name: "",
  givenBy: "",
};

// UI Classes for consistency with other forms
const inputClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const selectClass =
  "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const labelClass =
  "block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1";

// Migration state types
type MigrationStatus = "idle" | "previewing" | "previewed" | "migrating" | "done" | "error";

export default function MainSettings() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [activeDeptSubTab, setActiveDeptSubTab] =
    useState<DeptSubTab>("departments");

  // Migrate Tasks state
  const [migrateTaskType, setMigrateTaskType] = useState<"checklist" | "maintenance">("checklist");
  const [migrateFrom, setMigrateFrom] = useState("");
  const [migrateTo, setMigrateTo] = useState("");
  const [migrateCutoffDate, setMigrateCutoffDate] = useState("");
  const [migrateStatus, setMigrateStatus] = useState<MigrationStatus>("idle");
  const [migratePreviewCount, setMigratePreviewCount] = useState<number | null>(null);
  const [migrateAffectedCount, setMigrateAffectedCount] = useState<number | null>(null);
  const [migrateError, setMigrateError] = useState<string | null>(null);
  const [migratePreviewTasks, setMigratePreviewTasks] = useState<any[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [migrationHistory, setMigrationHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Permission Modal state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionUser, setPermissionUser] = useState<IUser | null>(null);

  const handlePermissionsClick = (user: IUser) => {
    setPermissionUser(user);
    setShowPermissionsModal(true);
  };

  // Modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentDeptId, setCurrentDeptId] = useState<number | null>(null);

  // Pagination state
  const [userPage, setUserPage] = useState(1);
  const [deptPage, setDeptPage] = useState(1);

  // Filter state
  const [usernameFilter, setUsernameFilter] = useState("");
  const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
  const [leaveUsernameFilter, setLeaveUsernameFilter] = useState("");

  // Leave management state
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [remark, setRemark] = useState("");

  // Form state
  const [userForm, setUserForm] = useState(initialUserForm);
  const [deptForm, setDeptForm] = useState(initialDeptForm);

  // Fetch data using TanStack Query
  const {
    data: userData = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useUsers();
  const { data: departmentData = [], isLoading: deptsLoading } =
    useDepartments();
  const { data: departmentsOnly = [] } = useDepartmentsOnly();
  const { data: givenByData = [] } = useGivenBy();

  // Mutations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const createDeptMutation = useCreateDepartment();
  const updateDeptMutation = useUpdateDepartment();

  // Permissions
  const {
    canWrite,
    canEdit,
    canDelete,
    isLoading: rbacLoading,
  } = useRBAC("settings");

  // Computed values
  const filteredUsers = useMemo(() => {
    return (userData || []).filter(
      (user) =>
        !usernameFilter ||
        (user.user_name || "").toLowerCase().includes(usernameFilter.toLowerCase()),
    );
  }, [userData, usernameFilter]);

  // Paginated users
  const userTotalPages = Math.ceil(
    filteredUsers.length / SETTINGS_ITEMS_PER_PAGE,
  );
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * SETTINGS_ITEMS_PER_PAGE,
    userPage * SETTINGS_ITEMS_PER_PAGE,
  );

  // Paginated departments
  const deptTotalPages = Math.ceil(
    departmentData.length / SETTINGS_ITEMS_PER_PAGE,
  );
  const paginatedDepts = departmentData.slice(
    (deptPage - 1) * SETTINGS_ITEMS_PER_PAGE,
    deptPage * SETTINGS_ITEMS_PER_PAGE,
  );

  const filteredLeaveUsers = useMemo(() => {
    return (userData || []).filter(
      (user) =>
        !leaveUsernameFilter ||
        (user.user_name || "")
          .toLowerCase()
          .includes(leaveUsernameFilter.toLowerCase()),
    );
  }, [userData, leaveUsernameFilter]);

  // Handlers
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setUserPage(1);
    setDeptPage(1);
  }, []);

  // Migration handlers
  const loadMigrationHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("task_migration_log")
        .select("*")
        .order("migrated_at", { ascending: false })
        .limit(30);
      setMigrationHistory(data ?? []);
    } catch {
      // silently fail — table may not exist in all envs
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "migrate") loadMigrationHistory();
  }, [activeTab, loadMigrationHistory]);

  const handleMigratePreview = useCallback(async () => {
    if (!migrateFrom.trim() || !migrateTo.trim() || !migrateCutoffDate) {
      toast.error("Please fill in all migration fields before previewing.");
      return;
    }
    if (migrateFrom.trim() === migrateTo.trim()) {
      toast.error("From and To users cannot be the same.");
      return;
    }
    setMigrateStatus("previewing");
    setMigrateError(null);
    setMigratePreviewCount(null);
    setMigratePreviewTasks([]);
    try {
      const cutoffTimestamp = `${migrateCutoffDate}T00:00:00`;
      const table = migrateTaskType === "checklist" ? "checklist" : "machine_maintenance";
      const nameField = migrateTaskType === "checklist" ? "name" : "doer_name";
      const descCols = migrateTaskType === "checklist"
        ? "task_id,task_description,department,task_start_date,frequency"
        : "task_id,task_description,machine_name,task_start_date,frequency";

      const [{ count, error }, { data: sampleTasks }] = await Promise.all([
        supabase.from(table).select("*", { count: "exact", head: true })
          .eq(nameField, migrateFrom.trim()).gt("task_start_date", cutoffTimestamp),
        supabase.from(table).select(descCols)
          .eq(nameField, migrateFrom.trim()).gt("task_start_date", cutoffTimestamp)
          .order("task_start_date", { ascending: true }).limit(10),
      ]);

      if (error) throw error;
      setMigratePreviewCount(count ?? 0);
      setMigratePreviewTasks(sampleTasks ?? []);
      setMigrateStatus("previewed");
    } catch (err: any) {
      setMigrateError(err?.message || "Failed to fetch preview count.");
      setMigrateStatus("error");
    }
  }, [migrateFrom, migrateTo, migrateCutoffDate, migrateTaskType]);

  const handleMigrateExecute = useCallback(async () => {
    if (!migratePreviewCount || migratePreviewCount === 0) {
      toast.info("No tasks to migrate.");
      return;
    }
    const label = migrateTaskType === "checklist" ? "checklist" : "machine maintenance";
    if (!confirm(
      `This will reassign ${migratePreviewCount} ${label} task(s) from "${migrateFrom}" to "${migrateTo}" for all dates after ${migrateCutoffDate}.\n\nTasks before this date will stay as-is so you can track who did them.\n\nThis action cannot be undone. Proceed?`
    )) return;

    setMigrateStatus("migrating");
    setMigrateError(null);
    try {
      const cutoffTimestamp = `${migrateCutoffDate}T00:00:00`;
      const now = new Date().toISOString();
      const table = migrateTaskType === "checklist" ? "checklist" : "machine_maintenance";
      const nameField = migrateTaskType === "checklist" ? "name" : "doer_name";

      const [{ data: toUserData }, { data: fromUserData }] = await Promise.all([
        supabase.from("users").select("id").eq("user_name", migrateTo.trim()).single(),
        supabase.from("users").select("id").eq("user_name", migrateFrom.trim()).single(),
      ]);
      const toUserId = toUserData?.id ?? null;
      const fromUserId = fromUserData?.id ?? null;

      const updatePayload: Record<string, unknown> = {
        [nameField]: migrateTo.trim(),
        is_migrated: true,
        migrated_at: now,
        migrated_from_user_id: fromUserId,
      };
      if (toUserId !== null) updatePayload.assignee_user_id = toUserId;

      const { error } = await supabase.from(table)
        .update(updatePayload)
        .eq(nameField, migrateFrom.trim())
        .gt("task_start_date", cutoffTimestamp);

      if (error) throw error;

      const adminName = typeof window !== "undefined" ? localStorage.getItem("user-name") ?? "admin" : "admin";
      await supabase.from("task_migration_log").insert({
        migrated_by:    adminName,
        from_user_id:   fromUserId,
        to_user_id:     toUserId,
        from_user_name: migrateFrom.trim(),
        to_user_name:   migrateTo.trim(),
        task_type:      migrateTaskType,
        tasks_migrated: migratePreviewCount ?? 0,
        reason:         `Migrated via settings panel — cutoff: ${migrateCutoffDate}`,
      });

      setMigrateAffectedCount(migratePreviewCount);
      setMigratePreviewCount(0);
      setMigratePreviewTasks([]);
      setMigrateStatus("done");
      toast.success(`Migration complete! ${migratePreviewCount} task(s) reassigned to ${migrateTo}.`);
      loadMigrationHistory();
    } catch (err: any) {
      setMigrateError(err?.message || "Migration failed. Please try again.");
      setMigrateStatus("error");
      toast.error("Migration failed.");
    }
  }, [migrateFrom, migrateTo, migrateCutoffDate, migratePreviewCount, migrateTaskType, loadMigrationHistory]);

  const handleMigrateReset = useCallback(() => {
    setMigrateStatus("idle");
    setMigratePreviewCount(null);
    setMigrateAffectedCount(null);
    setMigrateError(null);
    setMigratePreviewTasks([]);
  }, []);

  const handleAddButtonClick = useCallback(() => {
    if (activeTab === "users") {
      setUserForm(initialUserForm);
      setIsEditing(false);
      setCurrentUserId(null);
      setShowUserModal(true);
    } else if (activeTab === "departments") {
      setDeptForm(initialDeptForm);
      setIsEditing(false);
      setCurrentDeptId(null);
      setShowDeptModal(true);
    }
  }, [activeTab]);

  // User handlers
  const handleUserInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setUserForm((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleAddUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const newUser: CreateUserPayload = {
        user_name: userForm.username.trim(),
        password: userForm.password,
        email_id: userForm.email.trim(),
        number: parseInt(userForm.phone.trim()) || undefined,
        employee_id: userForm.employee_id.trim(),
        role: userForm.role,
        status: userForm.status,
        user_access: userForm.department,
      };

      try {
        await createUserMutation.mutateAsync(newUser);
        toast.success("User created successfully!");
        setShowUserModal(false);
        setUserForm(initialUserForm);
      } catch (error: any) {
        let errorMessage = "Failed to create user";
        if (error?.message?.includes("unique constraint")) {
          if (error?.details?.includes("number")) {
            errorMessage = "This phone number is already in use.";
          } else if (error?.details?.includes("email")) {
            errorMessage = "This email address is already in use.";
          } else if (error?.details?.includes("user_name")) {
            errorMessage = "This username is already taken.";
          } else {
            errorMessage = "A duplicate entry exists for one of the fields.";
          }
        }
        toast.error(errorMessage);
        console.error("Error adding user:", error);
      }
    },
    [userForm, createUserMutation],
  );

  const handleEditUser = useCallback((user: IUser) => {
    setUserForm({
      username: user.user_name || "",
      email: user.email_id || "",
      password: user.password || "",
      phone: String(user.number || ""),
      employee_id: user.employee_id || "",
      department: user.user_access || "",
      role: user.role || "user",
      status: user.status || "active",
    });
    setCurrentUserId(user.id);
    setIsEditing(true);
    setShowUserModal(true);
  }, []);

  const handleUpdateUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUserId) return;

      const updatedUser: UpdateUserPayload = {
        user_name: userForm.username.trim(),
        password: userForm.password,
        email_id: userForm.email.trim(),
        number: parseInt(userForm.phone.trim()) || undefined,
        employee_id: userForm.employee_id.trim(),
        role: userForm.role,
        status: userForm.status,
        user_access: userForm.department,
      };

      try {
        await updateUserMutation.mutateAsync({
          id: currentUserId,
          updatedUser,
        });
        toast.success("User updated successfully!");
        setShowUserModal(false);
        setUserForm(initialUserForm);
        setIsEditing(false);
        setCurrentUserId(null);
      } catch (error: any) {
        let errorMessage = "Failed to update user";
        if (error?.message?.includes("unique constraint")) {
          if (error?.details?.includes("number")) {
            errorMessage = "This phone number is already in use.";
          } else if (error?.details?.includes("email")) {
            errorMessage = "This email address is already in use.";
          } else if (error?.details?.includes("user_name")) {
            errorMessage = "This username is already taken.";
          } else {
            errorMessage = "A duplicate entry exists for one of the fields.";
          }
        }
        toast.error(errorMessage);
        console.error("Error updating user:", error);
      }
    },
    [userForm, currentUserId, updateUserMutation],
  );

  const handleDeleteUser = useCallback(
    async (userId: number) => {
      if (!confirm("Are you sure you want to delete this user?")) return;

      try {
        await deleteUserMutation.mutateAsync(userId);
        toast.success("User deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete user");
        console.error("Error deleting user:", error);
      }
    },
    [deleteUserMutation],
  );

  // Department handlers
  const handleDeptInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setDeptForm((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleAddDepartment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const newDept: CreateDepartmentPayload = {
        name: deptForm.name,
        givenBy: deptForm.givenBy,
      };

      try {
        await createDeptMutation.mutateAsync(newDept);
        toast.success("Department created successfully!");
        setShowDeptModal(false);
        setDeptForm(initialDeptForm);
      } catch (error) {
        toast.error("Failed to create department");
        console.error("Error adding department:", error);
      }
    },
    [deptForm, createDeptMutation],
  );

  const handleEditDepartment = useCallback((dept: Department) => {
    setDeptForm({
      name: dept.department,
      givenBy: dept.given_by,
    });
    setCurrentDeptId(dept.id);
    setIsEditing(true);
    setShowDeptModal(true);
  }, []);

  const handleUpdateDepartment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentDeptId) return;

      const updatedDept: UpdateDepartmentPayload = {
        department: deptForm.name,
        given_by: deptForm.givenBy,
      };

      try {
        await updateDeptMutation.mutateAsync({
          id: currentDeptId,
          updatedDept,
        });
        toast.success("Department updated successfully!");
        setShowDeptModal(false);
        setDeptForm(initialDeptForm);
        setIsEditing(false);
        setCurrentDeptId(null);
      } catch (error) {
        toast.error("Failed to update department");
        console.error("Error updating department:", error);
      }
    },
    [deptForm, currentDeptId, updateDeptMutation],
  );

  // Leave management handlers
  const handleUserSelection = useCallback(
    (userId: number, isSelected: boolean) => {
      setSelectedUsers((prev) =>
        isSelected ? [...prev, userId] : prev.filter((id) => id !== userId),
      );
    },
    [],
  );

  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedUsers(filteredLeaveUsers.map((user) => user.id));
      } else {
        setSelectedUsers([]);
      }
    },
    [filteredLeaveUsers],
  );

  const handleSubmitLeave = useCallback(async () => {
    if (selectedUsers.length === 0 || !leaveStartDate || !leaveEndDate) {
      toast.error("Please select at least one user and provide both dates");
      return;
    }

    const startDate = new Date(leaveStartDate);
    const endDate = new Date(leaveEndDate);

    if (startDate > endDate) {
      toast.error("End date cannot be before start date");
      return;
    }

    try {
      // Update users with leave information
      const updatePromises = selectedUsers.map((userId) =>
        updateUserMutation.mutateAsync({
          id: userId,
          updatedUser: {
            user_name: userData.find((u) => u.id === userId)?.user_name || "",
            password: userData.find((u) => u.id === userId)?.password || "",
            email_id: userData.find((u) => u.id === userId)?.email_id || "",
            number: userData.find((u) => u.id === userId)?.number || 0,
            role: userData.find((u) => u.id === userId)?.role || "user",
            status: userData.find((u) => u.id === userId)?.status || "active",
            user_access:
              userData.find((u) => u.id === userId)?.user_access || "",
            leave_date: leaveStartDate,
            leave_end_date: leaveEndDate,
            remark: remark,
          },
        }),
      );

      await Promise.all(updatePromises);

      // Delete matching checklist tasks
      const deletePromises = selectedUsers.map(async (userId) => {
        const user = userData.find((u) => u.id === userId);
        if (user?.user_name) {
          const formattedStartDate = `${leaveStartDate}T00:00:00`;
          const formattedEndDate = `${leaveEndDate}T23:59:59`;

          await supabase
            .from("checklist")
            .delete()
            .eq("name", user.user_name)
            .gte("task_start_date", formattedStartDate)
            .lte("task_start_date", formattedEndDate);
        }
      });

      await Promise.all(deletePromises);

      toast.success("Leave information submitted successfully!");
      setSelectedUsers([]);
      setLeaveStartDate("");
      setLeaveEndDate("");
      setRemark("");
    } catch (error) {
      toast.error("Failed to submit leave information");
      console.error("Error submitting leave:", error);
    }
  }, [
    selectedUsers,
    leaveStartDate,
    leaveEndDate,
    remark,
    userData,
    updateUserMutation,
  ]);

  // Helper functions
  const getStatusColor = (status: string | null) => {
    return status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const clearUsernameFilter = () => {
    setUsernameFilter("");
    setUsernameDropdownOpen(false);
    setUserPage(1);
  };

  const handleUsernameFilterSelect = (username: string) => {
    setUsernameFilter(username);
    setUsernameDropdownOpen(false);
    setUserPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header and Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            User Management System
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage users, departments, and leave
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs */}
          <div className="flex border border-gray-200 dark:border-neutral-600 rounded-lg overflow-hidden">
            <button
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "users"
                ? "bg-green-600 text-white"
                : "bg-white dark:bg-neutral-800 text-foreground hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              onClick={() => handleTabChange("users")}
            >
              <User size={16} />
              Users
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "departments"
                ? "bg-green-600 text-white"
                : "bg-white dark:bg-neutral-800 text-foreground hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              onClick={() => handleTabChange("departments")}
            >
              <Building size={16} />
              Departments
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "leave"
                ? "bg-green-600 text-white"
                : "bg-white dark:bg-neutral-800 text-foreground hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              onClick={() => handleTabChange("leave")}
            >
              <Calendar size={16} />
              Leave
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "import"
                ? "bg-green-600 text-white"
                : "bg-white dark:bg-neutral-800 text-foreground hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              onClick={() => handleTabChange("import")}
            >
              <Upload size={16} />
              Import
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "holiday"
                ? "bg-green-600 text-white"
                : "bg-white dark:bg-neutral-800 text-foreground hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              onClick={() => handleTabChange("holiday")}
            >
              <Calendar size={16} />
              Holiday List
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "calendar"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-neutral-800 text-foreground hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              onClick={() => handleTabChange("calendar")}
            >
              <Calendar size={16} />
              Work Calendar
            </button>
            <button
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "migrate"
                ? "bg-orange-600 text-white"
                : "bg-white dark:bg-neutral-800 text-foreground hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              onClick={() => handleTabChange("migrate")}
            >
              <ArrowRightLeft size={16} />
              Migrate Tasks
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetchUsers()}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          {/* Add Button - hide for leave, import, holiday, migrate, calendar tabs */}
          {activeTab !== "leave" && activeTab !== "import" && activeTab !== "holiday" && activeTab !== "migrate" && activeTab !== "calendar" && canWrite && (
            <button
              onClick={handleAddButtonClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors dark:bg-black dark:border-gray-300 border"
            >
              <Plus size={16} />
              {activeTab === "users" ? "Add User" : "Add Department"}
            </button>
          )}
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-700">
          {/* Header with filter */}
          <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-lg font-medium text-foreground">User List</h2>

            {/* Filter */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Filter by username..."
                    value={usernameFilter}
                    onChange={(e) => setUsernameFilter(e.target.value)}
                    className="w-48 pl-10 pr-8 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-white dark:bg-neutral-700 dark:text-white"
                  />
                  {usernameFilter && (
                    <button
                      onClick={clearUsernameFilter}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground-secondary"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setUsernameDropdownOpen(!usernameDropdownOpen)}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-foreground hover:bg-gray-50 dark:hover:bg-neutral-600"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${usernameDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {/* Dropdown menu */}
              {usernameDropdownOpen && (
                <div className="absolute z-50 mt-1 w-56 rounded-lg bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-neutral-700 max-h-60 overflow-auto top-full right-0">
                  <div className="py-1">
                    <button
                      onClick={clearUsernameFilter}
                      className={`block w-full text-left px-4 py-2 text-sm ${!usernameFilter
                        ? "bg-muted dark:bg-muted text-foreground dark:text-foreground-muted"
                        : "text-foreground dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                        }`}
                    >
                      All Usernames
                    </button>
                    {userData?.map((user) => (
                      <button
                        key={user.id}
                        onClick={() =>
                          handleUsernameFilterSelect(user.user_name || "")
                        }
                        className={`block w-full text-left px-4 py-2 text-sm ${usernameFilter === user.user_name
                          ? "bg-muted dark:bg-muted text-foreground dark:text-foreground-muted"
                          : "text-foreground dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                          }`}
                      >
                        {user.user_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            {usersLoading ? (
              <div className="p-4">
                <SettingsTableSkeleton rows={8} columns={7} />
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                  <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                    {paginatedUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {user.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                          {user.email_id || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                          {user.number || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                          {user.employee_id || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                          {user.user_access || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}
                            >
                              {user.status}
                            </span>
                            {user.status === "active" && (
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Edit size={18} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handlePermissionsClick(user)}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                title="Manage Permissions"
                              >
                                <Shield size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Users Pagination */}
                {userTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-muted-foreground">
                      Showing {(userPage - 1) * SETTINGS_ITEMS_PER_PAGE + 1}-
                      {Math.min(
                        userPage * SETTINGS_ITEMS_PER_PAGE,
                        filteredUsers.length,
                      )}{" "}
                      of {filteredUsers.length} • Page {userPage} of{" "}
                      {userTotalPages}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                        disabled={userPage === 1}
                        className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setUserPage((p) => Math.min(userTotalPages, p + 1))
                        }
                        disabled={userPage === userTotalPages}
                        className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {!usersLoading && filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground dark:text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-700">
          <div className="bg-muted  border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium text-primary dark:text-foreground">
              Department Management
            </h2>

            {/* Sub-tabs */}
            <div className="flex border border-border dark:border-muted-foreground rounded-lg overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeDeptSubTab === "departments"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-neutral-700 text-primary dark:text-foreground hover:bg-secondary dark:hover:bg-neutral-600"
                  }`}
                onClick={() => setActiveDeptSubTab("departments")}
              >
                Departments
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeDeptSubTab === "givenBy"
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-neutral-700 text-primary dark:text-foreground hover:bg-secondary dark:hover:bg-neutral-600"
                  }`}
                onClick={() => setActiveDeptSubTab("givenBy")}
              >
                Given By
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            {deptsLoading ? (
              <div className="p-4">
                <SettingsTableSkeleton rows={8} columns={3} />
              </div>
            ) : activeDeptSubTab === "departments" ? (
              <>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                  <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Given By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                    {paginatedDepts.map((dept) => (
                      <tr
                        key={dept.id}
                        className="hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {dept.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                          {dept.given_by}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canEdit && (
                            <button
                              onClick={() => handleEditDepartment(dept)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Departments Pagination */}
                {deptTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-muted-foreground">
                      Showing {(deptPage - 1) * SETTINGS_ITEMS_PER_PAGE + 1}-
                      {Math.min(
                        deptPage * SETTINGS_ITEMS_PER_PAGE,
                        departmentData.length,
                      )}{" "}
                      of {departmentData.length} • Page {deptPage} of{" "}
                      {deptTotalPages}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setDeptPage((p) => Math.max(1, p - 1))}
                        disabled={deptPage === 1}
                        className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeptPage((p) => Math.min(deptTotalPages, p + 1))
                        }
                        disabled={deptPage === deptTotalPages}
                        className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                      Given By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                  {givenByData.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.given_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!deptsLoading &&
              (activeDeptSubTab === "departments"
                ? departmentData.length === 0
                : givenByData.length === 0) && (
                <div className="p-8 text-center text-muted-foreground dark:text-muted-foreground">
                  No data found
                </div>
              )}
          </div>
        </div>
      )}

      {/* Leave Tab */}
      {activeTab === "leave" && (
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-700">
          <div className="bg-muted  border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-lg font-medium text-primary dark:text-foreground">
              Leave Management
            </h2>

            <div className="flex items-center gap-3">
              {/* Username Search Filter */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Filter by username..."
                  value={leaveUsernameFilter}
                  onChange={(e) => setLeaveUsernameFilter(e.target.value)}
                  className="w-48 pl-10 pr-8 py-2 border border-border dark:border-muted-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm bg-white dark:bg-neutral-700 dark:text-white"
                />
                {leaveUsernameFilter && (
                  <button
                    onClick={() => setLeaveUsernameFilter("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground-secondary"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                onClick={handleSubmitLeave}
                disabled={
                  selectedUsers.length === 0 || !leaveStartDate || !leaveEndDate
                }
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Leave
              </button>
            </div>
          </div>

          {/* Leave Form */}
          <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-2">
                  Leave Start Date
                </label>
                <input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-2">
                  Leave End Date
                </label>
                <input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-2">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Enter remarks"
                  className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Users List for Leave Selection */}
          <div className="overflow-x-auto max-h-[calc(100vh-450px)]">
            {usersLoading ? (
              <div className="p-4">
                <SettingsTableSkeleton rows={8} columns={5} />
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          selectedUsers.length === filteredLeaveUsers.length &&
                          filteredLeaveUsers.length > 0
                        }
                        className="rounded border-gray-300 dark:border-neutral-600 text-primary focus:ring-ring"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                      Current Leave Start
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                      Current Leave End
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                  {filteredLeaveUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) =>
                            handleUserSelection(user.id, e.target.checked)
                          }
                          className="rounded border-gray-300 dark:border-neutral-600 text-primary focus:ring-ring"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                        {user.leave_date
                          ? new Date(user.leave_date).toLocaleDateString()
                          : "No leave set"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                        {user.leave_end_date
                          ? new Date(user.leave_end_date).toLocaleDateString()
                          : "No end date"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-gray-300">
                        {user.remark || "No remarks"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!usersLoading && filteredLeaveUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground dark:text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowUserModal(false)}
          />
          {/* Modal Card */}
          <div className="relative z-10 bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? "Edit User Account" : "Create New User"}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-muted-foreground hover:text-foreground-secondary dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={isEditing ? handleUpdateUser : handleAddUser}>
              <div className="space-y-4">
                {/* Row 1: Username, Password, Email */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Username *</label>
                    <input
                      type="text"
                      name="username"
                      value={userForm.username}
                      onChange={handleUserInputChange}
                      required
                      placeholder="john_doe"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Password *</label>
                    <input
                      type="password"
                      name="password"
                      value={userForm.password}
                      onChange={handleUserInputChange}
                      required
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={userForm.email}
                      onChange={handleUserInputChange}
                      placeholder="john@example.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Row 2: Phone, Employee ID, Department */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={userForm.phone}
                      onChange={handleUserInputChange}
                      placeholder="+91 0000000000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Employee ID</label>
                    <input
                      type="text"
                      name="employee_id"
                      value={userForm.employee_id}
                      onChange={handleUserInputChange}
                      placeholder="EMP001"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Assign Department</label>
                    <select
                      name="department"
                      value={userForm.department}
                      onChange={handleUserInputChange}
                      className={selectClass}
                    >
                      <option value="">Select Department</option>
                      {departmentsOnly.map((dept, idx) => (
                        <option key={idx} value={dept.department}>
                          {dept.department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: Role, Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
                  <div>
                    <label className={labelClass}>User Role</label>
                    <select
                      name="role"
                      value={userForm.role}
                      onChange={handleUserInputChange}
                      className={selectClass}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Account Status</label>
                    <select
                      name="status"
                      value={userForm.status}
                      onChange={handleUserInputChange}
                      className={selectClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createUserMutation.isPending ||
                    updateUserMutation.isPending
                  }
                  className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {(createUserMutation.isPending ||
                    updateUserMutation.isPending) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  {isEditing ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeptModal(false)}
          />
          {/* Modal Card */}
          <div className="relative z-10 bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? "Edit Department" : "Add Department"}
              </h3>
              <button
                onClick={() => setShowDeptModal(false)}
                className="text-muted-foreground hover:text-foreground-secondary dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                isEditing ? handleUpdateDepartment : handleAddDepartment
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={deptForm.name}
                    onChange={handleDeptInputChange}
                    required
                    className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    Given By *
                  </label>
                  <input
                    type="text"
                    name="givenBy"
                    value={deptForm.givenBy}
                    onChange={handleDeptInputChange}
                    required
                    className="w-full border border-gray-300 dark:border-neutral-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 text-foreground dark:text-gray-300 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createDeptMutation.isPending ||
                    updateDeptMutation.isPending
                  }
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary disabled:opacity-50 flex items-center gap-2"
                >
                  {(createDeptMutation.isPending ||
                    updateDeptMutation.isPending) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  {isEditing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === "import" && <CsvImportHub />}

      {/* Holiday Tab */}
      {activeTab === "holiday" && <HolidayAndWorkingDays />}

      {/* Work Calendar Tab */}
      {activeTab === "calendar" && <WorkingDayCalendarSetup />}

      {/* Migrate Tasks Tab */}
      {activeTab === "migrate" && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <Info size={18} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
            <div className="text-sm text-orange-800 dark:text-orange-300">
              <p className="font-semibold mb-1">Task Migration Tool</p>
              <p>
                Reassign <strong>Checklist</strong> or <strong>Machine Maintenance</strong> tasks from one staff member to another. Only tasks with a start date <strong>after</strong> the cutoff date will be migrated — past tasks remain unchanged so you can track who originally did them.
              </p>
            </div>
          </div>

          {/* Migration Configuration Card */}
          <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
            <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-orange-500" />
                Migration Configuration
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Select task type, source staff, target staff, and cutoff date.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Task Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Task System
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setMigrateTaskType("checklist"); handleMigrateReset(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      migrateTaskType === "checklist"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-neutral-900 text-foreground border-gray-200 dark:border-neutral-700 hover:border-blue-400"
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    Checklist
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMigrateTaskType("maintenance"); handleMigrateReset(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      migrateTaskType === "maintenance"
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white dark:bg-neutral-900 text-foreground border-gray-200 dark:border-neutral-700 hover:border-orange-400"
                    }`}
                  >
                    <ArrowRightLeft size={15} />
                    Machine Maintenance
                  </button>
                </div>
              </div>

              {/* From / To row */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                {/* From Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    From (Current Assignee)
                  </label>
                  <input
                    type="text"
                    value={migrateFrom}
                    onChange={(e) => { setMigrateFrom(e.target.value); handleMigrateReset(); setShowFromDropdown(true); }}
                    onFocus={() => setShowFromDropdown(true)}
                    onBlur={() => setTimeout(() => setShowFromDropdown(false), 150)}
                    placeholder="Search user…"
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  />
                  {showFromDropdown && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {(userData || [])
                        .filter((u) => u.user_name && (!migrateFrom || u.user_name.toLowerCase().includes(migrateFrom.toLowerCase())))
                        .slice(0, 20)
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onMouseDown={() => { setMigrateFrom(u.user_name || ""); setShowFromDropdown(false); handleMigrateReset(); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 text-foreground flex items-center justify-between gap-2"
                          >
                            <span>{u.user_name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${u.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-neutral-800"}`}>
                              {u.status}
                            </span>
                          </button>
                        ))}
                      {(userData || []).filter((u) => u.user_name && (!migrateFrom || u.user_name.toLowerCase().includes(migrateFrom.toLowerCase()))).length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No users found</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center pb-1">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">reassign to</span>
                    <ArrowRightLeft size={20} className="text-orange-500" />
                  </div>
                </div>

                {/* To Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    To (New Assignee)
                  </label>
                  <input
                    type="text"
                    value={migrateTo}
                    onChange={(e) => { setMigrateTo(e.target.value); handleMigrateReset(); setShowToDropdown(true); }}
                    onFocus={() => setShowToDropdown(true)}
                    onBlur={() => setTimeout(() => setShowToDropdown(false), 150)}
                    placeholder="Search active user…"
                    className="w-full px-3 py-2.5 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  />
                  {showToDropdown && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {(userData || [])
                        .filter((u) => u.user_name && u.status === "active" && (!migrateTo || u.user_name.toLowerCase().includes(migrateTo.toLowerCase())))
                        .slice(0, 20)
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onMouseDown={() => { setMigrateTo(u.user_name || ""); setShowToDropdown(false); handleMigrateReset(); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-950/30 text-foreground"
                          >
                            {u.user_name}
                          </button>
                        ))}
                      {(userData || []).filter((u) => u.user_name && u.status === "active" && (!migrateTo || u.user_name.toLowerCase().includes(migrateTo.toLowerCase()))).length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No active users found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Cutoff Date */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Task Start Date Cutoff — tasks <em>after</em> this date will be migrated
                </label>
                <input
                  type="date"
                  value={migrateCutoffDate}
                  onChange={(e) => { setMigrateCutoffDate(e.target.value); handleMigrateReset(); }}
                  className="px-3 py-2.5 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Tasks on or before this date stay with <strong>{migrateFrom || "original user"}</strong> — only future tasks move to the new assignee.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleMigratePreview}
                  disabled={migrateStatus === "previewing" || migrateStatus === "migrating" || !migrateFrom.trim() || !migrateTo.trim() || !migrateCutoffDate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {migrateStatus === "previewing" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Preview Migration
                </button>

                {migrateStatus === "previewed" && (
                  <button
                    onClick={handleMigrateExecute}
                    disabled={migratePreviewCount === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <ArrowRightLeft size={16} />
                    Run Migration
                  </button>
                )}

                {(migrateStatus === "done" || migrateStatus === "error") && (
                  <button
                    onClick={handleMigrateReset}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-foreground text-sm font-medium rounded-lg transition-colors"
                  >
                    <RefreshCw size={16} />
                    New Migration
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Panel */}
          {migrateStatus === "error" && migrateError && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{migrateError}</p>
              </div>
            </div>
          )}

          {/* Preview Panel */}
          {(migrateStatus === "previewed" || migrateStatus === "migrating") && migratePreviewCount !== null && (
            <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-blue-100 dark:border-blue-900 overflow-hidden">
              <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 px-6 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <Info size={16} />
                  Preview — {migratePreviewCount} task{migratePreviewCount !== 1 ? "s" : ""} will be migrated
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {migrateTaskType === "checklist" ? "Checklist" : "Machine Maintenance"}
                </span>
              </div>
              <div className="p-6 space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{migratePreviewCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tasks to migrate</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{migrateFrom}</p>
                    <p className="text-xs text-muted-foreground mt-1">From</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{migrateTo}</p>
                    <p className="text-xs text-muted-foreground mt-1">To</p>
                  </div>
                </div>

                {/* Sample tasks table */}
                {migratePreviewTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Sample tasks (first {migratePreviewTasks.length})
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-neutral-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-neutral-900">
                          <tr>
                            <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Task ID</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-semibold">
                              {migrateTaskType === "checklist" ? "Department" : "Machine"}
                            </th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Description</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Start Date</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Frequency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
                          {migratePreviewTasks.map((t: any) => (
                            <tr key={t.task_id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                              <td className="px-3 py-2 text-muted-foreground font-mono">{t.task_id}</td>
                              <td className="px-3 py-2 text-foreground">{migrateTaskType === "checklist" ? t.department : t.machine_name}</td>
                              <td className="px-3 py-2 text-foreground max-w-50 truncate" title={t.task_description}>{t.task_description}</td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{t.task_start_date ? new Date(t.task_start_date).toLocaleDateString() : "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{t.frequency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {migratePreviewCount > migratePreviewTasks.length && (
                      <p className="mt-2 text-xs text-muted-foreground text-right">
                        …and {migratePreviewCount - migratePreviewTasks.length} more
                      </p>
                    )}
                  </div>
                )}

                {migratePreviewCount === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No matching tasks found for the given criteria. Nothing to migrate.
                  </p>
                )}
                {migratePreviewCount > 0 && migrateStatus === "previewed" && (
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    ⚠ Click <strong>Run Migration</strong> above to reassign these tasks. This action cannot be undone.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Migrating spinner */}
          {migrateStatus === "migrating" && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 size={22} className="animate-spin text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">Running migration, please wait…</span>
            </div>
          )}

          {/* Done Panel */}
          {migrateStatus === "done" && (
            <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-green-100 dark:border-green-900 overflow-hidden">
              <div className="bg-green-50 dark:bg-green-950/30 border-b border-green-100 dark:border-green-900 px-6 py-3">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Migration Completed Successfully
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{migrateAffectedCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Tasks migrated</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{migrateFrom}</p>
                    <p className="text-xs text-muted-foreground mt-1">Previous assignee</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 text-center">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300 truncate">{migrateTo}</p>
                    <p className="text-xs text-muted-foreground mt-1">New assignee</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-green-700 dark:text-green-400">
                  ✓ All future {migrateTaskType === "checklist" ? "checklist" : "maintenance"} tasks after <strong>{migrateCutoffDate}</strong> have been reassigned from <strong>{migrateFrom}</strong> to <strong>{migrateTo}</strong>. Past tasks remain unchanged for audit purposes.
                </p>
              </div>
            </div>
          )}

          {/* Migration History */}
          <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
            <div className="bg-neutral-100 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <RefreshCw size={15} className="text-muted-foreground" />
                Migration History
              </h3>
              <button
                type="button"
                onClick={loadMigrationHistory}
                disabled={isLoadingHistory}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {isLoadingHistory ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading history…</span>
                </div>
              ) : migrationHistory.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No migrations recorded yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tasks</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Migrated By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
                    {migrationHistory.map((h: any) => (
                      <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                          {h.migrated_at ? new Date(h.migrated_at).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${h.task_type === "checklist" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                            {h.task_type === "checklist" ? "Checklist" : "Maintenance"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">{h.from_user_name || "—"}</td>
                        <td className="px-4 py-3 text-foreground font-medium">{h.to_user_name || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded">
                            {h.tasks_migrated ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{h.migrated_by || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {permissionUser && (
        <PermissionsModal
          user={permissionUser}
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setPermissionUser(null);
          }}
        />
      )}
    </div>
  );
}
