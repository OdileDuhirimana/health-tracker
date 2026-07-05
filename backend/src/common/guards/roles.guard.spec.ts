import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
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

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required on the route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createExecutionContext({ role: UserRole.GUEST });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the required roles array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createExecutionContext({ role: UserRole.GUEST });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user role matches one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.HEALTHCARE_STAFF]);
    const context = createExecutionContext({ role: UserRole.HEALTHCARE_STAFF });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user role is not in the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createExecutionContext({ role: UserRole.GUEST });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('matches roles case-insensitively', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin' as UserRole]);
    const context = createExecutionContext({ role: 'Admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when roles are required but no user is on the request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the authenticated user has no role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
    const context = createExecutionContext({ email: 'no-role@example.com' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
