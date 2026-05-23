import { useState, useEffect } from "react";
import { X, Check, Save, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  useUserPermissions,
  useUpdateUserPermissions,
} from "../server/tanstackQuery/useSettings";
import { User, PermissionResource } from "../types/types";

interface PermissionsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

// Group definitions for organized display
const RESOURCE_GROUPS: { label: string; resources: PermissionResource[] }[] = [
  {
    label: "Checklist & Delegation",
    resources: [
      "dashboard",
      "assign_task",
      "checklist",
      "delegation",
      "quick_task",
    ],
  },
  {
    label: "Repairing",
    resources: [
      "repair_dashboard",
      "repair_request",
      "repairing",
      "repair_history",
      "repair_part_vendor",
      "repair_general_item",
    ],
  },
  {
    label: "Maintenance",
    resources: [
      "maintenance_dashboard",
      "maintenance",
      "maintenance_history",
      "maintenance_schedules",
      "maintenance_calendar",
      "maintenance_edit",
    ],
  },
  {
    label: "Other",
    resources: [
      "machines",
      "approval",
      "employee_management",
      "settings",
      "license",
      "training_video",
    ],
  },
];

const RESOURCES: PermissionResource[] = RESOURCE_GROUPS.flatMap(
  (g) => g.resources,
);

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  // Checklist & Delegation
  dashboard: "Dashboard",
  assign_task: "Assign Task",
  checklist: "Checklist",
  delegation: "Delegation",
  quick_task: "Edit Task",
  // Repairing
  repair_dashboard: "Repairing - Dashboard",
  repair_request: "Repairing - Request Form",
  repairing: "Repairing - Pending",
  repair_history: "Repairing - History",
  repair_part_vendor: "Repairing - Part And Vendor",
  repair_general_item: "Repairing - General Item Purchase",
  // Maintenance
  maintenance_dashboard: "Maintenance - Dashboard",
  maintenance: "Maintenance - Pending",
  maintenance_history: "Maintenance - History",
  maintenance_schedules: "Maintenance - Schedules",
  maintenance_calendar: "Maintenance - Calendar",
  maintenance_edit: "Maintenance - Edit Task",
  // Other
  machines: "Machines Master",
  approval: "Admin Approvals",
  employee_management: "Employee Management",
  settings: "Settings (User Mgmt)",
  license: "License",
  training_video: "Training Video",
};

export default function PermissionsModal({
  user,
  isOpen,
  onClose,
}: PermissionsModalProps) {
  const { data: permissions = [], isLoading } = useUserPermissions(user.id);
  const updatePermissionsMutation = useUpdateUserPermissions();

  const [localPermissions, setLocalPermissions] = useState<
    {
      resource: string;
      can_read: boolean;
      can_write: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }[]
  >([]);

  // Initialize local state when data is loaded
  useEffect(() => {
    if (permissions) {
      const initialPermissions = RESOURCES.map((resource) => {
        const existing = permissions.find((p) => p.resource === resource);
        return {
          resource,
          can_read: existing?.can_read || false,
          can_write: existing?.can_write || false,
          can_edit: existing?.can_edit || false,
          can_delete: existing?.can_delete || false,
        };
      });
      setLocalPermissions(initialPermissions);
    }
  }, [permissions]);

  const handleToggle = (
    resource: string,
    field: "can_read" | "can_write" | "can_edit" | "can_delete",
  ) => {
    setLocalPermissions((prev) =>
      prev.map((p) =>
        p.resource === resource ? { ...p, [field]: !p[field] } : p,
      ),
    );
  };

  const handleSave = async () => {
    try {
      await updatePermissionsMutation.mutateAsync({
        userId: user.id,
        permissions: localPermissions,
      });
      toast.success("Permissions updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update permissions");
      console.error(error);
    }
  };

  const handleSelectAll = (resource: string, checked: boolean) => {
    setLocalPermissions((prev) =>
      prev.map((p) =>
        p.resource === resource
          ? {
            ...p,
            can_read: checked,
            can_write: checked,
            can_edit: checked,
            can_delete: checked,
          }
          : p,
      ),
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — clicking outside closes the modal */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal Card */}
      <div className="relative z-10 bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Manage Permissions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set access levels for {user.user_name} ({user.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="space-y-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-neutral-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      All
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Read
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Write
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Edit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                  {RESOURCE_GROUPS.map((group) => (
                    <>
                      {/* Group header row */}
                      <tr key={`group-${group.label}`}>
                        <td
                          colSpan={6}
                          className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider"
                        >
                          {group.label}
                        </td>
                      </tr>
                      {/* Permission rows for this group */}
                      {group.resources.map((resource) => {
                        const perm = localPermissions.find(
                          (p) => p.resource === resource,
                        );
                        if (!perm) return null;
                        return (
                          <tr
                            key={perm.resource}
                            className="hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                          >
                            <td className="px-4 py-3 pl-8 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {
                                RESOURCE_LABELS[
                                perm.resource as PermissionResource
                                ]
                              }
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={
                                  perm.can_read &&
                                  perm.can_write &&
                                  perm.can_edit &&
                                  perm.can_delete
                                }
                                onChange={(e) =>
                                  handleSelectAll(
                                    perm.resource,
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={perm.can_read}
                                onChange={() =>
                                  handleToggle(perm.resource, "can_read")
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={perm.can_write}
                                onChange={() =>
                                  handleToggle(perm.resource, "can_write")
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={perm.can_edit}
                                onChange={() =>
                                  handleToggle(perm.resource, "can_edit")
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-neutral-700 dark:border-neutral-600"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={perm.can_delete}
                                onChange={() =>
                                  handleToggle(perm.resource, "can_delete")
                                }
                                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:bg-neutral-700 dark:border-neutral-600"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-neutral-700 flex justify-end gap-3 bg-gray-50 dark:bg-neutral-900 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-neutral-800 dark:text-gray-300 dark:border-neutral-600 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updatePermissionsMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatePermissionsMutation.isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
}
