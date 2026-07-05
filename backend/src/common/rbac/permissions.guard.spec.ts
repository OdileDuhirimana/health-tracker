import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard, PERMISSIONS_KEY } from './permissions.guard';
import { Permission } from './rbac.config';
import { UserRole } from '../../entities/user.entity';

function createExecutionContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('allows access when the route declares no required permissions', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const context = createExecutionContext({ role: UserRole.GUEST });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the required permissions array is empty', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([]);
    const context = createExecutionContext({ role: UserRole.GUEST });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user role holds at least one required permission', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([Permission.DISPENSE_MEDICATION]);
    const context = createExecutionContext({ role: UserRole.HEALTHCARE_STAFF });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException with the missing permission named when access is denied', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([Permission.DELETE_USER]);
    const context = createExecutionContext({ role: UserRole.HEALTHCARE_STAFF });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    try {
      guard.canActivate(context);
      fail('expected canActivate to throw');
    } catch (error) {
      expect((error as ForbiddenException).message).toContain(Permission.DELETE_USER);
    }
  });

  it('throws ForbiddenException when there is no authenticated user on the request', () => {
    jest.spyOn(reflector, 'get').mockReturnValue([Permission.READ_PROGRAM]);
    const context = createExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('reads required permissions using the PERMISSIONS_KEY metadata key', () => {
    const getSpy = jest.spyOn(reflector, 'get').mockReturnValue([Permission.READ_PROGRAM]);
    const context = createExecutionContext({ role: UserRole.GUEST });

    guard.canActivate(context);

    expect(getSpy).toHaveBeenCalledWith(PERMISSIONS_KEY, expect.anything());
  });
});
