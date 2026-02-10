"use client";

import { useUserPermissions } from "@/features/checklistAndDelegation/settings/server/tanstackQuery/useSettings";
import { PermissionResource } from "@/features/checklistAndDelegation/settings/types/types";
import { useState, useEffect } from "react";

/**
 * Hook to check if the current user has access to a specific resource and action.
 *
 * Usage:
 * const { canRead, canWrite, canEdit, canDelete, isLoading } = useRBAC('checklist');
 *
 * if (isLoading) return <Loading />;
 * if (!canRead) return <AccessDenied />;
 */
export function useRBAC(resource: PermissionResource) {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // Access localStorage only on the client side
    const id = localStorage.getItem("user_id");
    if (id) {
      setUserId(parseInt(id, 10));
    }
  }, []);

  const { data: permissions = [], isLoading } = useUserPermissions(userId);

  const resourcePermission = permissions.find((p) => p.resource === resource);

  // If no permission record exists, default to specific logic (e.g., deny all or allow read based on role)
  // For now, we'll default to deny if explicit permission not found,
  // EXCEPT for admin who should have all access (we can handle admin logic here or in the UI)

  // Checking for admin role from localStorage just in case
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    setRole(localStorage.getItem("role") || "");
  }, []);

  const isAdmin = role === "admin";

  if (isAdmin) {
    return {
      canRead: true,
      canWrite: true,
      canEdit: true,
      canDelete: true,
      isLoading: false,
    };
  }

  return {
    canRead: resourcePermission?.can_read || false,
    canWrite: resourcePermission?.can_write || false,
    canEdit: resourcePermission?.can_edit || false,
    canDelete: resourcePermission?.can_delete || false,
    isLoading,
  };
}
