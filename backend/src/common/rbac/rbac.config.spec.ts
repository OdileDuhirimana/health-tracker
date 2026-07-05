import { UserRole } from '../../entities/user.entity';
import {
  Permission,
  ROLE_PERMISSIONS,
  getRolePermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from './rbac.config';

describe('rbac.config', () => {
  describe('hasPermission', () => {
    it('returns true when the role is granted the permission', () => {
      expect(hasPermission(UserRole.ADMIN, Permission.DELETE_USER)).toBe(true);
    });

    it('returns false when the role is not granted the permission', () => {
      expect(hasPermission(UserRole.GUEST, Permission.DELETE_USER)).toBe(false);
    });

    it('returns false for a role with no entry in the permission map', () => {
      // Casts an unknown role to prove the lookup fails closed rather than
      // throwing or defaulting to "allowed" — the security-critical case.
      expect(hasPermission('Nonexistent Role' as UserRole, Permission.READ_PROGRAM)).toBe(false);
    });

    it('scopes Healthcare Staff to their documented subset of permissions', () => {
      expect(hasPermission(UserRole.HEALTHCARE_STAFF, Permission.DISPENSE_MEDICATION)).toBe(true);
      expect(hasPermission(UserRole.HEALTHCARE_STAFF, Permission.CREATE_USER)).toBe(false);
      expect(hasPermission(UserRole.HEALTHCARE_STAFF, Permission.DELETE_PATIENT)).toBe(false);
    });

    it('restricts Guest to read-only program access', () => {
      expect(hasPermission(UserRole.GUEST, Permission.READ_PROGRAM)).toBe(true);
      expect(hasPermission(UserRole.GUEST, Permission.READ_PATIENT)).toBe(false);
      expect(hasPermission(UserRole.GUEST, Permission.CREATE_ATTENDANCE)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if the role holds at least one of the listed permissions', () => {
      expect(
        hasAnyPermission(UserRole.HEALTHCARE_STAFF, [Permission.DELETE_USER, Permission.DISPENSE_MEDICATION]),
      ).toBe(true);
    });

    it('returns false if the role holds none of the listed permissions', () => {
      expect(
        hasAnyPermission(UserRole.GUEST, [Permission.DELETE_USER, Permission.DISPENSE_MEDICATION]),
      ).toBe(false);
    });

    it('returns false for an empty permission list', () => {
      expect(hasAnyPermission(UserRole.ADMIN, [])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true only when every listed permission is granted', () => {
      expect(
        hasAllPermissions(UserRole.ADMIN, [Permission.CREATE_USER, Permission.DELETE_USER]),
      ).toBe(true);
    });

    it('returns false when at least one listed permission is missing', () => {
      expect(
        hasAllPermissions(UserRole.HEALTHCARE_STAFF, [Permission.DISPENSE_MEDICATION, Permission.CREATE_USER]),
      ).toBe(false);
    });

    it('returns true (vacuous truth) for an empty permission list', () => {
      expect(hasAllPermissions(UserRole.GUEST, [])).toBe(true);
    });
  });

  describe('getRolePermissions', () => {
    it('returns the exact permission set configured for a role', () => {
      expect(getRolePermissions(UserRole.GUEST)).toEqual(ROLE_PERMISSIONS[UserRole.GUEST]);
    });

    it('returns an empty array for an unrecognized role rather than throwing', () => {
      expect(getRolePermissions('Nonexistent Role' as UserRole)).toEqual([]);
    });
  });
});
