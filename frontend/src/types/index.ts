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
  status: "active" | "completed" | "cancelled";
  program?: Program;
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
}

export interface Dispensation {
  id: string;
  patientId: string;
  programId: string;
  medicationId: string;
  dispensedAt: string;
  notes?: string;
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

