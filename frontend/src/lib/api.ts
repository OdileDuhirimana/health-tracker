/**
 * Legacy API Module - Backward Compatibility Layer
 * 
 * This file provides backward compatibility for existing imports.
 * New code should use the services from @/services instead.
 * 
 * @deprecated Use @/services for new code
 */

import {
  authService,
  patientsService,
  programsService,
  medicationsService,
  attendanceService,
  dashboardService,
  dispensationsService,
  usersService,
  reportsService,
  notificationsService,
} from "@/services";

// Re-export services with legacy naming for backward compatibility
export const authApi = authService;
export const patientsApi = patientsService;
export const programsApi = programsService;
export const medicationsApi = medicationsService;
export const attendanceApi = attendanceService;
export const dashboardApi = dashboardService;
export const dispensationsApi = dispensationsService;
export const usersApi = usersService;
export const reportsApi = reportsService;
export const notificationsApi = notificationsService;
