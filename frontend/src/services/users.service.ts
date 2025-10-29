/**
 * Users Service
 * Handles all user management-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { User, PaginatedResponse } from "@/types";

export const usersService = {
  /**
   * Get all users with optional search and pagination
   */
  getAll: (filters?: { search?: string; page?: number; limit?: number }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    const endpoint = queryString ? `/users?${queryString}` : "/users";
    return apiRequest<PaginatedResponse<User>>(endpoint);
  },
  
  /**
   * Get user by ID
   */
  getById: (id: string) => apiRequest<User>(`/users/${id}`),
  
  /**
   * Create new user
   */
  create: (data: { name: string; email: string; password: string; role: string; programIds?: string[] }) =>
    apiRequest<User>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /**
   * Update user
   */
  update: (id: string, data: Partial<User>) =>
    apiRequest<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  /**
   * Delete user
   */
  delete: (id: string) =>
    apiRequest(`/users/${id}`, {
      method: "DELETE",
    }),
};

