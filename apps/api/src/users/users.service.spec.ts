import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns all users ordered by newest first', async () => {
      const users = [
        {
          id: 'user-1',
          email: 'ulas@example.com',
          name: 'Ulas',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.user.findMany.mockResolvedValue(users);

      await expect(service.findAll()).resolves.toEqual(users);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('returns a user when found', async () => {
      const user = {
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Ulas',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      await expect(service.findOne('user-1')).resolves.toEqual(user);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
        },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns a user', async () => {
      const createdUser = {
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Ulas',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.create.mockResolvedValue(createdUser);

      await expect(
        service.create({
          email: 'ulas@example.com',
          name: 'Ulas',
        }),
      ).resolves.toEqual(createdUser);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'ulas@example.com',
          name: 'Ulas',
        },
      });
    });

    it('throws ConflictException when the email already exists', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.9.1',
        },
      );

      prismaMock.user.create.mockRejectedValue(error);

      await expect(
        service.create({
          email: 'ulas@example.com',
          name: 'Ulas',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates and returns a user', async () => {
      const updatedUser = {
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Updated Name',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.update.mockResolvedValue(updatedUser);

      await expect(
        service.update('user-1', {
          name: 'Updated Name',
        }),
      ).resolves.toEqual(updatedUser);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
        },
        data: {
          name: 'Updated Name',
        },
      });
    });

    it('throws NotFoundException when updating a missing user', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '7.9.1',
        },
      );

      prismaMock.user.update.mockRejectedValue(error);

      await expect(
        service.update('missing-user', {
          name: 'Nobody',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when updating to an existing email', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.9.1',
        },
      );

      prismaMock.user.update.mockRejectedValue(error);

      await expect(
        service.update('user-1', {
          email: 'existing@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes and returns a user', async () => {
      const deletedUser = {
        id: 'user-1',
        email: 'ulas@example.com',
        name: 'Ulas',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.delete.mockResolvedValue(deletedUser);

      await expect(service.remove('user-1')).resolves.toEqual(deletedUser);

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
        },
      });
    });

    it('throws NotFoundException when deleting a missing user', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '7.9.1',
        },
      );

      prismaMock.user.delete.mockRejectedValue(error);

      await expect(service.remove('missing-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
