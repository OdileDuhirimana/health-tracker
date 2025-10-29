/**
 * Dispensations Service
 * Handles all medication dispensation-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { Dispensation } from "@/types";

export const dispensationsService = {
  /**
   * Get all dispensations with optional filters
   */
  getAll: (filters?: { patientId?: string; programId?: string; date?: string }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<Dispensation[]>(`/dispensations?${queryString}`);
  },
  
  /**
   * Create new dispensation record
   */
  create: (data: {
    patientId: string;
    programId: string;
    medicationId: string;
    dispensedAt: string;
    notes?: string;
  }) =>
    apiRequest<Dispensation>("/dispensations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /**
   * Get count of overdue dispensations
   */
  getOverdueCount: () =>
    apiRequest<{ count: number }>("/dispensations/overdue/count", {
      method: "GET",
    }),
  
  /**
   * Get medication tracking table with adherence rates
   */
  getTrackingTable: (page?: number, limit?: number, search?: string) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const queryString = params.toString();
    return apiRequest<{
      data: Array<{
        patientId: string;
        patientName: string;
        medicationId: string;
        medicationName: string;
        dosage: string;
        frequency: string;
        programId: string;
        programName: string;
        lastCollected: string;
        nextDue: string;
        adherenceRate: number;
      }>;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/dispensations/tracking-table${queryString ? `?${queryString}` : ''}`, {
      method: "GET",
    });
  },

  /**
   * Get overdue medications details
   */
  getOverdueDetails: () =>
    apiRequest<Array<{
      patientId: string;
      patientName: string;
      medicationId: string;
      medicationName: string;
      dosage: string;
      frequency: string;
      programId: string;
      programName: string;
      lastCollected: string;
      nextDue: string;
      adherenceRate: number;
    }>>("/dispensations/overdue/details", {
      method: "GET",
    }),
};

