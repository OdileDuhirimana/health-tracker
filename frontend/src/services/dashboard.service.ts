/**
 * Dashboard Service
 * Handles all dashboard-related API calls
 */

import { apiRequest, buildQueryString } from "./api-client";
import { DashboardMetrics, ProgramOverview, AttendanceData, AdherenceData } from "@/types";
import { PaginatedResponse } from "@/types";

export const dashboardService = {
  /**
   * Get dashboard metrics
   */
  getMetrics: () => apiRequest<DashboardMetrics>("/dashboard/metrics"),
  
  /**
   * Get programs overview for charts
   */
  getProgramsOverview: () => apiRequest<ProgramOverview[]>("/dashboard/programs-overview"),
  
  /**
   * Get attendance data
   */
  getAttendanceData: () => apiRequest<AttendanceData>("/dashboard/attendance-data"),
  
  /**
   * Get adherence rate data
   */
  getAdherenceRate: () => apiRequest<{ data: AdherenceData[] }>("/dashboard/adherence-rate"),
  
  /**
   * Get recent activity logs with optional filters and pagination
   */
  getRecentActivity: (filters?: { 
    limit?: number; 
    page?: number;
    type?: string;
    userId?: string;
    date?: string;
    search?: string;
  }) => {
    const queryString = filters ? buildQueryString(filters) : "";
    const endpoint = queryString ? `/activity-logs?${queryString}` : "/activity-logs";
    return apiRequest<PaginatedResponse<any>>(endpoint);
  },

  /**
   * Get program duration summary
   */
  getProgramDurationSummary: () => 
    apiRequest<Array<{
      programName: string;
      startDate: string | null;
      endDate: string | null;
      expectedEnrollments: number;
      activePatients: number;
      adherencePercent: number;
    }>>("/dashboard/program-duration-summary"),

  /**
   * Get upcoming dispensation alerts (due today or overdue)
   */
  getUpcomingDispensations: () => 
    apiRequest<Array<{
      patientId: string;
      patientName: string;
      programId: string;
      programName: string;
      medicationId: string;
      medicationName: string;
      nextDueDate: string;
      status: 'due_today' | 'overdue';
    }>>("/dashboard/upcoming-dispensations"),
};

