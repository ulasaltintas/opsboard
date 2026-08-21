import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/enums';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

interface TestRequest {
  user?: {
    sub: string;
    email: string;
    role: Role;
  };
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new RolesGuard(reflectorMock as unknown as Reflector);
  });

  function createExecutionContext(
    user?: TestRequest['user'],
  ): ExecutionContext {
    const request: TestRequest = {
      user,
    };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: <T>() => request as T,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when no roles are required', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);

    const context = createExecutionContext();

    expect(guard.canActivate(context)).toBe(true);

    expect(reflectorMock.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('allows access when the user has the required role', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    const context = createExecutionContext({
      sub: 'user-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException when user information is missing', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    const context = createExecutionContext();

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the user does not have the required role', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    const context = createExecutionContext({
      sub: 'user-1',
      email: 'member@example.com',
      role: Role.MEMBER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows access when the user has one of multiple allowed roles', () => {
    reflectorMock.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MEMBER]);

    const context = createExecutionContext({
      sub: 'user-1',
      email: 'member@example.com',
      role: Role.MEMBER,
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
