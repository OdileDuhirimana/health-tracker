/**
 * Reports Service
 * Handles all reporting-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";

export const reportsService = {
  /**
   * Get patient report
   */
  getPatientReport: (filters?: { programId?: string; startDate?: string; endDate?: string }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<any[]>(`/reports/patient?${queryString}`);
  },
  
  /**
   * Get program report
   */
  getProgramReport: (filters?: { startDate?: string; endDate?: string }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<any[]>(`/reports/program?${queryString}`);
  },
  
  /**
   * Get medication report
   */
  getMedicationReport: () => apiRequest<any[]>("/reports/medication"),
  
  /**
   * Get attendance report
   */
  getAttendanceReport: (filters?: { programId?: string; startDate?: string; endDate?: string }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<any[]>(`/reports/attendance?${queryString}`);
  },
  
  /**
   * Get user report
   */
  getUserReport: () => apiRequest<any[]>("/reports/user"),
};

