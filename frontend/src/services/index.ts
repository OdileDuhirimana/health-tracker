/**
 * Service Layer - Centralized exports
 * All API services are exported from here for easy imports
 */

export { authService } from "./auth.service";
export { patientsService } from "./patients.service";
export { programsService } from "./programs.service";
export { medicationsService } from "./medications.service";
export { attendanceService } from "./attendance.service";
export { dashboardService } from "./dashboard.service";
export { dispensationsService } from "./dispensations.service";
export { usersService } from "./users.service";
export { reportsService } from "./reports.service";
export { notificationsService } from "./notifications.service";
export { apiRequest, buildQueryString } from "./api-client";

