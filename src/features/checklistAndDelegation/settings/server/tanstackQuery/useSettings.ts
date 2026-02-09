"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserDetailsApi,
  createUserApi,
  updateUserDataApi,
  deleteUserByIdApi,
  fetchDepartmentDataApi,
  fetchDepartmentsOnlyApi,
  fetchGivenByDataApi,
  createDepartmentApi,
  updateDepartmentDataApi,
} from "../api/settingApi";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../../types/types";

// ============ Query Keys ============

export const settingsKeys = {
  all: ["settings"] as const,
  users: () => [...settingsKeys.all, "users"] as const,
  departments: () => [...settingsKeys.all, "departments"] as const,
  departmentsOnly: () => [...settingsKeys.all, "departmentsOnly"] as const,
  givenBy: () => [...settingsKeys.all, "givenBy"] as const,
};

// ============ User Queries ============

/**
 * Query for all users with details
 * Shows skeleton loading during initial fetch
 */
export function useUsers() {
  return useQuery({
    queryKey: settingsKeys.users(),
    queryFn: fetchUserDetailsApi,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create user mutation
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newUser: CreateUserPayload) => createUserApi(newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.users() });
    },
  });
}

/**
 * Update user mutation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updatedUser,
    }: {
      id: number;
      updatedUser: UpdateUserPayload;
    }) => updateUserDataApi(id, updatedUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.users() });
    },
  });
}

/**
 * Delete user mutation
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteUserByIdApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.users() });
    },
  });
}

// ============ Department Queries ============

/**
 * Query for departments with given_by
 */
export function useDepartments() {
  return useQuery({
    queryKey: settingsKeys.departments(),
    queryFn: fetchDepartmentDataApi,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query for unique department names only
 */
export function useDepartmentsOnly() {
  return useQuery({
    queryKey: settingsKeys.departmentsOnly(),
    queryFn: fetchDepartmentsOnlyApi,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query for unique given_by names
 */
export function useGivenBy() {
  return useQuery({
    queryKey: settingsKeys.givenBy(),
    queryFn: fetchGivenByDataApi,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create department mutation
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newDept: CreateDepartmentPayload) =>
      createDepartmentApi(newDept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.departments() });
      queryClient.invalidateQueries({
        queryKey: settingsKeys.departmentsOnly(),
      });
    },
  });
}

/**
 * Update department mutation
 */
export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updatedDept,
    }: {
      id: number;
      updatedDept: UpdateDepartmentPayload;
    }) => updateDepartmentDataApi(id, updatedDept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.departments() });
      queryClient.invalidateQueries({
        queryKey: settingsKeys.departmentsOnly(),
      });
    },
  });
}
