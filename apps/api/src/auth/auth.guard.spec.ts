import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

interface TestRequest {
  headers: {
    authorization?: string;
  };
  user?: {
    sub: string;
    email: string;
  };
}

describe('AuthGuard', () => {
  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  let guard: AuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new AuthGuard(jwtServiceMock as unknown as JwtService);
  });

  function createExecutionContext(authorization?: string): ExecutionContext {
    const request: TestRequest = {
      headers: {
        authorization,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: <T>() => request as T,
      }),
    } as ExecutionContext;
  }

  it('allows a request with a valid bearer token', async () => {
    const context = createExecutionContext('Bearer valid-token');

    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'ulas@example.com',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest<TestRequest>();

    expect(request.user).toEqual({
      sub: 'user-1',
      email: 'ulas@example.com',
    });
  });

  it('throws UnauthorizedException when no token is provided', async () => {
    const context = createExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for an invalid token', async () => {
    const context = createExecutionContext('Bearer invalid-token');

    jwtServiceMock.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for a malformed authorization header', async () => {
    const context = createExecutionContext('Basic abc123');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
