/**
 * Reports Service
 * Handles all reporting-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import {
  AttendanceReportRow,
  MedicationReportRow,
  PatientReportRow,
  ProgramReportRow,
  UserReportRow,
} from "@/types";

export const reportsService = {
  /**
   * Get patient report
   */
  getPatientReport: (filters?: { programId?: string; startDate?: string; endDate?: string }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<PatientReportRow[]>(`/reports/patient?${queryString}`);
  },

  /**
   * Get program report
   */
  getProgramReport: (filters?: { startDate?: string; endDate?: string }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<ProgramReportRow[]>(`/reports/program?${queryString}`);
  },

  /**
   * Get medication report
   */
  getMedicationReport: () => apiRequest<MedicationReportRow[]>("/reports/medication"),

  /**
   * Get attendance report
   */
  getAttendanceReport: (filters?: { programId?: string; startDate?: string; endDate?: string }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    return apiRequest<AttendanceReportRow[]>(`/reports/attendance?${queryString}`);
  },

  /**
   * Get user report
   */
  getUserReport: () => apiRequest<UserReportRow[]>("/reports/user"),
};

