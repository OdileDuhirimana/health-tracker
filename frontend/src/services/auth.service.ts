/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import { apiRequest } from "./api-client";
import { AuthResponse, User } from "@/types";

export const authService = {
  /**
   * Login user with email and password
   */
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  
  /**
   * Register new user
   */
  signup: (email: string, password: string, name: string, role: string) => {
    // Ensure role is valid (Healthcare Staff or Guest only)
    const validRole = (role === "Admin" || !role) ? "Healthcare Staff" : role;
    return apiRequest<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role: validRole }),
    });
  },
  
  /**
   * Get current user profile
   */
  getProfile: () =>
    apiRequest<User>("/auth/profile", {
      method: "GET",
    }),
  
  /**
   * Update user profile
   */
  updateProfile: (data: { name?: string; password?: string; currentPassword?: string }) =>
    apiRequest<User>("/auth/profile", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

