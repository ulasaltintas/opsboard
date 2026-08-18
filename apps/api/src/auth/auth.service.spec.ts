import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { compare, hash } from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('hashes the password and creates a user', async () => {
      (hash as jest.Mock).mockResolvedValue('hashed-password');

      const createdUser = {
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Ulas',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.create.mockResolvedValue(createdUser);

      await expect(
        service.register({
          email: 'ulas@example.com',
          password: 'StrongPassword123!',
          name: 'Ulas',
        }),
      ).resolves.toEqual(createdUser);

      expect(hash).toHaveBeenCalledWith('StrongPassword123!', 12);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'ulas@example.com',
          name: 'Ulas',
          passwordHash: 'hashed-password',
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('throws ConflictException when the email already exists', async () => {
      (hash as jest.Mock).mockResolvedValue('hashed-password');

      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.9.1',
        },
      );

      prismaMock.user.create.mockRejectedValue(error);

      await expect(
        service.register({
          email: 'ulas@example.com',
          password: 'StrongPassword123!',
          name: 'Ulas',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a JWT and user when credentials are valid', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Ulas',
        passwordHash: 'stored-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (compare as jest.Mock).mockResolvedValue(true);
      jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

      await expect(
        service.login({
          email: 'ulas@example.com',
          password: 'StrongPassword123!',
        }),
      ).resolves.toEqual({
        accessToken: 'jwt-token',
        user: {
          id: 'user-1',
          email: 'ulas@example.com',
          name: 'Ulas',
        },
      });

      expect(compare).toHaveBeenCalledWith('StrongPassword123!', 'stored-hash');

      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'ulas@example.com',
      });
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'StrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Ulas',
        passwordHash: 'stored-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      (compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'ulas@example.com',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the current user without passwordHash', async () => {
      const user = {
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Ulas',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      await expect(service.getCurrentUser('user-1')).resolves.toEqual(user);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('throws UnauthorizedException when the user no longer exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('missing-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
