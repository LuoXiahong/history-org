import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../guards/roles.guard';
import { UserRole } from '../../interfaces/jwt-payload.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockContext = (
    user?: { id: string; email: string; roles: UserRole[] },
  ): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('canActivate', () => {
    it('should allow access when user has required role', () => {
      const context = createMockContext({
        id: 'user-123',
        email: 'admin@example.com',
        roles: [UserRole.ADMIN],
      });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([UserRole.ADMIN]); // requiredRoles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user lacks required role', () => {
      const context = createMockContext({
        id: 'user-123',
        email: 'user@example.com',
        roles: [UserRole.USER],
      });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([UserRole.ADMIN]); // requiredRoles

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access when no roles are required', () => {
      const context = createMockContext({
        id: 'user-123',
        email: 'user@example.com',
        roles: [UserRole.USER],
      });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(undefined); // requiredRoles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when route is public', () => {
      const context = createMockContext();
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(true); // isPublic

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has any of multiple required roles', () => {
      const context = createMockContext({
        id: 'user-123',
        email: 'mod@example.com',
        roles: [UserRole.MODERATOR],
      });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([UserRole.ADMIN, UserRole.MODERATOR]); // requiredRoles

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when no user in request', () => {
      const context = createMockContext(undefined);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce([UserRole.USER]); // requiredRoles

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
