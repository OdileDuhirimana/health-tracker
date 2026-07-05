/** Custom hook for managing user data and operations. */

import { useState, useEffect, useCallback, useMemo } from "react";
import { usersService } from "@/services";
import { User } from "@/types";
import { useToast } from "@/components/Toast";
import { extractPagination, normalizeListResponse } from "@/utils/api";

interface UserFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserData extends Partial<User> {
  password?: string;
  programIds?: string[];
}

export function useUsers(filtersProp?: UserFilters) {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useToast();

  // Stabilize identity across renders based on the underlying primitives so
  // `filters` can be depended on directly below without re-running on every
  // render when the caller passes a freshly-created object literal.
  const searchParam = filtersProp?.search;
  const pageParam = filtersProp?.page;
  const limitParam = filtersProp?.limit;
  const filters: UserFilters | undefined = useMemo(
    () =>
      searchParam === undefined && pageParam === undefined && limitParam === undefined
        ? undefined
        : { search: searchParam, page: pageParam, limit: limitParam },
    [searchParam, pageParam, limitParam]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.getAll(filters);
      if (response.data) {
        setUsers(normalizeListResponse<User>(response.data));
        setPagination(extractPagination<User>(response.data));
      } else if (response.error) {
        setError(response.error);
        notify(response.error, "error");
        setUsers([]);
        setPagination(null);
      } else {
        setUsers([]);
        setPagination(null);
      }
    } catch {
      const errorMessage = "Failed to load users";
      setError(errorMessage);
      notify(errorMessage, "error");
      setUsers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters, notify]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(async (data: { name: string; email: string; password: string; role: string; programIds?: string[] }) => {
    setLoading(true);
    try {
      const response = await usersService.create(data);
      if (response.data) {
        notify("User created successfully", "success");
        await loadUsers();
        return response.data;
      } else {
        notify(response.error || "Failed to create user", "error");
        throw new Error(response.error || "Failed to create user");
      }
    } finally {
      setLoading(false);
    }
  }, [loadUsers, notify]);

  const updateUser = useCallback(async (id: string, data: UpdateUserData) => {
    setLoading(true);
    try {
      const response = await usersService.update(id, data);
      if (response.data) {
        notify("User updated successfully", "success");
        await loadUsers();
        return response.data;
      } else {
        notify(response.error || "Failed to update user", "error");
        throw new Error(response.error || "Failed to update user");
      }
    } finally {
      setLoading(false);
    }
  }, [loadUsers, notify]);

  const deleteUser = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await usersService.delete(id);
      if (!response.error) {
        notify("User deleted successfully", "success");
        await loadUsers();
      } else {
        notify(response.error || "Failed to delete user", "error");
        throw new Error(response.error || "Failed to delete user");
      }
    } finally {
      setLoading(false);
    }
  }, [loadUsers, notify]);

  return {
    users,
    pagination,
    loading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}

