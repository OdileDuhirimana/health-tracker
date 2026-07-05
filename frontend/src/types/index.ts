/**
 * Shared TypeScript types and interfaces
 * Centralized type definitions for consistency across the application
 */

// User and Authentication Types
export type UserRole = "Admin" | "Healthcare Staff" | "Guest";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedPrograms?: Program[];
  createdAt?: string;
  // Some "assigned staff" join responses (e.g. Program.assignedStaff) key
  // the underlying user by `userId` instead of `id`; kept optional here so
  // consumers can match on either without resorting to `any`.
  userId?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Shape of a JSON error payload returned by the backend for non-2xx
 * responses. `message` may be a single string (most endpoints) or an
 * array of strings (class-validator style aggregated validation errors).
 */
export interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Patient Types
export interface Patient {
  id: string;
  patientId?: string;
  fullName: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  medicalNotes?: string;
  status: "active" | "inactive";
  enrollments?: PatientEnrollment[];
  programs?: string[];
  progress?: PatientProgress;
}

export interface PatientEnrollment {
  id: string;
  patientId: string;
  programId: string;
  enrollmentDate: string;
  assignedStaffId?: string;
  completionDate?: string;
  // Target end date, computed as enrollmentDate + program.durationInDays.
  completedDate?: string;
  endDate?: string;
  adherenceRate?: number;
  attendanceRate?: number;
  isCompleted?: boolean;
  completionNotes?: string;
  status: "active" | "completed" | "cancelled";
  program?: Program;
  assignedStaff?: User;
}

export interface PatientProgress {
  attendanceRate: number;
  adherenceRate: number;
  hasMissedSessions: boolean;
  sessionsCompleted: number;
  sessionsMissed: number;
  medicationsDispensed: number;
}

// Program Types
export interface Program {
  id: string;
  name: string;
  type: string;
  description?: string;
  sessionFrequency?: string;
  status: "Active" | "Inactive";
  totalPatients?: number;
  createdAt?: string;
  duration?: number;
  durationUnit?: "days" | "weeks" | "months";
  durationInDays?: number;
  // Computed by the backend on some endpoints to indicate the requesting
  // (Healthcare Staff) user is assigned to this program.
  isAssigned?: boolean;
  medications?: Medication[];
  assignedStaff?: User[];
  enrollments?: PatientEnrollment[];
  components?: Array<{
    type: 'session' | 'consultation' | 'group_discussion';
    name: string;
    description?: string;
  }>;
}

// Medication Types
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  programType: string;
  status: "Active" | "Inactive";
  programIds?: string[];
  createdAt?: string;
  // Populated by the backend on endpoints that join the
  // medication <-> program many-to-many relation.
  programs?: Program[];
}

export interface Dispensation {
  id: string;
  patientId: string;
  programId: string;
  medicationId: string;
  dispensedAt: string;
  notes?: string;
  // The backend joins these relations on list/detail endpoints; not present
  // on write payloads (create/update requests only send the *Id fields).
  patient?: {
    id: string;
    fullName?: string;
    name?: string;
  };
  program?: {
    id: string;
    name: string;
  };
  medication?: {
    id: string;
    name: string;
    dosage?: string;
    frequency?: string;
  };
  dispensedBy?: {
    id: string;
    name: string;
  };
}

// Attendance Types
export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused" | "Canceled";

export interface Attendance {
  id: string;
  patientId: string;
  programId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  checkInTime?: string;
  notes?: string;
  patient?: {
    id: string;
    fullName: string;
    name?: string;
  };
  program?: {
    id: string;
    name: string;
  };
  markedBy?: {
    id: string;
    name: string;
  };
}

// Dashboard Types
export interface DashboardMetrics {
  totalPrograms: number;
  activePatients: number;
  pendingMedications: number;
  attendancePending: number;
  overdueSessions?: number;
}

export interface ProgramOverview {
  name: string;
  patients: number;
}

export interface AttendanceData {
  present: number;
  pending: number;
  absent: number;
}

export interface AdherenceData {
  name: string;
  rate: number;
}

// Form Types
export interface PatientFormData {
  name: string;
  dob: string;
  gender: string;
  contact: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  programId?: string;
  enrollmentDate?: string;
  assignedStaffId?: string;
  medicalNotes?: string;
}

export interface ProgramFormData {
  name: string;
  type: string;
  description?: string;
  sessionFreq?: string;
  medications?: string[];
}

// Filter Types
export interface PatientFilters {
  search?: string;
  programId?: string;
  status?: string;
  sortBy?: "progress" | "adherence" | "";
  sortOrder?: "ASC" | "DESC";
  progressMin?: number;
  adherenceMin?: number;
  page?: number;
  limit?: number;
}

export interface ProgramFilters {
  search?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Activity Log Types
export type ActivityType =
  | "enrollment"
  | "medication"
  | "attendance"
  | "program"
  | "user"
  | "session";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType | string;
  description: string;
  userId?: string;
  user?: string;
  userEmail?: string;
  timestamp: string | Date;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

// Notification Types
export type NotificationType =
  | "medication"
  | "session"
  | "enrollment"
  | "alert"
  | "attendance";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  userId?: string;
  timestamp: string | Date;
  createdAt?: string;
}

// Enrollment Types
export interface EnrollPatientData {
  enrollmentDate?: string;
  assignedStaffId?: string;
}

// Report Types
/**
 * Row shape used for the CSV "patient progress" export. Two producers feed
 * this: the raw `/reports/patient` backend endpoint (which only returns
 * id/name/email/program/enrollmentDate/status) and a richer, derived object
 * built client-side from `Patient.progress` on the Patients page. The
 * progress-related fields are therefore optional since not every producer
 * populates them.
 */
export interface PatientProgressExportRow {
  id: string;
  name: string;
  email?: string;
  program?: string;
  enrollmentDate?: string;
  sessionsCompleted?: number;
  sessionsMissed?: number;
  attendanceRate?: number;
  medicationsDispensed?: number;
  adherenceRate?: number;
  status?: string;
}

export interface PatientReportRow {
  id: string;
  name: string;
  email: string;
  program: string;
  enrollmentDate: string;
  status: string;
}

export interface ProgramReportRow {
  "Program Name": string;
  Type: string;
  "Total Patients": number;
  Status: string;
  "Created Date": string;
}

export interface MedicationReportRow {
  Medication: string;
  Dosage: string;
  Frequency: string;
  "Assigned Programs": string;
  Status: string;
}

export interface AttendanceReportRow {
  Date: string;
  Program: string;
  Scheduled: number;
  Attended: number;
  Missed: number;
  "Attendance Rate": string;
}

export interface UserReportRow {
  Name: string;
  Email: string;
  Role: string;
  "Assigned Programs": string;
  Status: string;
  Created: string;
}

