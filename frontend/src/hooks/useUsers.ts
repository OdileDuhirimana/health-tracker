/** Custom hook for managing user data and operations. */

import { useState, useEffect, useCallback } from "react";
import { usersService } from "@/services";
import { User } from "@/types";
import { useToast } from "@/components/Toast";

interface UserFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export function useUsers(filters?: UserFilters) {
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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.getAll(filters);
      if (response.data) {
        // Handle paginated response: { data: [...], pagination: {...} }
        if (response.data.data && Array.isArray(response.data.data)) {
          setUsers(response.data.data);
          setPagination(response.data.pagination || null);
        } else if (Array.isArray(response.data)) {
          // Legacy: direct array response
          setUsers(response.data);
          setPagination(null);
        } else {
          setUsers([]);
          setPagination(null);
        }
      } else if (response.error) {
        setError(response.error);
        notify(response.error, "error");
        setUsers([]);
        setPagination(null);
      } else {
        setUsers([]);
        setPagination(null);
      }
    } catch (error) {
      const errorMessage = "Failed to load users";
      setError(errorMessage);
      notify(errorMessage, "error");
      setUsers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.page, filters?.limit]); // Use primitive values

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
  }, [loadUsers]); // Removed notify

  const updateUser = useCallback(async (id: string, data: Partial<User>) => {
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
  }, [loadUsers]); // Removed notify

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
  }, [loadUsers]); // Removed notify

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

