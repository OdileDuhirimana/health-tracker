/**
 * Dynamic RBAC Configuration
 * 
 * This file defines role-based access control rules in a centralized, maintainable way.
 * New roles can be added by extending this configuration without modifying core guard logic.
 */

import { UserRole } from '../../entities/user.entity';

/**
 * Permission types for different resources
 */
export enum Permission {
  // User Management
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  
  // Program Management
  CREATE_PROGRAM = 'create_program',
  READ_PROGRAM = 'read_program',
  UPDATE_PROGRAM = 'update_program',
  DELETE_PROGRAM = 'delete_program',
  
  // Patient Management
  CREATE_PATIENT = 'create_patient',
  READ_PATIENT = 'read_patient',
  UPDATE_PATIENT = 'update_patient',
  DELETE_PATIENT = 'delete_patient',
  ENROLL_PATIENT = 'enroll_patient',
  
  // Medication Management
  CREATE_MEDICATION = 'create_medication',
  READ_MEDICATION = 'read_medication',
  UPDATE_MEDICATION = 'update_medication',
  DELETE_MEDICATION = 'delete_medication',
  DISPENSE_MEDICATION = 'dispense_medication',
  
  // Attendance Management
  CREATE_ATTENDANCE = 'create_attendance',
  READ_ATTENDANCE = 'read_attendance',
  UPDATE_ATTENDANCE = 'update_attendance',
  
  // Reports
  READ_REPORTS = 'read_reports',
  EXPORT_REPORTS = 'export_reports',
  
  // Activity Logs
  READ_ACTIVITY_LOGS = 'read_activity_logs',
  
  // Dashboard
  READ_DASHBOARD = 'read_dashboard',
  
  // Notifications
  READ_NOTIFICATIONS = 'read_notifications',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
}

/**
 * Role permissions mapping
 * This is where you define what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admin has all permissions
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.CREATE_PROGRAM,
    Permission.READ_PROGRAM,
    Permission.UPDATE_PROGRAM,
    Permission.DELETE_PROGRAM,
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.DELETE_PATIENT,
    Permission.ENROLL_PATIENT,
    Permission.CREATE_MEDICATION,
    Permission.READ_MEDICATION,
    Permission.UPDATE_MEDICATION,
    Permission.DELETE_MEDICATION,
    Permission.DISPENSE_MEDICATION,
    Permission.CREATE_ATTENDANCE,
    Permission.READ_ATTENDANCE,
    Permission.UPDATE_ATTENDANCE,
    Permission.READ_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.READ_ACTIVITY_LOGS,
    Permission.READ_DASHBOARD,
    Permission.READ_NOTIFICATIONS,
    Permission.MANAGE_NOTIFICATIONS,
  ],
  
  [UserRole.HEALTHCARE_STAFF]: [
    // Healthcare Staff can manage patients, attendance, and medications (assigned only)
    Permission.READ_PROGRAM,
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT, // Filtered to assigned patients
    Permission.UPDATE_PATIENT, // Filtered to assigned patients
    Permission.ENROLL_PATIENT,
    Permission.READ_MEDICATION,
    Permission.DISPENSE_MEDICATION,
    Permission.CREATE_ATTENDANCE,
    Permission.READ_ATTENDANCE,
    Permission.UPDATE_ATTENDANCE,
    Permission.READ_NOTIFICATIONS,
  ],
  
  [UserRole.GUEST]: [
    // Guest users have read-only access to public programs
    Permission.READ_PROGRAM, // Only active/public programs
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Resource-level permissions (for fine-grained control)
 */
export interface ResourcePermission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  allowedRoles: UserRole[];
}

/**
 * Future: Dynamic role creation
 * This can be extended to allow runtime role creation from database
 */
export interface DynamicRole {
  name: string;
  permissions: Permission[];
  inheritsFrom?: UserRole;
}

/**
 * Helper to extend role permissions dynamically
 * Useful for future dynamic RBAC features
 */
export function extendRolePermissions(
  role: UserRole,
  additionalPermissions: Permission[]
): Permission[] {
  const basePermissions = ROLE_PERMISSIONS[role] || [];
  return [...new Set([...basePermissions, ...additionalPermissions])];
}

