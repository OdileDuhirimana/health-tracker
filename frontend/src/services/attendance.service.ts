/**
 * Attendance Service
 * Handles all attendance-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { Attendance, AttendanceStatus } from "@/types";

export const attendanceService = {
  /**
   * Get all attendance records with optional filters and pagination
   */
  getAll: (filters?: { 
    programId?: string; 
    date?: string; 
    status?: AttendanceStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    const endpoint = queryString ? `/attendance?${queryString}` : "/attendance";
    return apiRequest<{
      data: Attendance[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(endpoint);
  },
  
  /**
   * Mark attendance for a single patient
   */
  mark: (data: {
    programId: string;
    attendanceDate: string;
    patientId: string;
    status: AttendanceStatus;
    checkInTime?: string;
    notes?: string;
  }) =>
    apiRequest<Attendance>("/attendance", {
      method: "POST",
      body: JSON.stringify({
        programId: data.programId,
        attendanceDate: data.attendanceDate,
        attendances: [{
          patientId: data.patientId,
          status: data.status,
          checkInTime: data.checkInTime,
          notes: data.notes,
        }],
      }),
    }),
  
  /**
   * Mark attendance for multiple patients
   */
  markBulk: (data: {
    programId: string;
    attendanceDate: string;
    attendance: Array<{
      patientId: string;
      status: AttendanceStatus;
      checkInTime?: string;
    }>;
  }) =>
    apiRequest<Attendance[]>("/attendance", {
      method: "POST",
      body: JSON.stringify({
        programId: data.programId,
        attendanceDate: data.attendanceDate,
        attendances: data.attendance,
      }),
    }),
  
  /**
   * Bulk update attendance records
   */
  bulkUpdate: (data: {
    programId: string;
    attendanceDate: string;
    updates: Array<{
      id: string;
      status: AttendanceStatus;
    }>;
  }) =>
    apiRequest<Attendance[]>("/attendance/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /**
   * Update a single attendance record
   */
  update: (id: string, data: { status?: AttendanceStatus; notes?: string }) =>
    apiRequest<Attendance>(`/attendance/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  /**
   * Delete an attendance record
   */
  delete: (id: string) =>
    apiRequest(`/attendance/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get attendance statistics
   */
  getStatistics: (filters?: {
    programId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    const endpoint = queryString ? `/attendance/statistics?${queryString}` : "/attendance/statistics";
    return apiRequest<{
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      attendanceRate: number;
      programRates?: Array<{ programName: string; rate: number }>;
    }>(endpoint);
  },
};

