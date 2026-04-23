"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  User as UserIcon,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Globe,
  Lock,
  Calendar,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useUsers,
  useUpdateUser,
  useDeleteUser,
} from "@/features/checklistAndDelegation/settings/server/tanstackQuery/useSettings";
import type {
  User,
  UpdateUserPayload,
} from "@/features/checklistAndDelegation/settings/types/types";
import { SettingsTableSkeleton } from "@/features/checklistAndDelegation/settings/components/SettingsSkeleton";

const ITEMS_PER_PAGE = 15;

const labelClass = "block text-xs font-medium text-muted-foreground mb-1";
const inputClass = "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
const selectClass = "w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-foreground border border-gray-200 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";

export default function MainDoerManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // RBAC
  const { canEdit, canDelete } = useRBAC("employee_management");

  // Data fetching
  const { data: userData = [], isLoading, refetch } = useUsers();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Filtered and paginated data
  const filteredUsers = useMemo(() => {
    return (userData || []).filter((user) => {
      const name = user.user_name?.toLowerCase() || "";
      const email = user.email_id?.toLowerCase() || "";
      const search = searchTerm.toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [userData, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUserMutation.mutateAsync(id);
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const updatedUser: UpdateUserPayload = {
      user_name: formData.get("user_name") as string,
      password: formData.get("password") as string,
      email_id: formData.get("email_id") as string,
      number: parseInt(formData.get("number") as string) || undefined,
      role: formData.get("role") as string,
      status: formData.get("status") as string,
      department: formData.get("department") as string,
      user_access: formData.get("user_access") as string,
      page_access: formData.get("page_access") as string,
      system_access: formData.get("system_access") as string,
      remark: formData.get("remark") as string,
      leave_date: (formData.get("leave_date") as string) || null,
      leave_end_date: (formData.get("leave_end_date") as string) || null,
    };

    try {
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        updatedUser,
      });
      toast.success("User updated successfully");
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const getStatusBadge = (status: string | null) => {
    const isActive = status === "active";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}>
        {isActive ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
        {status || "N/A"}
      </span>
    );
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold">Doer Management</h2>
          <p className="text-sm text-muted-foreground">Manage accounts, passwords and leave status</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border-none rounded-lg focus:ring-2 focus:ring-primary w-full md:w-64"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden text-sm">
        {isLoading ? (
          <div className="p-6">
            <SettingsTableSkeleton rows={8} columns={7} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">User Info</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Password</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Contact</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Dept & Role</th>

                  <th className="px-6 py-4 font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">

                          <div>
                            <p className="font-medium">{user.user_name || "N/A"}</p>

                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">{user.password || "••••••"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p>{user.email_id || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{user.number || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p>{user.department || "N/A"}</p>
                        <p className={`text-xs ${user.role === 'admin' ? 'text-blue-500 font-semibold' : 'text-muted-foreground'}`}>{user.role || "user"}</p>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleEditClick(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>No users found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</span> of <span className="font-medium text-foreground">{filteredUsers.length}</span> users
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1 text-sm bg-slate-100 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-slate-200"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1 text-sm bg-slate-100 dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-800 flex items-center justify-between border-b border-slate-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Edit User: {editingUser.user_name}</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <UserIcon size={14} /> Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Username</label>
                      <input name="user_name" defaultValue={editingUser.user_name || ""} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Employee ID</label>
                      <input name="employee_id" defaultValue={editingUser.employee_id || ""} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input name="password" defaultValue={editingUser.password || ""} className={`${inputClass} pl-9`} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input name="email_id" type="email" defaultValue={editingUser.email_id || ""} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input name="number" type="number" defaultValue={editingUser.number || ""} className={inputClass} />
                  </div>
                </div>

                {/* Organization & Leave */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Calendar size={14} /> Organization & Leave
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Department</label>
                      <input name="department" defaultValue={editingUser.department || ""} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Role</label>
                      <select name="role" defaultValue={editingUser.role || "user"} className={selectClass}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Leave Start Date</label>
                      <input name="leave_date" type="date" defaultValue={editingUser.leave_date || ""} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Leave End Date</label>
                      <input name="leave_end_date" type="date" defaultValue={editingUser.leave_end_date || ""} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <select name="status" defaultValue={editingUser.status || "active"} className={selectClass}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* System Permissions */}
                <div className="md:col-span-2 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Lock size={14} /> Access Permissions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Page Access</label>
                      <textarea name="page_access" defaultValue={editingUser.page_access || ""} className={`${inputClass} h-20 resize-none`} placeholder="e.g. dashboard, checklist, settings" />
                    </div>
                    <div>
                      <label className={labelClass}>System Access</label>
                      <textarea name="system_access" defaultValue={editingUser.system_access || ""} className={`${inputClass} h-20 resize-none`} placeholder="e.g. mobile, desktop, terminal" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Remark / Notes</label>
                  <input name="remark" defaultValue={editingUser.remark || ""} className={inputClass} />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 dark:border-zinc-800 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-8 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-70 flex items-center gap-2"
                >
                  {updateUserMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
