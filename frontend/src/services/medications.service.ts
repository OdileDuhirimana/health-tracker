/**
 * Medications Service
 * Handles all medication-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { Medication } from "@/types";
import { PaginatedResponse } from "@/types";

export const medicationsService = {
  /**
   * Get all medications with optional search and filters
   */
  getAll: (search?: string, filters?: { page?: number; limit?: number }) => {
    const params: Record<string, any> = { ...filters };
    if (search) params.search = search;
    const queryString = buildQueryString(params);
    return apiRequest<PaginatedResponse<Medication>>(`/medications?${queryString}`);
  },
  
  /**
   * Get medication by ID
   */
  getById: (id: string) => apiRequest<Medication>(`/medications/${id}`),
  
  /**
   * Create new medication
   */
  create: (data: { name: string; dosage: string; frequency: string; programType: string; programIds?: string[] }) =>
    apiRequest<Medication>("/medications", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /**
   * Update medication
   */
  update: (id: string, data: Partial<Medication> & { programIds?: string[] }) =>
    apiRequest<Medication>(`/medications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  /**
   * Delete medication
   */
  delete: (id: string) =>
    apiRequest(`/medications/${id}`, {
      method: "DELETE",
    }),
};

