/**
 * Programs Service
 * Handles all program-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { Program, ProgramFilters } from "@/types";
import { PaginatedResponse } from "@/types";

export const programsService = {
  /**
   * Get all programs with optional filters
   */
  getAll: (filters?: ProgramFilters) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<PaginatedResponse<Program>>(`/programs?${queryString}`);
  },
  
  /**
   * Get program by ID
   */
  getById: (id: string) => apiRequest<Program>(`/programs/${id}`),
  
  /**
   * Create new program
   */
  create: (data: {
    name: string;
    type: string;
    description?: string;
    sessionFreq?: string;
    medicationIds?: string[];
  }) =>
    apiRequest<Program>("/programs", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /**
   * Update program
   */
  update: (id: string, data: Partial<Program>) =>
    apiRequest<Program>(`/programs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  /**
   * Delete program
   */
  delete: (id: string) =>
    apiRequest(`/programs/${id}`, {
      method: "DELETE",
    }),
};

