import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const prismaMock = {
    membership: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateMemberRole', () => {
    const organizationId = 'organization-1';
    const ownerUserId = 'owner-1';
    const targetUserId = 'member-1';

    it('should allow an owner to promote a member to admin', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'member-membership',
          userId: targetUserId,
          organizationId,
          role: OrganizationRole.MEMBER,
        });

      const updatedMembership = {
        id: 'member-membership',
        role: OrganizationRole.ADMIN,
        createdAt: new Date(),
        user: {
          id: targetUserId,
          email: 'member@example.com',
          name: 'Member',
        },
      };

      prismaMock.membership.update.mockResolvedValue(updatedMembership);

      const result = await service.updateMemberRole(
        ownerUserId,
        organizationId,
        targetUserId,
        {
          role: OrganizationRole.ADMIN,
        },
      );

      expect(result).toEqual(updatedMembership);

      expect(prismaMock.membership.update).toHaveBeenCalledWith({
        where: {
          id: 'member-membership',
        },
        data: {
          role: OrganizationRole.ADMIN,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    it('should reject a non-owner trying to change a member role', async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce({
        id: 'admin-membership',
        userId: 'admin-1',
        organizationId,
        role: OrganizationRole.ADMIN,
      });

      await expect(
        service.updateMemberRole('admin-1', organizationId, targetUserId, {
          role: OrganizationRole.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.membership.update).not.toHaveBeenCalled();
    });

    it('should reject assigning the owner role', async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce({
        id: 'owner-membership',
        userId: ownerUserId,
        organizationId,
        role: OrganizationRole.OWNER,
      });

      await expect(
        service.updateMemberRole(ownerUserId, organizationId, targetUserId, {
          role: OrganizationRole.OWNER,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.membership.update).not.toHaveBeenCalled();
    });

    it('should return not found when requester is not a member', async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole('outsider-1', organizationId, targetUserId, {
          role: OrganizationRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.membership.update).not.toHaveBeenCalled();
    });

    it('should return not found when target user is not a member', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole(ownerUserId, organizationId, 'non-member-1', {
          role: OrganizationRole.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.membership.update).not.toHaveBeenCalled();
    });
  });
});
