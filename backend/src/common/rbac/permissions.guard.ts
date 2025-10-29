/**
 * Permissions Guard
 * 
 * A more flexible guard that checks specific permissions instead of just roles.
 * This enables dynamic RBAC where roles can be extended without code changes.
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../entities/user.entity';
import { Permission, hasPermission } from './rbac.config';

export const PERMISSIONS_KEY = 'permissions';

import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required permissions for an endpoint
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<Permission[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User authentication required');
    }

    // Check if user has any of the required permissions
    const userRole = user.role as UserRole;
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      hasPermission(userRole, permission),
    );

    if (!hasRequiredPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

