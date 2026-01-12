import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../interfaces/jwt-payload.interface';

export const ROLES_KEY = 'roles';

/**
 * Restricts access to users with specified roles
 * @param roles - Array of required roles (OR logic - user needs at least one)
 * @example
 * @Roles(UserRole.ADMIN)
 * @Get('admin-only')
 * adminOnlyRoute() { ... }
 *
 * @Roles(UserRole.ADMIN, UserRole.MODERATOR)
 * @Get('admin-or-mod')
 * adminOrModRoute() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
