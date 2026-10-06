import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
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

  describe('removeMember', () => {
    const organizationId = 'organization-1';
    const ownerUserId = 'owner-1';
    const adminUserId = 'admin-1';
    const memberUserId = 'member-1';

    it('should allow an owner to remove a member', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'member-membership',
          userId: memberUserId,
          organizationId,
          role: OrganizationRole.MEMBER,
        });

      prismaMock.membership.delete.mockResolvedValue({
        id: 'member-membership',
      });

      const result = await service.removeMember(
        ownerUserId,
        organizationId,
        memberUserId,
      );

      expect(result).toEqual({
        message: 'Member removed successfully',
      });

      expect(prismaMock.membership.delete).toHaveBeenCalledWith({
        where: {
          id: 'member-membership',
        },
      });
    });

    it('should allow an admin to remove a member', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'admin-membership',
          userId: adminUserId,
          organizationId,
          role: OrganizationRole.ADMIN,
        })
        .mockResolvedValueOnce({
          id: 'member-membership',
          userId: memberUserId,
          organizationId,
          role: OrganizationRole.MEMBER,
        });

      prismaMock.membership.delete.mockResolvedValue({
        id: 'member-membership',
      });

      await expect(
        service.removeMember(adminUserId, organizationId, memberUserId),
      ).resolves.toEqual({
        message: 'Member removed successfully',
      });
    });

    it('should reject a member trying to remove someone', async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce({
        id: 'member-membership',
        userId: memberUserId,
        organizationId,
        role: OrganizationRole.MEMBER,
      });

      await expect(
        service.removeMember(memberUserId, organizationId, adminUserId),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.membership.delete).not.toHaveBeenCalled();
    });

    it('should reject removing the organization owner', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        });

      await expect(
        service.removeMember(ownerUserId, organizationId, ownerUserId),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.membership.delete).not.toHaveBeenCalled();
    });

    it('should reject an admin trying to remove another admin', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'admin-membership',
          userId: adminUserId,
          organizationId,
          role: OrganizationRole.ADMIN,
        })
        .mockResolvedValueOnce({
          id: 'other-admin-membership',
          userId: 'admin-2',
          organizationId,
          role: OrganizationRole.ADMIN,
        });

      await expect(
        service.removeMember(adminUserId, organizationId, 'admin-2'),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.membership.delete).not.toHaveBeenCalled();
    });

    it('should return not found when requester is not in the organization', async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.removeMember('outsider-1', organizationId, memberUserId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.membership.delete).not.toHaveBeenCalled();
    });

    it('should return not found when target is not a member', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.removeMember(ownerUserId, organizationId, 'not-a-member'),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.membership.delete).not.toHaveBeenCalled();
    });
  });
  describe('transferOwnership', () => {
    const organizationId = 'organization-1';
    const ownerUserId = 'owner-1';
    const targetUserId = 'member-1';

    it('should transfer ownership to another member', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'target-membership',
          userId: targetUserId,
          organizationId,
          role: OrganizationRole.MEMBER,
        });

      const newOwnerMembership = {
        id: 'target-membership',
        role: OrganizationRole.OWNER,
        createdAt: new Date(),
        user: {
          id: targetUserId,
          email: 'member@example.com',
          name: 'Member',
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (
          callback: (tx: {
            membership: {
              update: jest.Mock;
            };
          }) => Promise<unknown>,
        ) => {
          const tx = {
            membership: {
              update: jest
                .fn()
                .mockResolvedValueOnce({
                  id: 'owner-membership',
                  role: OrganizationRole.ADMIN,
                })
                .mockResolvedValueOnce(newOwnerMembership),
            },
          };

          return callback(tx);
        },
      );

      const result = await service.transferOwnership(
        ownerUserId,
        organizationId,
        {
          userId: targetUserId,
        },
      );

      expect(result).toEqual(newOwnerMembership);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should reject a non-owner trying to transfer ownership', async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce({
        id: 'admin-membership',
        userId: 'admin-1',
        organizationId,
        role: OrganizationRole.ADMIN,
      });

      await expect(
        service.transferOwnership('admin-1', organizationId, {
          userId: targetUserId,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject transferring ownership to yourself', async () => {
      await expect(
        service.transferOwnership(ownerUserId, organizationId, {
          userId: ownerUserId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.membership.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should return not found when requester is not in the organization', async () => {
      prismaMock.membership.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.transferOwnership('outsider-1', organizationId, {
          userId: targetUserId,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should return not found when new owner is not a member', async () => {
      prismaMock.membership.findUnique
        .mockResolvedValueOnce({
          id: 'owner-membership',
          userId: ownerUserId,
          organizationId,
          role: OrganizationRole.OWNER,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.transferOwnership(ownerUserId, organizationId, {
          userId: 'non-member-1',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});
